import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Building2, Check, ChevronDown, FileCheck2, FileStack, Lightbulb, Sparkles, Target } from "lucide-react";
import { DEPTS, DIFF_SETS } from "../data";
import { Badge, Card, CountUp, GhostBtn, PageHeader, RegBar, Segmented, cn } from "../ui";
import { useStore } from "../store";

export default function Impact() {
  const { reg, rules: allRules, tasks, go, toast, setTasks, sendToReview } = useStore();
  const [lv, setLv] = useState<"全部" | "高影響" | "中影響" | "低影響">("全部");
  const [aiResult, setAiResult] = useState<{ mode: string; text: string } | null>(null);
  const diff = DIFF_SETS[reg.id];
  const articleNos = reg.articles;
  const articleNumbers = (reference: string) => (reference.match(/\d+/g) ?? []).map(Number);
  const linkedRules = allRules.filter((rule) => rule.linked.includes(reg.id));
  const impacts = linkedRules.map((rule) => {
    const matchingClauses = rule.clauses.filter((clause) => clause.ref && articleNumbers(clause.ref).some((n) => articleNos.includes(n)));
    const comparisons = diff.articles
      .filter((article) => articleNos.includes(article.no))
      .map((article) => ({
        no: article.no,
        title: article.title,
        requirement: article.newSeg.flat().map((segment) => segment.t).join(""),
        currentClauses: rule.clauses.filter((clause) => clause.ref && articleNumbers(clause.ref).includes(article.no)),
      }))
      .filter((comparison) => comparison.currentClauses.length > 0);
    const pendingForRegulation = rule.pending?.reg === reg.id;
    const impactLevel = rule.status === "修訂中" || (pendingForRegulation && rule.health < 65)
      ? "高影響"
      : pendingForRegulation || comparisons.length > 0
        ? "中影響"
        : "低影響";
    const comparisonReason = comparisons.map((comparison) => {
      const current = comparison.currentClauses.map((clause) => `${clause.no}「${clause.text}」`).join("、");
      return `第 ${comparison.no} 條新規要求「${comparison.requirement}」，但${rule.name}現行${current}；兩者要求有落差，因此需檢視並修訂該內規。`;
    }).join(" ");
    return {
      name: rule.name,
      code: rule.code,
      clauses: matchingClauses.length ? matchingClauses.map((clause) => clause.no).join("、") : rule.clauses.map((clause) => clause.no).join("、"),
      reason: [comparisonReason, rule.pending?.reg === reg.id ? `分析備註：${rule.pending.reason}` : ""].filter(Boolean).join(" ") || (rule.pending?.reg === reg.id ? rule.pending.reason : "此內規已關聯本次法規異動，請確認適用範圍及修訂需求。"),
      basis: matchingClauses.map((clause) => clause.ref).filter((ref): ref is string => Boolean(ref)).join("、") || reg.article,
      dept: rule.dept,
      level: impactLevel as "高影響" | "中影響" | "低影響",
      comparisons,
      rule,
    };
  });
  const measures = diff.insights.map((insight) => {
    const insightNos = articleNumbers(insight.ref);
    const relatedRule = impacts.find((item) => insightNos.some((no) => articleNumbers(item.basis).includes(no)));
    const existingTask = tasks.find((task) => (task.regId === reg.id || (!task.regId && task.topic === reg.topic)) && task.ref === insight.ref && task.title === insight.t);
    return {
      t: insight.t,
      d: insight.d,
      owner: relatedRule?.rule.dept ?? reg.depts.join("、"),
      dept: relatedRule?.rule.dept ?? reg.depts[0] ?? "法遵部",
      ref: insight.ref,
      pri: reg.risk === "高風險" ? "高" as const : reg.risk === "中風險" ? "中" as const : "低" as const,
      status: existingTask ? (existingTask.col === "done" ? "已完成" : "已建立任務") : "待確認",
      existingTask,
    };
  });
  const [open, setOpen] = useState<string | null>(impacts[0]?.code ?? null);
  useEffect(() => {
    setOpen(impacts[0]?.code ?? null);
    setLv("全部");
  }, [reg.id]);
  useEffect(() => {
    setAiResult(null);
  }, [reg.id]);

  const filteredImpacts = useMemo(() => impacts.filter((item) => lv === "全部" || item.level === lv), [allRules, reg.id, lv]);
  const deptCount = DEPTS.map((name) => ({
    d: name,
    n: impacts.filter((item) => item.dept.includes(name)).length,
  })).filter((item) => item.n > 0);
  const relatedTasks = tasks.filter((task) => (task.regId === reg.id || (!task.regId && task.topic === reg.topic)) && articleNumbers(task.ref).some((no) => articleNos.includes(no)));

  const createTask = (measure: (typeof measures)[number]) => {
    if (measure.existingTask) return;
    setTasks((current) => [...current, {
      id: `T-${Date.now()}`,
      title: measure.t,
      desc: measure.d,
      pri: measure.pri === "高" ? "高優先" : measure.pri === "中" ? "中優先" : "低優先",
      topic: reg.topic,
      regId: reg.id,
      ref: measure.ref,
      owner: measure.owner,
      dept: measure.dept,
      due: reg.effective.slice(5).replace("/", "/"),
      col: "todo",
    }]);
    toast("已建立任務，可至待辦看板查看");
  };

  const runLocalImpactAnalysis = () => {
    setAiResult({
      mode: "本機法規影響分析（非生成式 AI）",
      text: [
        `依據 ${reg.name} 的示範條文與目前內規關聯，建議優先由 ${[...new Set(impacts.map((item) => item.dept))].join("、") || reg.depts.join("、")} 檢視影響。`,
        ...diff.insights.map((insight) => `${insight.ref}｜${insight.t}：${insight.d}`),
        ...impacts.filter((item) => item.level === "高影響" || item.level === "中影響").map((item) => `${item.name}（${item.dept}）：${item.reason}`),
        `建議措施：${measures.slice(0, 3).map((measure) => measure.d).join("；")}`,
      ].join("\n"),
    });
  };

  const stats = [
    { l: "關聯內規", n: impacts.length, c: "#10243A", icon: FileStack, s: `${impacts.filter((item) => item.level === "高影響").length} 件優先檢視` },
    { l: "涉及部門", n: deptCount.length, c: "#7c5cfc", icon: Building2, s: deptCount.map((item) => item.d).join("、") || "尚無關聯部門" },
    { l: "待辦措施", n: measures.length, c: "#e8890c", icon: Target, s: `${relatedTasks.length} 件已同步至待辦` },
  ];

  return (
    <>
      <PageHeader title="影響分析" sub="從法規新要求一路追到內規落差與建議行動，讓每一項影響都有明確依據。" />
      <RegBar />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-soft/70 via-white to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm ring-1 ring-brand/10"><Sparkles size={18} /></span>
            <div><div className="text-sm font-bold text-navy-900">本次分析摘要</div><p className="mt-1 text-[13px] text-sub">{reg.name} · {reg.article} · 生效日 {reg.effective}</p></div>
          </div>
          <Badge tone={reg.risk === "高風險" ? "danger" : reg.risk === "中風險" ? "warn" : "ok"}>{reg.risk} · {reg.topic}</Badge>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.l} className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: stat.c }}><stat.icon size={18} /></span>
              <div><div className="text-xs font-semibold text-sub">{stat.l}</div><div className="mt-0.5 flex items-baseline gap-2"><span className="num text-3xl font-extrabold leading-tight" style={{ color: stat.c }}><CountUp to={stat.n} /></span><span className="text-[11px] text-sub">{stat.s}</span></div></div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="group overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-700 px-5 py-4 text-white md:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-cyan-200"><Sparkles size={19} /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">法規 × 內規影響分析</h2><Badge tone="warn">本機規則示範</Badge></div>
              <p className="mt-1 text-xs text-white/65">依據 data.ts 法規重點與 rulesData.ts 內規關聯，比對部門及可能影響。</p>
            </div>
          </div>
          <button type="button" onClick={runLocalImpactAnalysis} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-navy-900 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-soft hover:shadow-lg">
            <Sparkles size={15} />
            {aiResult ? "重新分析" : "開始分析"}
          </button>
        </div>
        {aiResult && (
          <div aria-live="polite" className="animate-rise border-t border-line p-5 md:p-6">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone="warn">{aiResult.mode}</Badge><span className="text-[11px] text-faint">{reg.name} · {reg.effective} 生效</span></div>
              <p className="whitespace-pre-wrap text-[13px] leading-7 text-sub">{aiResult.text}</p>
              <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">分析依據為平台本機示範資料，非生成式 AI 或正式法規意見；採用前須由法遵人員核對原文與適用範圍。</p>
            </div>
          </div>
        )}
        {!aiResult && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[11px] text-sub md:px-6">
            <span>分析來源：{diff.articles.length} 條修訂、{impacts.length} 部關聯內規、{deptCount.length} 個受影響部門</span>
            <span>資料僅在前端讀取，不呼叫 Backend</span>
          </div>
        )}
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div><h2 className="text-lg font-extrabold text-navy-900">內規影響與差異依據</h2><p className="mt-1 text-xs text-sub">逐項呈現法規要求、現行內規與影響原因</p></div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented value={lv} onChange={setLv} options={(["全部", "高影響", "中影響", "低影響"] as const).map((value) => ({ v: value, label: value }))} />
            </div>
          </div>
          <div className="space-y-3 p-5">
            {filteredImpacts.map((item) => {
              const isOpen = open === item.code;
              return (
                <section key={item.code} className={cn("overflow-hidden rounded-2xl border transition-colors", isOpen ? "border-brand/40 shadow-sm" : "border-line")}>
                  <button aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : item.code)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><FileCheck2 size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-navy-900">{item.name}<Badge tone={item.level === "高影響" ? "danger" : item.level === "中影響" ? "warn" : "ok"}>{item.level}</Badge></span>
                      <span className="mt-1 block text-xs text-sub">{item.code} · 對應 {item.clauses} · {item.dept}</span>
                    </span>
                    <ChevronDown size={17} className={cn("shrink-0 text-faint transition-transform", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line bg-slate-50/60 p-4 sm:p-5">
                      <div className="mb-4 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn-soft/60 p-3.5">
                        <Lightbulb size={16} className="mt-0.5 shrink-0 text-warn" />
                        <div><div className="text-xs font-bold text-navy-900">為什麼會影響？</div><p className="mt-1 text-[13px] leading-relaxed text-sub">{item.reason}</p></div>
                      </div>
                      {item.comparisons.length ? (
                        <div className="space-y-3">
                          {item.comparisons.map((comparison) => (
                            <div key={comparison.no} className="rounded-xl border border-line bg-white p-4">
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-[13px] font-bold text-navy-900">第 {comparison.no} 條 · {comparison.title}</div><Badge tone="brand">法規差異依據</Badge></div>
                              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                                <div className="rounded-lg bg-brand-soft/70 p-3.5">
                                  <div className="mb-1.5 text-[11px] font-bold text-brand">新法規要求</div>
                                  <p className="text-[13px] leading-relaxed text-ink">{comparison.requirement}</p>
                                </div>
                                <div className="hidden items-center justify-center text-faint md:flex"><ArrowRight size={17} /></div>
                                <div className="rounded-lg bg-slate-100 p-3.5">
                                  <div className="mb-1.5 text-[11px] font-bold text-sub">現行內規</div>
                                  {comparison.currentClauses.map((clause) => <p key={clause.id} className="text-[13px] leading-relaxed text-ink">{clause.no}：{clause.text}</p>)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex gap-2 rounded-xl border border-warn/20 bg-white p-3.5 text-[13px] leading-relaxed text-sub"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />雖已建立法規與內規關聯，但尚未標註對應條號。請先確認實際適用的內規條文，再判斷修訂範圍。</div>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-sub">責任部門：<b className="text-ink">{item.dept}</b> · 內規版本 {item.rule.version}</span>
                        <div className="flex gap-2">
                          <GhostBtn onClick={() => go("diff")}>檢視完整條文</GhostBtn>
                          <GhostBtn onClick={() => {
                            const articleNo = item.comparisons[0]?.no ?? articleNos[0];
                            const insight = diff.insights.find((entry) => articleNumbers(entry.ref).includes(articleNo)) ?? diff.insights[0];
                            sendToReview({ regId: reg.id, articleNo, insight });
                            toast(`已將「${item.name}」第 ${articleNo} 條送交複核`);
                          }}>送交複核<ArrowRight size={13} /></GhostBtn>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
            {!filteredImpacts.length && <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-sub">此法規目前沒有符合條件的關聯內規。</div>}
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-navy-900">建議因應措施</h3><p className="mt-0.5 text-xs text-sub">依據本法規 AI 重點解析</p></div><Badge tone="brand">{measures.length} 項</Badge></div>
            <div className="mt-4 space-y-3">
              {measures.map((measure) => (
                <div key={measure.t} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", measure.existingTask ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand")}>{measure.existingTask ? <Check size={12} /> : <Target size={12} />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold leading-snug text-navy-900">{measure.t}</div>
                      <p className="mt-1 text-xs leading-relaxed text-sub">{measure.d}</p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-faint">{measure.ref} · {measure.dept}</span><button onClick={() => createTask(measure)} disabled={Boolean(measure.existingTask)} className={cn("rounded-lg px-2.5 py-1 text-[11px] font-semibold", measure.existingTask ? "cursor-default bg-ok-soft text-ok" : "bg-brand text-white hover:bg-navy-800")}>{measure.status}</button></div>
                    </div>
                  </div>
                </div>
              ))}
              {!measures.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-sub">目前沒有建議措施。</p>}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
