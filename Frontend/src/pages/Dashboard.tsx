import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Download, FileText, Gavel, Search, Send, Sparkles } from "lucide-react";
import { HEAT_ALERTS, MONTHLY, PENALTIES, REGS, SUGGESTS, TOPICS, DEPTS } from "../data";
import { ArrowBtns, Badge, Card, CarouselDots, CountUp, GhostBtn, Marquee, PageHeader, PrimaryBtn, RiskBadge, Select, cn, statusTone, useCarousel } from "../ui";
import { useStore } from "../store";
import { Donut, HBars } from "../charts";

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

function Stats() {
  const { go } = useStore();
  const items = [
    { label: "本月法規異動", n: 24, pad: 0, sub: "較上月 +6 件 · 已解析 24 件", color: "#1b59f8", pts: [4, 6, 5, 9, 8, 12, 14, 18, 24], to: "diff" as const },
    { label: "需優先關注", n: 6, pad: 2, sub: "高風險異動 · 涉及 4 個部門", color: "#e5484d", pts: [2, 3, 2, 4, 3, 5, 4, 6, 6], to: "heat" as const },
    { label: "待辦事項", n: 8, pad: 2, sub: "其中 2 件將於 7 日內到期", color: "#e8890c", pts: [5, 7, 6, 9, 8, 7, 9, 8, 8], to: "kanban" as const },
    { label: "因應完成率", n: 78, pad: 0, suffix: "%", sub: "已完成 28 / 36 項因應措施", color: "#0f9d6b", pts: [40, 48, 52, 58, 61, 66, 70, 75, 78], to: "impact" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-4">
      {items.map((s, i) => (
        <button key={s.label} onClick={() => go(s.to)} className={cn("group relative px-2 text-left lg:px-7 animate-rise", i > 0 && "lg:border-l lg:border-line", i % 2 === 1 && "border-l border-line lg:border-l")} style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-sub"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}<ArrowUpRight size={14} className="ml-auto text-faint opacity-0 transition group-hover:opacity-100" /></div>
          <div className="num mt-2 flex items-baseline text-[64px] font-extrabold leading-none" style={{ color: s.color }}>
            <CountUp to={s.n} pad={s.pad} suffix={s.suffix} />
          </div>
          <div className="mt-3"><Spark pts={s.pts} color={s.color} /></div>
          <div className="mt-2 text-xs text-sub">{s.sub}</div>
        </button>
      ))}
    </div>
  );
}

function Spotlight() {
  const { go, setRegId } = useStore();
  const list = REGS.filter((r) => r.risk !== "低風險").slice(0, 5);
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

function Trend() {
  const [hover, setHover] = useState<number | null>(5);
  const max = 28;
  const colors = ["#7c5cfc", "#0e9fb3", "#e8890c", "#1b59f8", "#0f9d6b", "#e5484d"];
  return (
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-sub">近 6 個月 · 點選長條查看</p>
        {hover !== null && <div className="num text-right"><span className="text-3xl font-extrabold" style={{ color: colors[hover] }}>{MONTHLY[hover].v}</span><span className="ml-1 text-xs text-sub">件 · {MONTHLY[hover].m}</span></div>}
      </div>
      <div className="mt-4 flex flex-1 items-end gap-3" style={{ minHeight: 180 }}>
        {MONTHLY.map((d, i) => (
          <button key={d.m} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
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
  const send = (t: string) => t.trim() && askQa(t.trim());
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600 p-7 text-white animate-rise">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_80%_20%,black,transparent_65%)]" />
      <div className="relative gap-6  lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold tracking-wider"><Sparkles size={12} />法規問答助手</div>
          <h3 className="mt-3 text-2xl font-extrabold">有問題，直接問法規</h3>
          <p className="mt-2 text-sm text-white/70">限定您選擇的法規範圍回答，每個答案皆附逐條來源。</p>
          <div className="mt-4 mb-4 grid grid-cols-3 gap-4 text-center">
            {[["12", "示範文件"], ["98%", "引用準確率"], ["<3s", "平均回覆"]].map(([n, l]) => <div key={l} className="rounded-xl bg-white/8 py-2.5"><div className="num text-xl font-extrabold">{n}</div><div className="text-[11px] text-white/60">{l}</div></div>)}
          </div>
        </div>
        <div>
          <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex items-center gap-2 rounded-2xl bg-white p-2 pl-5 shadow-pop">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="例如：新版對高風險客戶的審查有何新要求？" className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
            <button className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white transition hover:scale-105"><Send size={17} /></button>
          </form>
          <Marquee className="mt-4 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]">
            {[...SUGGESTS, "裁罰案例有哪些重點？", "哪些部門受影響？"].map((s) => <button key={s} type="button" onClick={() => send(s)} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-xs ring-1 ring-white/15 transition hover:bg-white/25">{s}</button>)}
          </Marquee>
        </div>
      </div>
    </div>
  );
}
function ChartCarousel() {
  const c = useCarousel(3, 7000);
  const titles = ["法規異動趨勢", "議題分布", "風險等級組成"];
  const topics = TOPICS.map((t, i) => ({ label: t, value: REGS.filter((r) => r.topic === t).length || 1 + (i % 3), color: ["#7c5cfc", "#0e9fb3", "#e8890c", "#1b59f8", "#0f9d6b", "#e5484d", "#163a7a"][i % 7] })).slice(0, 6);
  const risks = ["高風險", "中風險", "低風險"].map((k, i) => ({ label: k, value: REGS.filter((r) => r.risk === k).length, color: ["#e5484d", "#e8890c", "#0f9d6b"][i] }));
  return (
    <Card className="p-6" onMouseEnter={() => c.setPaused(true)} onMouseLeave={() => c.setPaused(false)}>
      <div className="flex items-center justify-between"><h3 className="text-base font-bold text-navy-900">{titles[c.i]}</h3><ArrowBtns prev={c.prev} next={c.next} /></div>
      <div key={c.i} className="mt-4 min-h-[230px] animate-rise">
        {c.i === 0 && <Trend />}
        {c.i === 1 && <div className="pt-4"><HBars data={topics} /></div>}
        {c.i === 2 && <div className="grid min-h-[220px] place-items-center"><Donut data={risks} center={String(REGS.length)} sub="項法規" /></div>}
      </div>
      <div className="mt-3 flex justify-center"><CarouselDots n={3} i={c.i} set={c.set} /></div>
    </Card>
  );
}

function RegTable() {
  const { go, setRegId } = useStore();
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("全部");
  const [risk, setRisk] = useState("全部");
  const [dept, setDept] = useState("全部");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => REGS.filter((r) => (topic === "全部" || r.topic === topic) && (risk === "全部" || r.risk === risk) && (dept === "全部" || r.depts.some((d) => dept.startsWith(d))) && (r.name + r.note + r.id).includes(q)), [q, topic, risk, dept]);
  const per = 5, pages = Math.max(1, Math.ceil(rows.length / per));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * per, cur * per);
  const reset = () => { setQ(""); setTopic("全部"); setRisk("全部"); setDept("全部"); setPage(1); };
  return (
    <Card className="p-6 animate-rise">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-extrabold text-navy-900">近期法規變動</h2><p className="mt-1 text-xs text-sub">示範追蹤期間：2026/10/01 – 2026/10/12</p></div>
        <GhostBtn onClick={reset}>清除篩選 · 共 {rows.length} 件</GhostBtn>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10"><Search size={15} className="text-faint" /><input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="搜尋法規名稱或條文關鍵字" className="w-full bg-transparent outline-none" /></label>
        <Select label="主題" value={topic} options={["全部", ...TOPICS]} onChange={(v) => { setTopic(v); setPage(1); }} />
        <Select label="風險" value={risk} options={["全部", "高風險", "中風險", "低風險"]} onChange={(v) => { setRisk(v); setPage(1); }} />
        <Select label="部門" value={dept} options={["全部", ...DEPTS]} onChange={(v) => { setDept(v); setPage(1); }} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead><tr className="bg-canvas text-[11px] font-semibold text-faint">{["法規名稱 / 異動重點", "主題", "風險", "受影響部門", "發布", "狀態", ""].map((h) => <th key={h} className="px-3 py-2.5 first:rounded-l-lg last:rounded-r-lg">{h}</th>)}</tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="group border-b border-line/70 transition hover:bg-brand-soft/50">
                <td className="px-3 py-3.5"><div className="font-bold text-navy-900">{r.name}</div><div className="mt-0.5 text-xs text-sub">{r.article} · {r.note}</div></td>
                <td className="px-3"><Badge tone="gray">{r.topic}</Badge></td>
                <td className="px-3"><RiskBadge risk={r.risk} /></td>
                <td className="px-3 text-xs text-sub">{r.depts.join("、")}</td>
                <td className="num px-3 text-sub">{r.date}</td>
                <td className="px-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td className="px-3 text-right"><button onClick={() => { setRegId(r.id); go("diff"); }} className="inline-flex items-center gap-1 text-xs font-semibold text-brand group-hover:underline">對照 <ArrowRight size={12} /></button></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="py-12 text-center text-sm text-sub">沒有符合條件的法規，<button onClick={reset} className="font-semibold text-brand">清除篩選</button></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-sub">
        <span>顯示 {rows.length ? (cur - 1) * per + 1 : 0}–{Math.min(cur * per, rows.length)} 筆，共 {rows.length} 筆示範資料</span>
        <div className="flex gap-1.5">
          <GhostBtn onClick={() => setPage(Math.max(1, cur - 1))}>上一頁</GhostBtn>
          {Array.from({ length: pages }).map((_, i) => <button key={i} onClick={() => setPage(i + 1)} className={cn("h-9 w-9 rounded-xl border text-[13px] font-semibold", cur === i + 1 ? "border-brand bg-brand-soft text-brand" : "border-line")}>{i + 1}</button>)}
          <GhostBtn onClick={() => setPage(Math.min(pages, cur + 1))}>下一頁</GhostBtn>
        </div>
      </div>
    </Card>
  );
}

function Summary() {
  const { toast, go } = useStore();
  const c = useCarousel(PENALTIES.length, 4500);
  const p = PENALTIES[c.i];
  const alerts = HEAT_ALERTS;
  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <Card className="p-6 animate-rise">
        <div className="flex items-start justify-between"><div><h3 className="text-lg font-extrabold text-navy-900">管理摘要</h3><p className="mt-1 text-xs text-sub">示範報告 · 2026 年 10 月 · 法遵主管視角</p></div></div>
        <div className="mt-4 flex items-start gap-3 rounded-xl bg-gradient-to-r from-brand-soft to-violet-soft p-4 text-sm font-semibold text-navy-900"><Sparkles size={18} className="mt-0.5 shrink-0 text-brand" />本月優先補強洗錢防制與消費者保護；建議於示範生效日前完成 3 項關鍵措施。</div>
        <ul className="mt-4 space-y-2.5 text-[13px] text-sub">
          {alerts.map((a, i) => <li key={i} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ["#e5484d", "#7c5cfc", "#e8890c"][i] }} /><span><b className="text-ink">{a.dept} · {a.t}。</b>{a.d}</span></li>)}
        </ul>
        <div className="mt-5 flex items-center justify-between border-t border-line pt-4"><span className="text-xs text-faint">待主管複核 · 尚未發布</span><GhostBtn onClick={() => { go("review"); toast("前往複核頁面"); }}><FileText size={14} />閱讀完整摘要</GhostBtn></div>
      </Card>
      <Card className="flex flex-col p-6 animate-rise" onMouseEnter={() => c.setPaused(true)} onMouseLeave={() => c.setPaused(false)}>
        <div className="flex items-start justify-between"><div><h3 className="text-lg font-extrabold text-navy-900">金管會裁罰案例摘要</h3><p className="mt-1 text-xs text-sub">以下為虛構示範案例，非金管會實際裁罰</p></div><Gavel size={18} className="text-brand" /></div>
        <div key={c.i} className="mt-4 flex-1 animate-rise rounded-2xl p-4" style={{ background: p.color + "14" }}>
          <div className="flex items-center justify-between"><Badge className="text-white" tone="gray"><span style={{ color: p.color }}>{p.who}</span></Badge><span className="num text-xs text-sub">{p.date}</span></div>
          <div className="mt-2 text-[15px] font-bold text-navy-900">{p.title}</div>
          <div className="num mt-3 text-2xl font-extrabold" style={{ color: p.color }}>{p.fine}</div>
          <div className="mt-2 text-xs text-sub">{p.point}</div>
        </div>
        <div className="mt-4 flex items-center justify-between"><CarouselDots n={PENALTIES.length} i={c.i} set={c.set} /><ArrowBtns prev={c.prev} next={c.next} /></div>
      </Card>
    </div>
  );
}



export default function Dashboard() {
  const { toast } = useStore();
  return (
    <>
      <PageHeader title="法規動態" sub="掌握監理變動，從重點解析到落實因應，一站式管理法遵工作。" action={<PrimaryBtn onClick={() => toast("已匯出管理摘要（示範）")}><Download size={16} />匯出管理摘要</PrimaryBtn>} />
      <div className="py-4"><Stats /></div>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]"><Spotlight /><ChartCarousel /></div>
      <QaSection />
      <RegTable />
      <Summary />  
    </>
  );
}
