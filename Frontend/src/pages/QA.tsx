import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, History, Lock, ListTodo, Plus, Search, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { CONVOS, DIFF_SETS, DOCS, INDUSTRIES, REGS, SUGGESTS, type Convo, type Msg, type Source, type Task } from "../data";
import { Badge, Card, GhostBtn, Marquee, PageHeader, PrimaryBtn, Segmented, cn } from "../ui";
import { useStore } from "../store";
import type { IRule } from "../rulesData";

interface EvidenceDocument {
  id: string;
  title: string;
  version: string;
  range: string;
  excerpt: string;
  topic: string;
  regId?: string;
  ruleId?: string;
}

function collectEvidence(selectedIds: string[], rules: IRule[]): EvidenceDocument[] {
  return selectedIds.flatMap((id) => {
    const document = DOCS.find((item) => item.id === id);
    if (!document) return [];
    const regulation = REGS.find((item) => item.id === document.regId);
    if (regulation) {
      const diff = DIFF_SETS[regulation.id];
      const excerpt = [
        ...diff.articles.map((article) => `第 ${article.no} 條（${article.title}）：${article.newSeg.flat().map((segment) => segment.t).join("")}`),
        ...diff.insights.map((insight) => `${insight.ref} 重點：${insight.t}。${insight.d}`),
      ].join("\n");
      return [{
        id,
        title: document.name,
        version: diff.newVersion,
        range: document.range,
        excerpt,
        topic: regulation.topic,
        regId: regulation.id,
      }];
    }
    const rule = rules.find((item) => item.id === document.ruleId);
    if (!rule) {
      return [{ id, title: document.name, version: document.ver, range: document.range, excerpt: "", topic: "未分類" }];
    }
    return [{
      id,
      title: rule.name,
      version: rule.version,
      range: document.range,
      excerpt: rule.clauses.map((clause) => `${clause.no}${clause.ref ? `（對照${clause.ref}）` : ""}：${clause.text}`).join("\n"),
      topic: REGS.find((regulation) => rule.linked.includes(regulation.id))?.topic ?? "內規",
      regId: rule.linked[0],
      ruleId: rule.id,
    }];
  });
}

function localRetrieveReply(q: string, evidence: EvidenceDocument[], notice: string): Msg {
  const t = new Date();
  const time = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
  if (!evidence.length) return {
    role: "ai",
    time,
    mode: "無法檢索",
    text: "目前尚未選取任何文件範圍，請先在左側勾選至少一份法規或內規，再提出問題。",
    warn: notice,
  };
  const terms = q.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g) ?? [];
  const ranked = evidence
    .map((item) => ({
      item,
      score: terms.reduce((score, term) => score + (item.excerpt.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .sort((first, second) => second.score - first.score)
    .filter((item) => item.score > 0);
  const selected = ranked.slice(0, 3);
  const sourceDocs = selected.map(({ item }) => item).slice(0, 3);
  const sources: Source[] = sourceDocs.map((item, index) => ({
    n: index + 1,
    title: item.title,
    where: `${item.range} · ${item.version}`,
    quote: item.excerpt ? item.excerpt.slice(0, 260) : "此範例文件尚未提供可檢索的條文摘錄。",
    regId: item.regId,
    ruleId: item.ruleId,
  }));
  return {
    role: "ai",
    time,
    mode: "本機檢索示範（非生成式 AI）",
    text: selected.length
      ? `尚未連接 Gemini，以下為本機文件檢索示範。依問題比對選取文件，找到 ${selected.length} 份可能相關來源；此模式不會自行生成法律結論。`
      : "在目前選取文件中找不到與問題文字直接相符的摘錄，因此不推測法規結論。可嘗試使用條文關鍵字，或增加相關文件範圍。",
    points: selected.map(({ item }) => ({
      h: `${item.topic} · ${item.title}`,
      d: item.excerpt.slice(0, 300) || "此範例文件尚未提供可檢索的條文摘錄。",
    })),
    sources,
    warn: `${notice} 本機檢索只比對 data.ts／內規示範內容，不是生成式 AI，也不是正式法規查詢結果。`,
  };
}

export default function QA() {
  const { qaSeed, toast, go, setRegId, rules, setTasks, industryIds, setRuleFocusId } = useStore();
  const [convos, setConvos] = useState<Convo[]>(CONVOS);
  const [cid, setCid] = useState(CONVOS[0].id);
  const [docs, setDocs] = useState<string[]>(["d1", "d2"]);
  const [industryScope, setIndustryScope] = useState<"company" | "all">("company");
  const [kind, setKind] = useState<"全部" | "法規" | "內規">("全部");
  const [docSearch, setDocSearch] = useState("");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [liked, setLiked] = useState<Record<number, "up" | "down">>({});
  const [createdTaskMessages, setCreatedTaskMessages] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  const convo = convos.find((c) => c.id === cid)!;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [convo.msgs.length, typing, cid]);

  const ask = (q: string, id = cid) => {
    if (!q.trim() || typing) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, count: c.count + 1, msgs: [...c.msgs, { role: "user", time, text: q }] } : c)));
    setInput("");
    setTyping(true);
    const evidence = collectEvidence(docs, rules);
    const answer = localRetrieveReply(q, evidence, "本機檢索會比對目前選取的 data.ts 法規與 rulesData.ts 內規，不會傳送資料至後端或外部服務。");
    window.setTimeout(() => {
      setTyping(false);
      setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, msgs: [...c.msgs, answer] } : c)));
    }, 280);
  };

  useEffect(() => {
    if (qaSeed && !seeded.current) {
      seeded.current = true;
      const id = "c" + Date.now();
      setConvos((cs) => [{ id, title: qaSeed.slice(0, 16), when: "剛剛", count: 0, msgs: [] }, ...cs]);
      setCid(id);
      setTimeout(() => ask(qaSeed, id), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const newChat = () => { const id = "c" + Date.now(); setConvos([{ id, title: "新對話", when: "剛剛", count: 0, msgs: [] }, ...convos]); setCid(id); };
  const scopedDocs = useMemo(() => DOCS.filter((document) => {
    if (industryScope === "all" || !industryIds.length) return true;
    const regulation = REGS.find((item) => item.id === document.regId);
    if (regulation) return regulation.industries.some((industry) => INDUSTRIES.some((option) => industryIds.includes(option.id) && option.name === industry));
    const rule = rules.find((item) => item.id === document.ruleId);
    return Boolean(rule?.linked.some((id) => REGS.find((item) => item.id === id)?.industries.some((industry) => INDUSTRIES.some((option) => industryIds.includes(option.id) && option.name === industry))));
  }), [industryScope, industryIds, rules]);
  const shownDocs = useMemo(() => scopedDocs.filter((document) =>
    (kind === "全部" || document.kind === kind)
    && (!docSearch.trim() || `${document.name} ${document.id}`.toLowerCase().includes(docSearch.trim().toLowerCase())),
  ), [scopedDocs, kind, docSearch]);
  const scopedDocIds = useMemo(() => scopedDocs.map((document) => document.id), [scopedDocs]);
  useEffect(() => {
    setDocs((current) => current.filter((id) => scopedDocIds.includes(id)));
  }, [scopedDocIds]);
  const shownConvos = useMemo(() => convos.filter((c) => c.title.includes(search)), [convos, search]);
  const toggle = (id: string) => setDocs(docs.includes(id) ? docs.filter((x) => x !== id) : [...docs, id]);
  const createTaskFromAnswer = (messageIndex: number, answer: Msg) => {
    const taskKey = `${cid}:${messageIndex}`;
    if (createdTaskMessages.includes(taskKey)) return;
    const question = convo.msgs[messageIndex - 1]?.text ?? "依據法規問答進行人工確認";
    const source = answer.sources?.[0];
    const sourceRule = source?.ruleId ? rules.find((item) => item.id === source.ruleId) : undefined;
    const regulation = source?.regId
      ? REGS.find((item) => item.id === source.regId)
      : sourceRule ? REGS.find((item) => sourceRule.linked.includes(item.id)) : undefined;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const priority: Task["pri"] = regulation?.risk === "高風險"
      ? "高優先"
      : regulation?.risk === "低風險" ? "低優先" : "中優先";
    const task: Task = {
      id: `T-${Date.now()}`,
      title: `確認法規分析：${question.trim().slice(0, 28)}`,
      desc: `${answer.text.slice(0, 1200)}${source ? `\n\n參考來源：${source.title} ${source.where}` : ""}`,
      pri: priority,
      topic: regulation?.topic ?? "法遵追蹤",
      ...(regulation ? { regId: regulation.id } : {}),
      ref: source?.where ?? "問答分析",
      owner: sourceRule?.owner ?? "林怡君",
      dept: sourceRule?.dept ?? "法遵部",
      due: `${String(dueDate.getMonth() + 1).padStart(2, "0")}/${String(dueDate.getDate()).padStart(2, "0")}`,
      col: "todo",
    };
    setTasks((current) => [task, ...current]);
    setCreatedTaskMessages((current) => [...current, taskKey]);
    toast("已建立法遵確認任務，可至待辦看板追蹤");
  };

  return (
    <>
      <PageHeader title="法規問答" sub="依選取文件進行本機檢索與關聯分析，呈現來源摘錄、風險提示與可追蹤的後續任務。" action={<PrimaryBtn onClick={newChat}><Plus size={16} />新增對話</PrimaryBtn>} />
      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 lg:sticky lg:top-2">
          <Card className="p-5">
            <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">限定法規範圍</h3><p className="mt-0.5 text-xs text-sub">僅依選取的文件作答</p></div><Lock size={15} className="text-brand" /></div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="font-semibold text-navy-900">本機文件檢索 · 不連接後端</span>
            </div>
            <div className="mt-3">
              <Segmented value={industryScope} onChange={setIndustryScope} options={[
                { v: "company", label: "本公司產業" },
                { v: "all", label: "全部產業" },
              ]} />
              <p className="mt-1.5 text-[10px] text-faint">{industryScope === "company" ? `優先顯示 ${INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、") || "未設定產業"} 相關法規與內規` : "可檢索其他產業法規及內規"}</p>
            </div>
            <div className="mt-3"><Segmented value={kind} onChange={setKind} options={(["全部", "法規", "內規"] as const).map((v) => ({ v, label: v }))} /></div>
            <label className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs"><Search size={13} className="text-faint" /><input value={docSearch} onChange={(event) => setDocSearch(event.target.value)} placeholder={industryScope === "all" ? "搜尋所有產業法規或內規" : "搜尋公司產業法規或內規"} className="w-full bg-transparent outline-none" /></label>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-auto">
              {shownDocs.map((d) => {
                const on = docs.includes(d.id);
                return (
                  <button key={d.id} onClick={() => toggle(d.id)} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition", on ? "border-brand/40 bg-brand-soft" : "border-line hover:border-brand/30")}>
                    <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 text-white transition", on ? "border-brand bg-brand" : "border-slate-300")}>{on && <span className="text-[10px] leading-none">✓</span>}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-snug">{d.name}</span><span className="mt-1 flex items-center gap-1.5 text-[11px] text-sub"><Badge tone={d.kind === "法規" ? "brand" : "violet"}>{d.kind}</Badge>{d.ver} · {d.range}</span></span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-sub"><span>已選 <b className="text-brand">{docs.length}</b> / {shownDocs.length} 份</span><div className="flex gap-3 font-semibold text-brand"><button onClick={() => setDocs(shownDocs.map((d) => d.id))}>全選</button><button onClick={() => setDocs([])}>清除</button></div></div>
            <div className="mt-2 text-[10px] leading-relaxed text-faint">本機檢索僅比對 data.ts 法規差異與 rulesData.ts 內規條文；資料為平台示範內容，不是外部最新法規查詢或生成式 AI。</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold text-navy-900">近期對話</h3><History size={15} className="text-brand" /></div>
            <label className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs"><Search size={13} className="text-faint" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋對話" className="w-full bg-transparent outline-none" /></label>
            <div className="mt-2 space-y-1">
              {shownConvos.map((c) => (
                <button key={c.id} onClick={() => setCid(c.id)} className={cn("block w-full rounded-xl px-3 py-2.5 text-left transition", c.id === cid ? "bg-brand-soft" : "hover:bg-slate-50")}>
                  <div className={cn("text-[13px] font-semibold", c.id === cid && "text-brand")}>{c.title}</div>
                  <div className="text-[11px] text-faint">{c.when} · {c.count} 則對話</div>
                </button>
              ))}
              {!shownConvos.length && <div className="py-4 text-center text-xs text-faint">沒有對話</div>}
            </div>
          </Card>

          <div className="flex gap-3 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-600 p-4 text-white">
            <ShieldCheck size={20} className="shrink-0" />
            <div><div className="text-sm font-bold">可信賴的法規助手</div><p className="mt-1 text-xs leading-relaxed text-white/70">若來源文件不足，系統會說明限制，請勿將 AI 回覆視為最終法律意見。</p></div>
          </div>
        </div>

        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div><h2 className="text-lg font-extrabold text-navy-900">{convo.title}</h2><p className="mt-0.5 text-xs text-sub">已限定 {docs.length} 份文件 · 回答依據所選版本摘錄</p></div>
            <Badge tone="brand"><i className="h-1.5 w-1.5 rounded-full bg-brand" />本機檢索模式</Badge>
          </div>
          <div className="flex-1 space-y-5 overflow-auto px-6 py-5" style={{ maxHeight: 560 }}>
            {!convo.msgs.length && (
              <div className="grid h-full min-h-[320px] place-items-center text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Sparkles size={24} /></div><div className="mt-3 font-bold text-navy-900">想了解什麼法規？</div><p className="mt-1 text-sm text-sub">輸入問題，或點選下方建議開始。</p></div></div>
            )}
            {convo.msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] animate-rise rounded-2xl rounded-tr-md bg-brand-soft px-4 py-3"><div className="mb-1 text-[11px] text-sub"><b className="text-ink">林怡君</b> · {m.time}</div><div className="text-sm">{m.text}</div></div>
              ) : (
                <div key={i} className="animate-rise">
                  <div className="mb-2 flex items-center gap-2 text-xs"><span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-white"><Sparkles size={12} /></span><b>RegInsight 法規助手</b><span className="text-faint">{m.time} · {m.mode ?? "歷史範例"}</span></div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                  {m.points && <div className="mt-3 space-y-3">{m.points.map((p) => <div key={p.h} className="border-l-2 border-brand/40 pl-3"><div className="text-[13px] font-bold text-navy-900">{p.h}</div><p className="mt-0.5 text-[13px] text-sub">{p.d}</p></div>)}</div>}
                  {m.warn && <div className="mt-3 flex gap-2 rounded-xl bg-warn-soft p-3 text-xs text-warn"><TriangleAlert size={14} className="mt-0.5 shrink-0" />{m.warn}</div>}
                  {m.sources && (
                    <div className="mt-4 border-t border-line pt-3"><div className="text-xs font-bold text-navy-900">{m.mode?.startsWith("Google Gemini") ? "提供模型分析的來源摘錄" : "檢索來源 · 可追溯文件"}</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">{m.sources.map((s) => <button key={s.n} onClick={() => {
                        if (s.ruleId) {
                          setRuleFocusId(s.ruleId);
                          go("rules");
                        } else if (s.regId) {
                          setRegId(s.regId);
                          go("diff");
                        } else {
                          toast("此來源尚未連結到可開啟的法規或內規資料");
                        }
                      }} className="rounded-xl border border-line p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"><div className="text-xs font-bold text-brand">[{s.n}] {s.title} ↗</div><div className="mt-0.5 text-[11px] text-sub">{s.where}</div><div className="mt-1.5 text-xs text-ink/80">{s.quote}</div></button>)}</div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-faint">
                    <button onClick={() => setLiked({ ...liked, [i]: "up" })} className={cn("rounded-lg p-2 hover:bg-slate-100", liked[i] === "up" && "text-ok")}><ThumbsUp size={15} /></button>
                    <button onClick={() => setLiked({ ...liked, [i]: "down" })} className={cn("rounded-lg p-2 hover:bg-slate-100", liked[i] === "down" && "text-danger")}><ThumbsDown size={15} /></button>
                    <button onClick={() => {
                      if (!navigator.clipboard) {
                        toast("此瀏覽器不支援複製，請手動選取文字");
                        return;
                      }
                      void navigator.clipboard.writeText(m.text).then(() => toast("已複製答案")).catch(() => toast("無法複製答案，請手動選取文字"));
                    }} className="flex items-center gap-1 rounded-lg p-2 text-xs hover:bg-slate-100"><Copy size={14} />複製答案</button>
                    <GhostBtn className="ml-auto" disabled={createdTaskMessages.includes(`${cid}:${i}`)} onClick={() => createTaskFromAnswer(i, m)}>{createdTaskMessages.includes(`${cid}:${i}`) ? <CheckCircle2 size={14} /> : <ListTodo size={14} />}{createdTaskMessages.includes(`${cid}:${i}`) ? "已建立任務" : "轉為因應任務"}</GhostBtn>
                  </div>
                </div>
              ),
            )}
            {typing && <div className="flex items-center gap-2 text-xs text-sub"><span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-white"><Sparkles size={12} /></span>正在查找來源條文<span className="flex gap-1">{[0, 1, 2].map((k) => <i key={k} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${k * 120}ms` }} />)}</span></div>}
            <div ref={end} />
          </div>
          <div className="border-t border-line p-4">
            <Marquee className="mb-3 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
              {[...SUGGESTS, "裁罰案例有哪些重點？"].map((s) => <button key={s} onClick={() => ask(s)} className="whitespace-nowrap rounded-full bg-slate-100 px-3.5 py-1.5 text-xs text-sub transition hover:bg-brand-soft hover:text-brand">{s}</button>)}
            </Marquee>
            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="rounded-2xl border border-line p-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} rows={2} placeholder="針對已限定法規提問…" className="w-full resize-none bg-transparent text-sm outline-none" />
              <div className="flex items-center justify-between"><span className="text-[11px] text-faint">僅回答限定範圍 · Enter 送出（Shift+Enter 換行）</span><button disabled={typing || !input.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"><Send size={14} />{typing ? "分析中" : "送出"}</button></div>
            </form>
            <p className="mt-2 flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-faint"><Lock size={11} className="mt-0.5 shrink-0" />問題與摘錄僅在瀏覽器內比對 data.ts / rulesData.ts，不會傳送至 Backend 或外部服務；本機檢索不會生成法律結論。</p>
          </div>
        </Card>
      </div>
    </>
  );
}
