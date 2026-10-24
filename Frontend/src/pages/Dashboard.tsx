import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, FileCheck2, Gavel, ListChecks, Search, Send, ShieldAlert } from "lucide-react";
import { HEAT_ALERTS, INDUSTRIES, PENALTIES, REGS, regulationsForIndustries } from "../data";
import { ArrowBtns, Badge, Card, CarouselDots, CountUp, GhostBtn, PageHeader, RiskBadge, Segmented, Select, cn, statusTone, useCarousel } from "../ui";
import { useStore } from "../store";
import { Donut, HBars } from "../charts";
import type { PolicyRiskEvent, PolicyRiskEventState } from "../api/legalApi";

type DashboardEvent = PolicyRiskEvent & {
  regId: string;
  article: string;
  effective: string;
  issuer: string;
  note: string;
};

const eventStatusByRegStatus = {
  待複核: "Pending",
  分析完成: "Reviewed",
  處理中: "InReview",
  已確認: "Closed",
} as const;

const departmentNames: Record<string, string> = {
  法遵: "法遵部",
  營運: "營運部",
  資訊: "資訊部",
  風控: "風控部",
  客服: "客服部",
  授信: "授信部",
};

const dashboardEvents: DashboardEvent[] = REGS.map((reg, index) => ({
  risk_event_id: index + 1,
  act_name: reg.name,
  topic: reg.topic,
  industry: reg.industries,
  risk: reg.risk === "高風險" ? 9 : reg.risk === "中風險" ? 6 : 3,
  affected_department: reg.depts.map((department) => departmentNames[department] ?? department).join("、"),
  event_date: `2026-${reg.date.replace("/", "-")}`,
  status: eventStatusByRegStatus[reg.status],
  regId: reg.id,
  article: reg.article,
  effective: reg.effective,
  issuer: reg.issuer,
  note: reg.note,
}));

function Spark({ pts, color }: { pts: number[]; color: string }) {
  const max = Math.max(...pts), min = Math.min(...pts);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${(i / (pts.length - 1)) * 100},${28 - ((p - min) / (max - min || 1)) * 24}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-full" preserveAspectRatio="none">
      <path d={`${d} L100,32 L0,32 Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Stats({ eventCount, eventTrend, highRiskCount, pendingCount, completedCount, eventsLoading }: {
  eventCount: number;
  eventTrend: number[];
  highRiskCount: number;
  pendingCount: number;
  completedCount: number;
  eventsLoading: boolean;
}) {
  const { go } = useStore();
  const items = [
    { label: "法規風險事件", n: eventCount, pad: 0, sub: eventsLoading ? "正在讀取後端資料" : "依事件日期統計", color: "#1b59f8", pts: eventTrend, to: "diff" as const },
    { label: "需優先關注", n: highRiskCount, pad: 2, sub: "風險分數達 8 分以上", color: "#e5484d", pts: eventTrend, to: "heat" as const },
    { label: "待辦事項", n: pendingCount, pad: 2, sub: "待複核、處理中或需重新分析", color: "#e8890c", pts: eventTrend, to: "kanban" as const },
    { label: "因應完成率", n: eventCount ? Math.round((completedCount / eventCount) * 100) : 0, pad: 0, suffix: "%", sub: `已完成 ${completedCount} / ${eventCount} 筆事件`, color: "#0f9d6b", pts: eventTrend, to: "impact" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
      {items.map((s, i) => (
        <button key={s.label} onClick={() => go(s.to)} className={cn("group relative px-2 text-left lg:px-7 animate-rise", i > 0 && "lg:border-l lg:border-line", i % 2 === 1 && "border-l border-line lg:border-l")} style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-sub"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}<ArrowUpRight size={14} className="ml-auto text-faint opacity-0 transition group-hover:opacity-100" /></div>
          <div className="num mt-2 flex items-baseline text-[64px] font-extrabold leading-none" style={{ color: s.color }}>
            <CountUp to={s.n} pad={s.pad} suffix={s.suffix} />
          </div>
          {s.pts.length > 1 && <div className="mt-3"><Spark pts={s.pts} color={s.color} /></div>}
          <div className="mt-2 text-xs text-sub">{s.sub}</div>
        </button>
      ))}
    </div>
  );
}

function Spotlight() {
  const { go, setRegId, industryIds } = useStore();
  const list = regulationsForIndustries(industryIds).filter((r) => r.risk !== "低風險").slice(0, 5);
  const c = useCarousel(list.length, 5500);
  const r = list[c.i];
  const grad = ["from-navy-800 to-navy-600", "from-[#4b2fb8] to-navy-800", "from-[#0b6b7a] to-navy-800", "from-[#a8431a] to-navy-900", "from-navy-700 to-[#0b5c46]"][c.i];
  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white transition-all duration-700", grad)} onMouseEnter={() => c.setPaused(true)} onMouseLeave={() => c.setPaused(false)}>
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest text-white/65">焦點法規 · {c.i + 1} / {list.length}</span>
        <ArrowBtns prev={c.prev} next={c.next} light />
      </div>
      <div key={r.id} className="relative mt-5 flex-1 animate-rise">
        <div className="flex gap-2"><Badge tone={r.risk === "高風險" ? "danger" : "warn"}>{r.risk}</Badge><Badge className="bg-white/15 text-white">{r.topic}</Badge></div>
        <h3 className="mt-3 text-2xl font-extrabold leading-snug">{r.name}</h3>
        <p className="mt-2 text-sm text-white/75">{r.article} · {r.note}</p>
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-white/15 pt-4 text-xs">
          <div><div className="text-white/55">發布</div><div className="num mt-1 text-lg font-bold">{r.date}</div></div>
          <div><div className="text-white/55">預計生效</div><div className="mt-1 text-lg font-bold">{r.effective.slice(5)}</div></div>
          <div><div className="text-white/55">影響部門</div><div className="num mt-1 text-lg font-bold">{r.depts.length}</div></div>
        </div>
      </div>
      <div className="relative mt-5 flex items-center justify-between">
        <CarouselDots n={list.length} i={c.i} set={c.set} light />
        <div className="flex gap-2">
          <button onClick={() => { setRegId(r.id); go("diff"); }} className="rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-navy-900 transition hover:-translate-y-0.5">差異對照</button>
          <button onClick={() => { setRegId(r.id); go("impact"); }} className="rounded-lg bg-white/15 px-3.5 py-2 text-xs font-bold ring-1 ring-white/25 transition hover:bg-white/25">影響分析</button>
        </div>
      </div>
    </div>
  );
}

function PriorityQueue() {
  const { go, setRegId, rules, tasks, industryIds } = useStore();
  const riskOrder = { 高風險: 0, 中風險: 1, 低風險: 2 };
  const priorityRegs = [...regulationsForIndustries(industryIds)]
    .sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk] || a.effective.localeCompare(b.effective))
    .slice(0, 3);
  const openPage = (regId: string, page: "diff" | "impact") => {
    setRegId(regId);
    go(page);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-6">
        <div>
          <div className="flex items-center gap-2"><ShieldAlert size={17} className="text-danger" /><h2 className="text-lg font-extrabold text-navy-900">優先關注</h2></div>
          <p className="mt-1 text-xs text-sub">先處理高風險或即將生效的變動，逐項完成差異確認與部門影響評估。</p>
        </div>
        <Badge tone="warn">{priorityRegs.length} 項建議先檢視</Badge>
      </div>
      <div className="divide-y divide-line">
        {priorityRegs.map((reg, index) => {
          const linkedRules = rules.filter((rule) => rule.linked.includes(reg.id));
          const regulationTasks = tasks.filter((task) => task.regId === reg.id || (!task.regId && task.topic === reg.topic && reg.articles.some((no) => task.ref.includes(`第 ${no} 條`))));
          const pendingTasks = regulationTasks.filter((task) => task.col !== "done").length;
          const tone = reg.risk === "高風險" ? "danger" : reg.risk === "中風險" ? "warn" : "ok";
          return (
            <div key={reg.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:px-6">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold", reg.risk === "高風險" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn")}>{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-[14px] font-bold text-navy-900">{reg.name}</h3><Badge tone={tone}>{reg.risk}</Badge><Badge tone="gray">{reg.topic}</Badge></div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sub">
                  <span>{reg.article} · {reg.note}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays size={12} />生效 {reg.effective}</span>
                  <span className="inline-flex items-center gap-1"><FileCheck2 size={12} />{linkedRules.length} 部關聯內規</span>
                  <span className="inline-flex items-center gap-1"><ListChecks size={12} />{pendingTasks} 項待辦</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <GhostBtn onClick={() => openPage(reg.id, "diff")}>1. 看差異</GhostBtn>
                <button onClick={() => openPage(reg.id, "impact")} className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#1148d4]">2. 看影響<ArrowRight size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line bg-canvas/70 px-5 py-3 text-[11px] text-sub md:px-6">
        <span className="font-semibold text-ink">建議流程</span>
        <span>① 確認法規差異</span><span>② 評估受影響內規與部門</span><span>③ 建立待辦並追蹤完成</span>
        <button onClick={() => go("kanban")} className="ml-auto inline-flex items-center gap-1 font-semibold text-brand hover:underline">查看全部待辦<ArrowRight size={12} /></button>
      </div>
    </Card>
  );
}

function ActionQueue({ events }: { events: DashboardEvent[] }) {
  const actionStatus: Record<string, number> = { ReanalysisRequired: 0, Pending: 1, InReview: 2 };
  const allActionableEvents = [...new Map(events.map((event) => [event.risk_event_id, event])).values()]
    .filter((event) => event.status in actionStatus)
    .sort((a, b) => actionStatus[a.status] - actionStatus[b.status] || b.risk - a.risk || a.event_date.localeCompare(b.event_date))
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"全部" | "Pending" | "ReanalysisRequired" | "InReview">("全部");
  const filteredEvents = statusFilter === "全部" ? allActionableEvents : allActionableEvents.filter((event) => event.status === statusFilter);
  const actionableEvents = showAll ? filteredEvents : filteredEvents.slice(0, 5);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const statusLabels: Record<string, string> = { ReanalysisRequired: "需重新分析", Pending: "待複核", InReview: "處理中" };
  const filters = [
    { label: "全部", value: "全部" as const, count: allActionableEvents.length },
    { label: "待複核", value: "Pending" as const, count: allActionableEvents.filter((event) => event.status === "Pending").length },
    { label: "需重新分析", value: "ReanalysisRequired" as const, count: allActionableEvents.filter((event) => event.status === "ReanalysisRequired").length },
    { label: "處理中", value: "InReview" as const, count: allActionableEvents.filter((event) => event.status === "InReview").length },
  ];

  const toggleDetails = (eventId: number) => setSelectedId((current) => current === eventId ? null : eventId);

  return (
    <section aria-labelledby="action-queue-title" className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2"><ShieldAlert size={18} className="text-danger" /><h2 id="action-queue-title" className="text-lg font-extrabold text-navy-900">待處理法規</h2></div>
          <p className="mt-1 text-xs text-sub">先處理待複核、需重新分析或正在處理的監理事件。</p>
        </div>
        <Badge tone={allActionableEvents.length ? "warn" : "ok"}>{allActionableEvents.length} 件待處理</Badge>
      </div>
      {allActionableEvents.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-line py-3" aria-label="依處理狀態篩選">
          {filters.map((filter) => (
            <button key={filter.value} aria-pressed={statusFilter === filter.value} onClick={() => { setStatusFilter(filter.value); setShowAll(false); }} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]", statusFilter === filter.value ? "bg-navy-900 text-white shadow-sm" : "bg-slate-100 text-sub hover:bg-brand-soft hover:text-brand")}>
              {filter.label} <span className={cn("ml-1", statusFilter === filter.value ? "text-white/70" : "text-faint")}>{filter.count}</span>
            </button>
          ))}
        </div>
      )}
      {actionableEvents.length ? (
        <div className="divide-y divide-line">
          {actionableEvents.map((event, index) => (
            <div key={event.risk_event_id} className="animate-rise py-4" style={{ animationDelay: `${index * 55}ms` }}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-navy-900">{event.act_name}</h3>
                    <Badge tone={event.status === "ReanalysisRequired" || event.risk >= 8 ? "danger" : event.status === "Pending" ? "warn" : "violet"}>{statusLabels[event.status]}</Badge>
                    {event.topic && <Badge tone="gray">{event.topic}</Badge>}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub">
                    <span>{event.affected_department ?? "尚未指定負責部門"}</span>
                    <span>{event.event_date}</span>
                    <span>{riskLabel(event.risk)} · {event.risk}/12</span>
                  </div>
                </div>
                <GhostBtn className="group/expand transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm" onClick={() => void toggleDetails(event.risk_event_id)}>{selectedId === event.risk_event_id ? "收合" : "查看應處建議"}<ArrowRight size={13} className={cn("transition-transform duration-200 group-hover/expand:translate-x-0.5", selectedId === event.risk_event_id && "rotate-90")} /></GhostBtn>
              </div>
              <AnimatedDisclosure open={selectedId === event.risk_event_id}>
                <div className="mt-3 rounded-xl bg-canvas p-4">
                  <div className="grid gap-3 text-xs sm:grid-cols-2">
                    <div><b className="text-ink">主管機關</b><p className="mt-1 text-sub">{event.issuer}</p></div>
                    <div><b className="text-ink">預計生效日</b><p className="mt-1 text-sub">{event.effective}</p></div>
                    <div className="sm:col-span-2"><b className="text-ink">異動重點</b><p className="mt-1 whitespace-pre-wrap text-sub">{event.note}（涉及 {event.article}）</p></div>
                    <div className="sm:col-span-2"><b className="text-ink">建議下一步</b><p className="mt-1 whitespace-pre-wrap text-sub">請由{event.affected_department}確認現行作業及內規是否涵蓋本次要求，並於生效日前完成必要調整。</p></div>
                  </div>
                </div>
              </AnimatedDisclosure>
            </div>
          ))}
          {!showAll && allActionableEvents.length > actionableEvents.length && (
            <button onClick={() => setShowAll(true)} className="w-full px-5 py-3 text-center text-xs font-semibold text-brand hover:bg-canvas">
              顯示其餘 {allActionableEvents.length - actionableEvents.length} 件待處理事件
            </button>
          )}
        </div>
      ) : (
        <div className="py-10 text-center">
          <CheckCircle2 size={22} className="mx-auto text-ok" />
          <p className="mt-2 text-sm font-semibold text-navy-900">{allActionableEvents.length ? "此狀態沒有待處理事件" : "目前沒有待處理事件"}</p>
          <p className="mt-1 text-xs text-sub">{allActionableEvents.length ? "這個篩選條件目前沒有事件，請改選其他狀態。" : "已無待複核、需重新分析或處理中的法規事件。"}</p>
        </div>
      )}
    </section>
  );
}

function Trend({ events }: { events: DashboardEvent[] }) {
  const [hover, setHover] = useState<number | null>(5);
  const monthEntries = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(new Date().getFullYear(), new Date().getMonth() - 5 + index, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const value = events.filter((event) => event.event_date.slice(0, 7) === key).length;
    return { m: `${month.getMonth() + 1}月`, v: value };
  });
  const max = Math.max(...monthEntries.map((month) => month.v), 1);
  const colors = ["#7c5cfc", "#0e9fb3", "#e8890c", "#1b59f8", "#0f9d6b", "#e5484d"];
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-sub">近 6 個月 · 點選長條查看</p>
        {hover !== null && <div className="num text-right"><span className="text-3xl font-extrabold" style={{ color: colors[hover] }}>{monthEntries[hover].v}</span><span className="ml-1 text-xs text-sub">件 · {monthEntries[hover].m}</span></div>}
      </div>
      <div className="mt-4 flex flex-1 items-end gap-3" style={{ minHeight: 180 }}>
        {monthEntries.map((d, i) => (
          <button key={d.m + i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-[160px] w-full items-end rounded-xl bg-slate-50 p-0.5"><div className="w-full rounded-[10px] transition-all duration-700" style={{ height: `${(d.v / max) * 100}%`, background: colors[i], opacity: hover === i ? 1 : 0.4 }} /></div>
            <span className={cn("text-[11px]", hover === i ? "font-bold text-ink" : "text-faint")}>{d.m}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
function QaSection() {
  const { askQa } = useStore();
  const [q, setQ] = useState("");
  const send = (question: string) => {
    const trimmed = question.trim();
    if (trimmed) askQa(trimmed);
  };
  const suggestions = [
    "最近有哪些法規需要優先處理？",
    "高風險客戶審查有哪些新要求？",
    "哪些部門需要修訂內規？",
  ];
  return (
    <section aria-labelledby="qa-heading" className="group/qa relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600 p-6 text-white shadow-[0_12px_36px_rgba(11,31,69,0.16)] transition-shadow duration-300 hover:shadow-[0_18px_44px_rgba(11,31,69,0.24)] md:p-7 animate-rise">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_80%_20%,black,transparent_65%)]" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl transition-transform duration-700 group-hover/qa:scale-125" />
      <div className="relative w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold tracking-wider">法規問答助手</div>
        <h2 id="qa-heading" className="mt-3 text-xl font-extrabold md:text-2xl">有問題，直接問法規</h2>
        <p className="mt-2 text-sm text-white/70">快速查詢法規要求與影響，回答附逐條來源依據。</p>
        <form onSubmit={(event) => { event.preventDefault(); send(q); }} className="mt-5 flex w-full items-center gap-2 rounded-2xl bg-white p-2 pl-4 shadow-pop transition-shadow duration-200 focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.18)]">
          <input aria-label="輸入法規問題" value={q} onChange={(event) => setQ(event.target.value)} placeholder="輸入問題，例如：新版申訴回覆期限是多少？" className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-faint" />
          <button type="submit" disabled={!q.trim()} className="group/send inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-3.5 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1148d4] hover:shadow-lg active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"><Send size={14} />詢問</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => send(suggestion)} className="rounded-full bg-white/10 px-3.5 py-2 text-xs text-white/90 ring-1 ring-white/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:ring-white/30 active:translate-y-0">{suggestion}</button>
          ))}
        </div>
      </div>
    </section>
  );
}
const riskLabel = (score: number) => score >= 8 ? "高風險" : score >= 6 ? "中風險" : "低風險";

function ChartCarousel({ events }: { events: DashboardEvent[] }) {
  const c = useCarousel(3, 7000);
  const titles = ["法規異動趨勢", "議題分布", "風險等級組成"];
  const topicCounts = new Map<string, number>();
  for (const event of events) {
    const topic = event.topic ?? "未分類";
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }
  const topics = [...topicCounts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 6)
    .map(([label, value], i) => ({ label, value, color: ["#7c5cfc", "#0e9fb3", "#e8890c", "#1b59f8", "#0f9d6b", "#e5484d"][i] }));
  const risks = ["高風險", "中風險", "低風險"].map((label, i) => ({
    label,
    value: events.filter((event) => riskLabel(event.risk) === label).length,
    color: ["#e5484d", "#e8890c", "#0f9d6b"][i],
  }));
  return (
    <Card className="p-6" onMouseEnter={() => c.setPaused(true)} onMouseLeave={() => c.setPaused(false)}>
      <div className="flex items-center justify-between"><h3 className="text-base font-bold text-navy-900">{titles[c.i]}</h3><ArrowBtns prev={c.prev} next={c.next} /></div>
      <div key={c.i} className="mt-4 min-h-[230px] animate-rise">
        {c.i === 0 && <Trend events={events} />}
        {c.i === 1 && <div className="pt-4">{topics.length ? <HBars data={topics} /> : <p className="py-14 text-center text-sm text-sub">目前沒有議題資料</p>}</div>}
        {c.i === 2 && <div className="grid min-h-[220px] place-items-center"><Donut data={risks} center={String(events.length)} sub="筆事件" /></div>}
      </div>
      <div className="mt-3 flex justify-center"><CarouselDots n={3} i={c.i} set={c.set} /></div>
    </Card>
  );
}

const eventStatusLabel: Record<string, string> = {
  Pending: "待複核",
  InReview: "處理中",
  Reviewed: "分析完成",
  ReanalysisRequired: "需重新分析",
  Closed: "已確認",
};

function AnimatedDisclosure({ open, children }: { open: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const timeout = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">{(open || mounted) && children}</div>
    </div>
  );
}

function RegTable({
  events,
  selectedState,
  onStateChange,
}: {
  events: DashboardEvent[];
  selectedState: PolicyRiskEventState | "全部";
  onStateChange: (value: PolicyRiskEventState | "全部") => void;
}) {
  const { go, setRegId } = useStore();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("全部");
  const [risk, setRisk] = useState("全部");
  const [dept, setDept] = useState("全部");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const topics = useMemo(() => [...new Set(events.map((event) => event.topic).filter((value): value is string => Boolean(value)))], [events]);
  const departments = useMemo(() => [...new Set(events.map((event) => event.affected_department).filter((value): value is string => Boolean(value)))], [events]);
  const rows = useMemo(
    () => events.filter((event) => {
      const searchable = [event.act_name, event.topic, ...event.industry, event.affected_department, event.event_date, event.status].filter(Boolean).join(" ").toLowerCase();
      return (topic === "全部" || event.topic === topic)
        && (risk === "全部" || riskLabel(event.risk) === risk)
        && (dept === "全部" || event.affected_department?.split("、").includes(dept))
        && searchable.includes(q.trim().toLowerCase());
    }),
    [events, q, topic, risk, dept],
  );
  const per = 5, pages = Math.max(1, Math.ceil(rows.length / per));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * per, cur * per);
  const reset = () => { setQ(""); setTopic("全部"); setRisk("全部"); setDept("全部"); onStateChange("全部"); setPage(1); };
  const toggleDetail = (riskEventId: number) => setDetailId((current) => current === riskEventId ? null : riskEventId);
  return (
    <div className="py-5">
      <div className="flex animate-rise flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-extrabold text-navy-900">近期法規變動</h2><p className="mt-1 text-xs text-sub">資料來源：data.ts 示範法規資料</p></div>
        <GhostBtn onClick={reset}>清除篩選 · 共 <CountUp to={rows.length} ms={500} /> 筆</GhostBtn>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="group flex min-w-[220px] flex-1 animate-rise items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10"><Search size={15} className="text-faint transition-transform duration-300 group-focus-within:scale-110" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜尋法規名稱、主題、產業或部門" className="w-full bg-transparent outline-none" /></label>
        <div className="animate-rise" style={{ animationDelay: "60ms" }}><Select label="主題" value={topic} options={["全部", ...topics]} onChange={(v) => { setTopic(v); setPage(1); }} /></div>
        <div className="animate-rise" style={{ animationDelay: "110ms" }}><Select label="風險" value={risk} options={["全部", "高風險", "中風險", "低風險"]} onChange={(v) => { setRisk(v); setPage(1); }} /></div>
        <div className="animate-rise" style={{ animationDelay: "160ms" }}><Select label="部門" value={dept} options={["全部", ...departments]} onChange={(v) => { setDept(v); setPage(1); }} /></div>
        <div className="animate-rise" style={{ animationDelay: "210ms" }}><Select label="狀態" value={selectedState} options={["全部", "Pending", "InReview", "Reviewed", "ReanalysisRequired", "Closed"]} onChange={(v) => { onStateChange(v as PolicyRiskEventState | "全部"); setPage(1); }} /></div>
      </div>
      <div className="mt-4 animate-rise overflow-x-auto" style={{ animationDelay: "120ms" }}>
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead><tr className="bg-canvas text-[11px] font-semibold text-faint">{["法規名稱", "主題", "風險分數", "產業", "受影響部門", "發布日期", "狀態"].map((h) => <th key={h} className="px-3 py-2.5 first:rounded-l-lg last:rounded-r-lg">{h}</th>)}</tr></thead>
          <tbody key={cur}>
            {shown.map((r, index) => {
              const detailOpen = detailId === r.risk_event_id;
              return (
                <Fragment key={`${cur}-${r.risk_event_id}-${r.industry.join("-") || "no-industry"}`}>
                  <tr style={{ animationDelay: `${index * 55}ms` }} className="animate-rise border-b border-line/70 transition-colors duration-200 hover:bg-brand-soft/50">
                    <td className="px-3 py-3.5"><button type="button" onClick={() => void toggleDetail(r.risk_event_id)} className="group text-left"><div className="flex items-center gap-1.5 font-bold text-navy-900 transition-colors group-hover:text-brand">{r.act_name}<ArrowUpRight size={13} className="shrink-0 opacity-0 transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" /></div><div className="mt-0.5 text-xs text-sub transition-colors group-hover:text-brand">事件 #{r.risk_event_id} · {detailOpen ? "收合明細" : "查看明細"}</div></button></td>
                    <td className="px-3">{r.topic ? <Badge tone="gray">{r.topic}</Badge> : <span className="text-sub">未分類</span>}</td>
                    <td className="px-3"><div className="flex items-center gap-2"><RiskBadge risk={riskLabel(r.risk)} /><span className="num text-xs text-sub">{r.risk}/12</span></div></td>
                    <td className="px-3 text-xs text-sub">{r.industry.length ? r.industry.join("、") : "未指定"}</td>
                    <td className="px-3 text-xs text-sub">{r.affected_department ?? "未指定"}</td>
                    <td className="num px-3 text-sub">{r.event_date}</td>
                    <td className="px-3"><Badge tone={statusTone(eventStatusLabel[r.status] ?? r.status)}>{eventStatusLabel[r.status] ?? r.status}</Badge></td>
                  </tr>
                  <tr className={cn("bg-canvas/70 transition-colors", detailOpen ? "border-b border-line" : "border-0")}>
                    <td colSpan={7} className={detailOpen ? "px-5" : "p-0"}>
                      <AnimatedDisclosure open={detailOpen}>
                        <div className="py-4">
                            <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                              <div><b className="text-ink">主管機關</b><p className="mt-1 text-sub">{r.issuer}</p></div>
                              <div><b className="text-ink">預計生效日</b><p className="mt-1 text-sub">{r.effective}</p></div>
                              <div><b className="text-ink">受影響產業</b><p className="mt-1 text-sub">{r.industry.join("、")}</p></div>
                              <div><b className="text-ink">條文</b><p className="mt-1 text-sub">{r.article}</p></div>
                              <div className="sm:col-span-2"><b className="text-ink">異動重點</b><p className="mt-1 whitespace-pre-wrap text-sub">{r.note}</p></div>
                              <div className="sm:col-span-2"><b className="text-ink">建議因應措施</b><p className="mt-1 whitespace-pre-wrap text-sub">請由{r.affected_department}確認相關內規與作業流程，並於生效日前完成必要調整。</p></div>
                            </div>
                        </div>
                      </AnimatedDisclosure>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
            {!shown.length && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-sub">
                  {events.length === 0 ? "目前公司產業沒有示範法規資料。" : <>沒有符合條件的法規，<button onClick={reset} className="font-semibold text-brand">清除篩選</button></>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex animate-rise items-center justify-between text-xs text-sub" style={{ animationDelay: "180ms" }}>
        <span>顯示 {rows.length ? (cur - 1) * per + 1 : 0}–{Math.min(cur * per, rows.length)} 筆，共 {rows.length} 筆</span>
        <div className="flex gap-1.5">
          <GhostBtn onClick={() => setPage(Math.max(1, cur - 1))}>上一頁</GhostBtn>
          {Array.from({ length: pages }).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn("h-9 w-9 rounded-xl border text-[13px] font-semibold", cur === i + 1 ? "border-brand bg-brand-soft text-brand" : "border-line")}>{i + 1}</button>)}
          <GhostBtn onClick={() => setPage(Math.min(pages, cur + 1))}>下一頁</GhostBtn>
        </div>
      </div>
    </div>
  );
}

function Summary() {
  const { go, setRegId } = useStore();
  const alerts = HEAT_ALERTS.slice(0, 3);
  const relatedRegIds = ["REG-2026-014", "REG-2026-013", "REG-2026-006", "REG-2026-010"];
  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-extrabold text-navy-900">監理趨勢提醒</h3><p className="mt-1 text-xs text-sub">協助快速辨識近期需要留意的主題</p></div><Badge tone="brand">趨勢</Badge></div>
        <ul className="mt-4 space-y-3">
          {alerts.map((alert, index) => <li key={alert.t} className="flex gap-3 rounded-xl bg-canvas p-3"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white" style={{ background: ["#e5484d", "#7c5cfc", "#e8890c"][index] }}>{index + 1}</span><span className="text-[12px] leading-relaxed text-sub"><b className="text-ink">{alert.dept} · {alert.t}</b><br />{alert.d}</span></li>)}
        </ul>
        <GhostBtn onClick={() => go("heat")} className="mt-4 w-full justify-center">查看風險熱度<ArrowRight size={13} /></GhostBtn>
      </Card>
      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2"><Gavel size={17} className="text-brand" /><div><h3 className="text-base font-extrabold text-navy-900">裁罰案例觀察</h3><p className="mt-1 text-xs text-sub">從裁罰事由快速連到可檢視的法規要求</p></div></div>
          <Badge tone="warn">示範案例，非實際裁罰</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {PENALTIES.map((penalty, index) => (
            <div key={penalty.title} className="rounded-xl border border-line p-3.5">
              <div className="flex items-center justify-between gap-2"><Badge tone="gray">{penalty.who}</Badge><span className="text-[10px] text-faint">{penalty.date}</span></div>
              <div className="mt-2 text-[13px] font-bold text-navy-900">{penalty.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-sub">{penalty.point}</div>
              <div className="mt-3 flex items-center justify-between gap-2"><b className="text-xs" style={{ color: penalty.color }}>{penalty.fine}</b><button onClick={() => { setRegId(relatedRegIds[index]); go("impact"); }} className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline">檢視相關要求<ArrowRight size={12} /></button></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}



export default function Dashboard() {
  const { industryIds } = useStore();
  const [selectedState, setSelectedState] = useState<PolicyRiskEventState | "全部">("全部");
  const [industryScope, setIndustryScope] = useState<"company" | "all">("company");
  const companyRegIds = useMemo(() => new Set(regulationsForIndustries(industryIds).map((regulation) => regulation.id)), [industryIds]);
  const scopedEvents = useMemo(() => industryScope === "all" || !industryIds.length
    ? dashboardEvents
    : dashboardEvents.filter((event) => companyRegIds.has(event.regId)), [industryScope, industryIds.length, companyRegIds]);
  const scopedTableEvents = useMemo(() => selectedState === "全部"
    ? scopedEvents
    : scopedEvents.filter((event) => event.status === selectedState), [scopedEvents, selectedState]);
  const eventCount = useMemo(() => new Set(scopedEvents.map((event) => event.risk_event_id)).size, [scopedEvents]);
  const highRiskCount = useMemo(() => scopedEvents.filter((event) => event.risk >= 8).length, [scopedEvents]);
  const pendingCount = useMemo(() => scopedEvents.filter((event) => ["Pending", "InReview", "ReanalysisRequired"].includes(event.status)).length, [scopedEvents]);

  return (
    <>
      <PageHeader title="法規動態" sub="先處理尚未完成的監理要求，再查看近期法規異動。" className="compliance-page-header" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 size={17} className="shrink-0 text-ok" />
          <span className="font-semibold">示範法規資料 · {eventCount} 筆</span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-sub">法規範圍</span>
          <Segmented value={industryScope} onChange={setIndustryScope} options={[
            { v: "company", label: "本公司產業" },
            { v: "all", label: "全部產業" },
          ]} />
          {industryScope === "company" && <span className="text-[10px] text-faint">{INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、")}</span>}
        </div>
      </div>
      <section aria-label="監理事件摘要" className="grid grid-cols-3 divide-x divide-line border-y border-line py-5">
        {[
          {
            label: "待處理",
            value: pendingCount,
            tone: "text-warn",
            color: "#e8890c",
            detail: "需要後續追蹤",
            ratio: eventCount ? Math.min(100, (pendingCount / eventCount) * 100) : 0,
          },
          {
            label: "高風險",
            value: highRiskCount,
            tone: "text-danger",
            color: "#e5484d",
            detail: eventCount ? `占監理事件 ${Math.round((highRiskCount / eventCount) * 100)}%` : "需優先檢視",
            ratio: eventCount ? Math.min(100, (highRiskCount / eventCount) * 100) : 0,
          },
          {
            label: "監理事件",
            value: eventCount,
            tone: "text-brand",
              color: "#1b59f8",
              detail: "目前追蹤中的事件總數",
              ratio: eventCount ? 100 : 0,
          },
          ].map((item) => (
            <div key={item.label} className="px-4 first:pl-0 sm:px-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-sub"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</div>
              <div className={cn("num mt-1 text-4xl font-extrabold leading-none tracking-tight transition-transform duration-300 hover:scale-105 sm:text-5xl", item.tone)}>
                <CountUp to={item.value} ms={1500} />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/80" aria-hidden="true">
                <div className="h-full rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${item.ratio}%`, backgroundColor: item.color }} />
              </div>
              <div className="mt-2 truncate text-[11px] text-sub sm:text-xs">
              {item.detail}
            </div>
          </div>
        ))}
      </section>
      <QaSection />
      <ActionQueue events={scopedEvents} />
      <section aria-label="近期法規事件">
        <Card className="mt-3 px-4 md:px-6">
          <RegTable
            events={scopedTableEvents}
            selectedState={selectedState}
            onStateChange={setSelectedState}
          />
        </Card>
      </section>
    </>
  );
}
