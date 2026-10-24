import { useEffect, useState } from "react";
import { BookOpen, Columns2, History, Sparkles, UserCheck, Check, FileText, CheckCheck, CircleCheck } from "lucide-react";
import { DIFF_SETS, REGS, REVIEW_ARTICLES } from "../data";
import { Badge, Card, GhostBtn, PageHeader, PrimaryBtn, Select, cn } from "../ui";
import { useStore } from "../store";

const CHOICES = ["採納 AI 判斷", "採納並調整因應措施", "退回重新分析", "不適用，附具理由"];

export default function Review() {
  const { reg, setRegId, rules, reviewContext, reviewAudit, addReviewAudit, go, toast } = useStore();
  const diff = DIFF_SETS[reg.id];
  const [articleNo, setArticleNo] = useState(reviewContext?.articleNo ?? diff.articles[0].no);
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [dec, setDec] = useState<Record<string, { c: number; note: string; done: boolean }>>(() => {
    try {
      const saved = localStorage.getItem("reginsight:review-decisions");
      return saved ? JSON.parse(saved) as Record<string, { c: number; note: string; done: boolean }> : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("reginsight:review-decisions", JSON.stringify(dec));
    } catch {
      toast("複核草稿無法儲存，請確認瀏覽器儲存空間設定。");
    }
  }, [dec, toast]);
  useEffect(() => {
    const requested = reviewContext?.regId === reg.id && diff.articles.some((a) => a.no === reviewContext.articleNo)
      ? reviewContext.articleNo
      : diff.articles[0].no;
    setArticleNo(requested);
  }, [reg.id, reviewContext?.articleNo, reviewContext?.regId]);
  const article = diff.articles.find((a) => a.no === articleNo) ?? diff.articles[0];
  const linkedRules = rules.filter((rule) => rule.linked.includes(reg.id));
  const selectedRule = linkedRules.find((rule) => rule.id === selectedRuleId)
    ?? linkedRules.find((rule) => rule.clauses.some((clause) => clause.ref?.match(/\d+/g)?.map(Number).includes(article.no)))
    ?? linkedRules[0];
  useEffect(() => {
    const matching = linkedRules.find((rule) => rule.clauses.some((clause) => clause.ref?.match(/\d+/g)?.map(Number).includes(article.no)));
    setSelectedRuleId(matching?.id ?? linkedRules[0]?.id ?? "");
  }, [reg.id, article.no, rules]);
  const insight = reviewContext?.regId === reg.id && reviewContext.articleNo === article.no
    ? reviewContext.insight
    : diff.insights.find((item) => item.ref.match(/\d+/g)?.map(Number).includes(article.no)) ?? diff.insights[0];
  const legacy = reg.id === "REG-2026-014" ? REVIEW_ARTICLES.find((item) => item.no === article.no) : undefined;
  const decisionKey = `${reg.id}:${article.no}`;
  const d = dec[decisionKey] ?? { c: -1, note: "", done: false };
  const upd = (p: Partial<typeof d>) => setDec((current) => ({ ...current, [decisionKey]: { ...d, ...p } }));
  const doneN = diff.articles.filter((item) => dec[`${reg.id}:${item.no}`]?.done).length;
  const idx = diff.articles.findIndex((item) => item.no === article.no);
  const clause = selectedRule?.clauses.find((item) => item.ref?.match(/\d+/g)?.map(Number).includes(article.no))
    ?? selectedRule?.clauses[0];

  const submit = () => {
    if (d.done || d.c < 0 || !d.note.trim()) return;
    upd({ done: true });
    addReviewAudit({
      regId: reg.id,
      articleNo: article.no,
      action: "提交複核決定",
      detail: `${CHOICES[d.c]}；決定理由：${d.note.trim()}${selectedRule ? `；關聯內規：${selectedRule.name}` : ""}`,
    });
    toast(`第 ${article.no} 條決定已提交`);
    if (idx < diff.articles.length - 1) setArticleNo(diff.articles[idx + 1].no);
  };
  const articleOptions = diff.articles.map((item) => `第 ${item.no} 條 · ${item.title}`);
  const selectedArticleOption = `第 ${article.no} 條 · ${article.title}`;
  const linkedRuleOptions = linkedRules.map((rule) => `${rule.code} · ${rule.name}`);
  const selectedRuleOption = selectedRule ? `${selectedRule.code} · ${selectedRule.name}` : "";
  const oldText = article.oldSeg.flat().map((segment) => segment.t).join("");
  const reasons = legacy?.reasons ?? [
    `舊版條文：${oldText}`,
    insight.d,
    clause ? `關聯內規「${selectedRule?.name}」現行內容：${clause.text}` : "目前沒有找到對應條文的關聯內規內容，請人工確認。",
  ];
  const canSubmit = d.c >= 0 && Boolean(d.note.trim()) && !d.done;

  return (
    <>
      <PageHeader title="人工複核" sub="逐條確認依據並記錄複核決定。" />
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select label="法規" value={reg.name} options={REGS.map((item) => item.name)} onChange={(v) => setRegId(REGS.find((item) => item.name === v)?.id ?? reg.id)} />
          <Select label="條文" value={selectedArticleOption} options={articleOptions} onChange={(v) => setArticleNo(Number(v.match(/\d+/)?.[0]))} />
          <Badge tone={d.done ? "ok" : "warn"}>{d.done ? "已完成" : "待複核"}</Badge>
          <span className="text-xs font-semibold text-sub">已完成 {doneN} / {diff.articles.length} 條</span>
        </div>
      </Card>

      <div key={`${reg.id}:${article.no}`} className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,0.9fr)] animate-rise">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">法規條文與關聯內規</h3><p className="mt-0.5 text-xs text-sub">{reg.name} · {diff.newVersion} · 第 {article.no} 條</p></div><FileText size={17} className="text-brand" /></div>
            <div className="mt-3 rounded-xl bg-brand-soft/60 p-4 text-[13px] leading-relaxed">
              <div className="mb-2 font-bold">第 {article.no} 條　{article.title}</div>
              {article.newSeg.map((paragraph, i) => <p key={i} className={cn("mb-2", i > 0 && "font-semibold text-brand")}>{paragraph.map((segment) => segment.t).join("")}</p>)}
            </div>
            <div className="mt-4 border-t border-line pt-4 text-xs">
              <div className="font-bold text-navy-900">關聯內規</div>
              {linkedRules.length ? (
                <>
                  <Select label="選擇關聯內規" value={selectedRuleOption} options={linkedRuleOptions} onChange={(v) => setSelectedRuleId(linkedRules.find((rule) => `${rule.code} · ${rule.name}` === v)?.id ?? "")} className="mt-2" />
                  <p className="mt-2 text-sub">{clause ? `${clause.no}：${clause.text}` : "此內規尚無對應條文內容，請人工確認。"}</p>
                </>
              ) : <p className="mt-2 text-sub">目前沒有關聯內規，請人工確認適用範圍。</p>}
            </div>
            <GhostBtn className="mt-4" onClick={() => go("diff")}><Columns2 size={14} />查看完整差異</GhostBtn>
          </Card>

          <Card className="p-5">
            <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">AI 判斷依據</h3><p className="mt-0.5 text-xs text-sub">供複核參考，請依條文與內規內容確認</p></div><Sparkles size={17} className="text-violet" /></div>
            <div className="mt-3"><Badge tone={reg.risk === "高風險" ? "danger" : reg.risk === "中風險" ? "warn" : "ok"}>法規{reg.risk}</Badge></div>
            <h4 className="mt-4 text-[15px] font-bold leading-snug text-navy-900">{insight.t}</h4>
            <p className="mt-2 text-[13px] leading-relaxed text-sub">{insight.d}</p>
            <details className="mt-4 border-t border-line pt-3">
              <summary className="cursor-pointer text-xs font-bold text-brand">查看判斷理由、建議與人工確認重點</summary>
              <div className="mt-3 space-y-3">
                <ol className="space-y-1.5 text-[13px] text-sub">{reasons.map((reason, i) => <li key={i} className="flex gap-2"><b className="text-brand">{i + 1}.</b>{reason}</li>)}</ol>
                <div><div className="text-xs font-bold">建議因應</div><p className="mt-1.5 text-[13px] text-sub">{legacy?.advice ?? `檢視並更新${selectedRule ? `「${selectedRule.name}」` : "相關內規"}，確認流程、責任及紀錄要求符合新版條文。`}</p></div>
                <div className="rounded-xl bg-warn-soft p-3.5"><div className="text-xs font-bold text-warn">人工確認重點</div><p className="mt-1 text-xs leading-relaxed text-sub">{legacy?.warn ?? "請確認新規適用範圍及內規修訂時程。"}</p></div>
              </div>
            </details>
          </Card>
        </div>

        <Card className="p-5 xl:sticky xl:top-4">
          <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">複核決定</h3><p className="mt-0.5 text-xs text-sub">複核人：目前登入者</p></div><UserCheck size={17} className="text-brand" /></div>
          {d.done ? (
            <div className="mt-4 rounded-xl bg-ok-soft p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-ok"><CircleCheck size={17} />此條文已提交複核</div>
              <p className="mt-2 text-xs text-sub">{CHOICES[d.c]} · {d.note}</p>
            </div>
          ) : (
            <>
              <div className="mt-4 text-xs font-bold">選擇複核結果 <span className="text-danger">*</span></div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {CHOICES.map((choice, i) => (
                  <button key={choice} aria-pressed={d.c === i} onClick={() => upd({ c: i })} className={cn("flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[13px] transition", d.c === i ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line hover:border-brand/40")}>
                    <span className={cn("grid h-4 w-4 place-items-center rounded-full border-2", d.c === i ? "border-brand" : "border-slate-300")}>{d.c === i && <i className="h-2 w-2 rounded-full bg-brand" />}</span>{choice}
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-xs font-bold" htmlFor="review-note">決定理由與調整內容 <span className="text-danger">*</span></label>
              <textarea id="review-note" value={d.note} onChange={(e) => upd({ note: e.target.value })} rows={5} placeholder="說明採納或退回的原因；若調整措施，請註明調整內容。" className="mt-2 w-full resize-y rounded-xl border border-line p-3 text-[13px] leading-relaxed outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
              <p className="mt-1 text-[11px] text-faint">選擇結果並填寫理由後即可提交；草稿會自動儲存在此瀏覽器。</p>
              <PrimaryBtn disabled={!canSubmit} className="mt-4 w-full justify-center" onClick={submit}><Check size={16} />提交並前往下一條</PrimaryBtn>
            </>
          )}
        </Card>
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-line bg-white px-5 py-4 shadow-tile">
          <span className="flex items-center gap-2"><History size={18} className="text-brand" /><span className="font-bold text-navy-900">複核與稽核紀錄</span><span className="text-xs text-sub">查看操作歷程</span></span>
          <Badge tone="gray">{reviewAudit.length} 筆</Badge>
        </summary>
        <Card className="mt-3 p-5">
          <p className="text-xs text-sub">依實際送交複核與提交決定的操作建立，保存於此瀏覽器。</p>
          <div className="mt-4 space-y-3">
          {reviewAudit.length ? reviewAudit.map((entry) => {
            const entryReg = REGS.find((item) => item.id === entry.regId);
            return (
              <div key={entry.id} className="flex gap-3 rounded-xl border border-line p-4">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><BookOpen size={14} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-bold text-navy-900">{entry.action}</span>
                    <span className="text-[11px] text-sub">{entryReg?.name ?? entry.regId} · 第 {entry.articleNo} 條</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-sub">{entry.detail}</p>
                  <div className="mt-2 text-[11px] text-faint">{new Date(entry.timestamp).toLocaleString("zh-TW")} · {entry.actor}</div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-sub">目前尚無複核操作紀錄。送交人工複核或提交複核決定後，紀錄會顯示於此。</div>
          )}
          </div>
        </Card>
      </details>
    </>
  );
}
