import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CalendarDays, Check, Download, FileBarChart2, Gavel, Search, ShieldCheck, X } from "lucide-react";
import { DEPTS, INDUSTRIES, PENALTIES, REGS, TOPICS, regulationsForIndustries } from "../data";
import { Badge, Card, CountUp, PageHeader, Select, cn } from "../ui";
import { useStore } from "../store";

function AnimatedPanel({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timeout = window.setTimeout(() => setMounted(false), 280);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{(open || mounted) && children}</div>
    </div>
  );
}

export default function Reports() {
  const { tasks, go, setRegId, toast, industryIds } = useStore();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("全部");
  const [department, setDepartment] = useState("全部");
  const [risk, setRisk] = useState("全部");
  const [period, setPeriod] = useState("90");
  const [reportScope, setReportScope] = useState<"company" | "all">("company");
  const [reportContent, setReportContent] = useState("");
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const availableRegs = reportScope === "company" ? regulationsForIndustries(industryIds) : REGS;
  const periodStart = new Date();
  if (period !== "all") periodStart.setDate(periodStart.getDate() - Number(period));
  const reportRegs = useMemo(() => availableRegs.filter((reg) => {
    const [month, day] = reg.date.split("/").map(Number);
    const publishedYear = Number(reg.id.match(/^REG-(\d{4})-/)?.[1]) || new Date().getFullYear();
    const published = new Date(publishedYear, (month || 1) - 1, day || 1);
    return (period === "all" || published >= periodStart)
      && (topic === "全部" || reg.topic === topic)
      && (risk === "全部" || reg.risk === risk);
  }), [availableRegs, period, topic, risk, periodStart.toDateString()]);
  const reportRegIds = new Set(reportRegs.map((reg) => reg.id));
  const reportTasks = tasks.filter((task) =>
    (!task.regId || reportRegIds.has(task.regId))
    && (topic === "全部" || task.topic === topic)
    && (department === "全部" || task.dept === department)
    && (risk === "全部" || (risk === "高風險" ? task.pri === "高優先" : risk === "低風險" ? task.pri === "低優先" : task.pri === "中優先")),
  );
  const openTasks = reportTasks.filter((task) => task.col !== "done");
  const highRiskRegs = reportRegs.filter((reg) => reg.risk === "高風險");
  const penaltyTopics = [...new Set(PENALTIES.map((item) => item.topic))];
  const topics = [...new Set([...TOPICS, ...penaltyTopics])];
  const filteredCases = useMemo(() => PENALTIES.filter((item) => {
    const searchable = `${item.title} ${item.who} ${item.industry} ${item.topic} ${item.point}`.toLowerCase();
    return (topic === "全部" || item.topic === topic) && searchable.includes(query.trim().toLowerCase());
  }), [query, topic]);
  const reportDate = new Intl.DateTimeFormat("zh-TW", { dateStyle: "long" }).format(new Date());
  const generatedSummary = useMemo(() => {
    const overdue = openTasks.filter((task) => {
      const [month, day] = task.due.split("/").map(Number);
      const due = new Date(new Date().getFullYear(), (month || 1) - 1, day || 1);
      due.setHours(0, 0, 0, 0);
      return due < new Date(new Date().setHours(0, 0, 0, 0));
    });
    const endingSoon = reportRegs.filter((reg) => {
      const deadline = new Date(`${reg.effective.replace(/\//g, "-")}T00:00:00`);
      const days = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 30;
    });
    const departmentSummary = DEPTS.map((dept) => {
      const deptTasks = reportTasks.filter((task) => task.dept === dept);
      return deptTasks.length ? `${dept} ${deptTasks.filter((task) => task.col === "done").length}/${deptTasks.length} 完成` : "";
    }).filter(Boolean).join("、");
    return [
      `法遵管理摘要（${reportDate}）`,
      `報告範圍：${reportScope === "company" ? INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、") || "未設定產業" : "全部產業"}；期間：${period === "all" ? "全部" : `近 ${period} 日`}；主題：${topic}；部門：${department}；風險：${risk}`,
      `法規異動：${reportRegs.length} 項；高風險 ${highRiskRegs.length} 項；30 日內生效 ${endingSoon.length} 項。`,
      `改善任務：共 ${reportTasks.length} 項，未完成 ${openTasks.length} 項，已完成 ${reportTasks.length - openTasks.length} 項，逾期 ${overdue.length} 項。`,
      `部門進度：${departmentSummary || "目前篩選範圍內尚無部門任務"}`,
      `優先關注：${highRiskRegs.map((reg) => `${reg.name}（${reg.effective} 生效）`).join("、") || "目前無符合條件的高風險法規"}`,
      `近期生效：${endingSoon.map((reg) => `${reg.name}（${reg.effective}）`).join("、") || "近 30 日無法規生效"}`,
      `待管理決策：請確認高風險法規責任部門、生效期限與逾期任務資源；裁罰案例資料為平台示範資料，需另行核對正式公告。`,
    ].join("\n");
  }, [reportDate, reportScope, industryIds, period, topic, department, risk, reportRegs, highRiskRegs, reportTasks, openTasks]);

  useEffect(() => setReportContent(generatedSummary), [generatedSummary]);

  useEffect(() => {
    document.body.classList.add("printing-management-report");
    const resetPrintExpansion = () => setExpandedCase(null);
    window.addEventListener("afterprint", resetPrintExpansion);
    return () => {
      document.body.classList.remove("printing-management-report");
      window.removeEventListener("afterprint", resetPrintExpansion);
    };
  }, []);

  const printReport = () => {
    setExpandedCase("__all__");
    window.requestAnimationFrame(() => window.print());
  };
  const clearFilters = () => {
    setQuery("");
    setTopic("全部");
    setDepartment("全部");
    setRisk("全部");
    setExpandedCase(null);
  };
  const copySummary = async () => {
    const summary = `${reportContent}\n裁罰案例：${filteredCases.length} 案（data.ts 示範資料，非正式公告）`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = summary;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      if (!copied) {
        toast("無法複製管理摘要，請改用列印／另存 PDF。");
        return;
      }
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 1800);
    }
  };
  const exportSpreadsheet = () => {
    const rows = [
      ["類型", "名稱", "主題", "風險／優先級", "部門", "到期／生效日", "狀態"],
      ...reportRegs.map((reg) => ["法規異動", reg.name, reg.topic, reg.risk, reg.depts.join("、"), reg.effective, reg.status]),
      ...reportTasks.map((task) => ["改善任務", task.title, task.topic, task.pri, `${task.dept}／${task.owner}`, task.due, task.col === "done" ? "已完成" : task.col === "doing" ? "處理中" : "待處理"]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `法遵管理摘要-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast("已匯出 Excel 相容 CSV 報告");
  };
  const openImpact = (regId: string) => {
    setRegId(regId);
    go("impact");
  };

  return (
    <div className="management-report-page space-y-6">
      <PageHeader
        title="裁罰與管理報告"
        sub="彙整法規風險、待辦進度與裁罰案例，提供法遵管理決策參考。"
        action={
          <>
            <button type="button" onClick={() => void copySummary()} className="no-print inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand">
              {copiedSummary ? <Check size={16} className="text-ok" /> : <FileBarChart2 size={16} />}{copiedSummary ? "已複製摘要" : "複製管理摘要"}
            </button>
            <button type="button" onClick={printReport} className="no-print inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(27,89,248,0.24)] transition hover:-translate-y-0.5 hover:bg-[#1148d4]">
              <Download size={16} />列印／另存 PDF
            </button>
            <button type="button" onClick={exportSpreadsheet} className="no-print inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand">
              <Download size={16} />匯出 Excel CSV
            </button>
          </>
        }
      />

      <Card className="no-print p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold text-navy-900">報告範圍與篩選</h2><p className="mt-0.5 text-[11px] text-sub">篩選會同步更新摘要、法規與改善任務內容。</p></div>
          <div className="flex items-center gap-2"><span className="text-[11px] font-semibold text-sub">產業範圍</span><button onClick={() => setReportScope(reportScope === "company" ? "all" : "company")} className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">{reportScope === "company" ? "本公司產業" : "全部產業"}</button></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select label="期間" value={period} options={["30", "90", "all"]} onChange={setPeriod} />
          <Select label="法規主題" value={topic} options={["全部", ...TOPICS]} onChange={setTopic} />
          <Select label="部門" value={department} options={["全部", ...DEPTS]} onChange={setDepartment} />
          <Select label="風險等級" value={risk} options={["全部", "高風險", "中風險", "低風險"]} onChange={setRisk} />
          <span className="text-[10px] text-faint">{reportScope === "company" ? `公司產業：${INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、") || "未設定"}` : "顯示全部產業規範"}</span>
        </div>
      </Card>

      <Card className="print-break-inside animate-rise overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-navy-900 via-navy-800 to-[#2458ad] px-6 py-6 text-white md:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/65"><FileBarChart2 size={15} />法遵管理摘要</div>
            <h2 className="mt-2 text-xl font-extrabold md:text-2xl">監理風險與因應進度</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/75">依平台目前追蹤的法規、風險與任務資料彙整，協助管理者掌握優先處理事項。</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-white/85"><CalendarDays size={14} />報告日期：{reportDate}</div>
        </div>

        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "追蹤法規異動", value: reportRegs.length, hint: "符合目前篩選條件", tone: "text-brand", color: "#1b59f8" },
            { label: "高風險法規", value: highRiskRegs.length, hint: "建議優先檢視", tone: "text-danger", color: "#e5484d" },
            { label: "未完成任務", value: openTasks.length, hint: `${reportTasks.length - openTasks.length} 項已完成`, tone: "text-warn", color: "#e8890c" },
          ].map((metric, index) => (
            <div key={metric.label} className="report-metric flex animate-rise items-center gap-4 px-6 py-5 transition-colors duration-300 hover:bg-canvas/60 md:px-8" style={{ animationDelay: `${index * 90}ms` }}>
              <span className="h-10 w-1 rounded-full transition-all duration-300 group-hover:scale-y-110" style={{ backgroundColor: metric.color }} />
              <div>
                <div className="text-xs font-semibold text-sub">{metric.label}</div>
                <div className={cn("num mt-1 text-3xl font-extrabold leading-none", metric.tone)}><CountUp to={metric.value} ms={1200} /><span className="ml-1 text-xs font-medium text-sub">項</span></div>
                <div className="mt-1 text-[11px] text-faint">{metric.hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 border-t border-line p-6 lg:grid-cols-[1.15fr_0.85fr] md:p-8">
          <div id="priority-regulations">
            <div className="mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-warn" /><h3 className="text-sm font-bold text-navy-900">優先管理事項</h3></div>
            {highRiskRegs.length ? (
              <ul className="space-y-2">
                {highRiskRegs.map((reg, index) => (
                  <li key={reg.id} className="group flex animate-rise items-start gap-3 rounded-xl bg-canvas/80 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-soft/70 hover:shadow-tile" style={{ animationDelay: `${180 + index * 70}ms` }}>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[13px] font-bold text-navy-900">{reg.name}</span><Badge tone="danger">高風險</Badge></div>
                      <p className="mt-1 text-xs leading-relaxed text-sub">{reg.article} · {reg.note} · 生效日 {reg.effective}</p>
                    </div>
                    <button type="button" onClick={() => openImpact(reg.id)} className="no-print inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand hover:underline">檢視<ArrowRight size={13} /></button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-sub">目前沒有列管的高風險法規。</p>}
          </div>
          <div className="rounded-2xl border border-line p-4 transition-shadow duration-300 hover:shadow-tile md:p-5">
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-ok" /><h3 className="text-sm font-bold text-navy-900">管理摘要</h3></div>
            <p className="mt-3 text-[13px] leading-7 text-sub">
              目前追蹤 <b className="text-ink">{reportRegs.length}</b> 項法規異動，其中 <b className="text-danger">{highRiskRegs.length}</b> 項列為高風險；
              尚有 <b className="text-warn">{openTasks.length}</b> 項因應任務未完成。
              建議管理者優先確認高風險法規的責任部門、生效期限與改善進度，並檢視下方裁罰案例的共通缺失是否已納入內控。
            </p>
            <label className="no-print mt-4 block text-xs font-semibold text-sub">可編輯管理摘要
              <textarea value={reportContent} onChange={(event) => setReportContent(event.target.value)} rows={7} className="mt-1.5 w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 font-normal leading-relaxed text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
            </label>
            <div className="hidden whitespace-pre-wrap text-[12px] leading-relaxed text-ink print:block">{reportContent}</div>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
              資料註記：法規與任務統計取自平台目前資料；本頁裁罰案例為 data.ts 示範資料，非主管機關正式裁罰公告。
            </p>
          </div>
        </div>
      </Card>

      <section aria-labelledby="penalty-cases-heading">
        <div className="mb-4 flex animate-rise flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><Gavel size={18} className="text-brand" /><h2 id="penalty-cases-heading" className="text-lg font-extrabold text-navy-900">裁罰案例與監理提醒</h2></div>
            <p className="mt-1 text-xs text-sub">整理裁罰缺失、管理啟示與建議檢核事項，連結至相關法規影響分析。</p>
          </div>
          <Badge tone="warn">示範資料 · 非正式裁罰公告</Badge>
        </div>

        <Card className="overflow-hidden">
          <div className="no-print space-y-3 border-b border-line p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <Search size={15} className="text-faint" />
              <input aria-label="搜尋裁罰案例" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋裁罰事由、機構、產業或主題" className="w-full bg-transparent outline-none" />
            </label>
            <Select label="主題" value={topic} options={["全部", ...topics]} onChange={setTopic} />
            <span className="text-xs text-sub">顯示 {filteredCases.length} / {PENALTIES.length} 案</span>
            {(query || topic !== "全部") && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"><X size={13} />清除篩選</button>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold text-sub">快速篩選</span>
              {["全部", ...topics].map((item) => (
                <button key={item} type="button" aria-pressed={topic === item} onClick={() => setTopic(item)} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]", topic === item ? "bg-navy-900 text-white shadow-sm" : "bg-slate-100 text-sub hover:bg-brand-soft hover:text-brand")}>{item}</button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-line">
            {filteredCases.map((item) => {
              const open = expandedCase === item.title || expandedCase === "__all__";
              const relatedReg = REGS.find((reg) => reg.id === item.relatedRegId);
              return (
                <article key={item.title} className={cn("print-break-inside animate-rise px-4 py-4 transition-colors duration-300 hover:bg-canvas/40 md:px-5", open && "bg-brand-soft/30")} style={{ animationDelay: `${PENALTIES.indexOf(item) * 70}ms` }}>
                  <div className="no-print">
                    <button type="button" aria-expanded={open} onClick={() => setExpandedCase(open ? null : item.title)} className="flex w-full flex-wrap items-start gap-3 text-left">
                      <span className="mt-1 h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold text-navy-900">{item.title}</span><Badge tone="gray">{item.topic}</Badge><Badge tone="gray">{item.industry}</Badge></span>
                        <span className="mt-1.5 block text-xs text-sub">{item.who} · {item.date} · 裁罰金額 {item.fine}</span>
                      </span>
                      <span className={cn("mt-1 text-xs font-semibold text-brand transition-transform", open && "rotate-90")}>›</span>
                    </button>
                  </div>
                  <div className="hidden print:block">
                    <div className="text-sm font-bold text-navy-900">{item.title} · {item.topic} · {item.industry}</div>
                    <div className="mt-1 text-xs text-sub">{item.who} · {item.date} · 裁罰金額 {item.fine}</div>
                  </div>
                  <AnimatedPanel open={open}>
                    <div className="ml-4 mt-4 grid gap-4 rounded-xl bg-canvas/80 p-4 animate-rise md:grid-cols-2">
                      <div><div className="text-xs font-bold text-navy-900">裁罰事由摘要</div><p className="mt-1.5 text-[13px] leading-relaxed text-sub">{item.point}</p></div>
                      <div><div className="text-xs font-bold text-navy-900">監理啟示</div><p className="mt-1.5 text-[13px] leading-relaxed text-sub">{item.lesson}</p></div>
                      <div className="md:col-span-2"><div className="text-xs font-bold text-navy-900">建議自我檢核</div><p className="mt-1.5 text-[13px] leading-relaxed text-sub">{item.recommendation}</p></div>
                      <div className="md:col-span-2">
                        <button type="button" onClick={() => openImpact(item.relatedRegId)} className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline">
                          關聯法規：{relatedReg?.name ?? item.relatedRegId}<ArrowRight size={13} />
                        </button>
                        <span className="hidden print:inline text-xs text-sub">關聯法規：{relatedReg?.name ?? item.relatedRegId}</span>
                      </div>
                    </div>
                  </AnimatedPanel>
                </article>
              );
            })}
            {!filteredCases.length && <div className="px-5 py-12 text-center text-sm text-sub">沒有符合條件的裁罰案例，請調整搜尋或主題篩選。</div>}
          </div>
        </Card>
      </section>
    </div>
  );
}
