import { useMemo, useState } from "react";
import { Building2, CheckCircle2, ClipboardList, Download, FileStack, Plus, Sparkles, Target } from "lucide-react";
import { DEPTS, IMPACT_CONF, MEASURES, RULES } from "../data";
import { ArrowBtns, Badge, Bar, Card, CarouselDots, CountUp, GhostBtn, Notice, PageHeader, PrimaryBtn, RegBar, Segmented, cn, useCarousel } from "../ui";
import { useStore } from "../store";

function Gauge({ v }: { v: number }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-36 w-36 place-items-center">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#eef1f8" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="url(#g)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset 1s ease" }} />
        <defs><linearGradient id="g" x1="0" x2="1"><stop stopColor="#7c5cfc" /><stop offset="1" stopColor="#1b59f8" /></linearGradient></defs>
      </svg>
      <div className="absolute text-center"><div className="num text-4xl font-extrabold text-navy-900"><CountUp to={v} suffix="%" /></div><div className="text-[11px] text-sub">AI 信心</div></div>
    </div>
  );
}

const lvColor = { 高影響: "#e5484d", 中影響: "#e8890c", 低影響: "#0f9d6b" };

export default function Impact() {
  const { reg, go, toast, setTasks } = useStore();
  const [lv, setLv] = useState<"全部" | "高影響" | "中影響" | "低影響">("全部");
  const [dept, setDept] = useState("全部");
  const [open, setOpen] = useState<string | null>(RULES[0].code);
  const [added, setAdded] = useState<string[]>([]);
  const c = useCarousel(MEASURES.length, 6000);

  const rules = useMemo(() => RULES.filter((r) => (lv === "全部" || r.level === lv) && (dept === "全部" || r.dept.includes(dept))), [lv, dept]);
  const conf = Math.round(IMPACT_CONF.reduce((n, x) => n + x.v, 0) / IMPACT_CONF.length) + 2;
  const deptCount = DEPTS.slice(0, 4).map((d, i) => ({ d, n: [3, 2, 2, 2][i], color: ["#1b59f8", "#7c5cfc", "#0e9fb3", "#e8890c"][i] }));

  const createTask = (t: (typeof MEASURES)[number]) => {
    if (added.includes(t.t)) return;
    setAdded([...added, t.t]);
    setTasks((x) => [...x, { id: "T-" + (200 + x.length), title: t.t, desc: t.d, pri: t.pri === "高" ? "高優先" : t.pri === "中" ? "中優先" : "低優先", topic: reg.topic, ref: "第 8 條", owner: "林怡君", dept: t.owner, due: t.due.slice(5).replace("/", "/"), col: "todo" }]);
    toast("已建立任務，可至待辦看板查看");
  };

  const stats = [
    { l: "受影響內規", n: rules.length, p: 2, c: "#1b59f8", icon: FileStack, s: `${rules.filter((r) => r.level === "高影響").length} 件需優先修訂` },
    { l: "受影響部門", n: 4, p: 2, c: "#7c5cfc", icon: Building2, s: "營運、法遵、資訊、風控" },
    { l: "建議因應措施", n: MEASURES.length, p: 2, c: "#e8890c", icon: Target, s: "已建立 " + added.length + " 件任務 · 其餘待確認" },
  ];

  return (
    <>
      <PageHeader title="影響分析" sub="擷取法規異動與內部制度的差距，找出責任部門並形成可執行的因應措施。" action={<PrimaryBtn onClick={() => { MEASURES.forEach(createTask); }}><Plus size={16} />建立因應任務</PrimaryBtn>} />
      <Notice />
      <RegBar />

      <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_1fr_1fr_1.15fr]">
        {stats.map((s) => (
          <div key={s.l} className="flex items-start gap-4 lg:border-r lg:border-line lg:pr-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white" style={{ background: s.c }}><s.icon size={20} /></span>
            <div><div className="text-xs font-semibold text-sub">{s.l}</div><div className="num text-5xl font-extrabold leading-tight" style={{ color: s.c }}><CountUp to={s.n} pad={2} /></div><div className="text-xs text-sub">{s.s}</div></div>
          </div>
        ))}
        <div className="flex items-center gap-4">
          <Gauge v={conf} />
          <div className="flex-1 space-y-2">
            {IMPACT_CONF.map((x) => <div key={x.label}><div className="mb-1 flex justify-between text-[11px] text-sub"><span>{x.label}</span><b className="num text-ink">{x.v}%</b></div><Bar value={x.v} h="h-1.5" color="linear-gradient(90deg,#7c5cfc,#1b59f8)" /></div>)}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-extrabold text-navy-900">受影響內規清單</h2><p className="mt-1 text-xs text-sub">以條文依據逐項對照，點選內規可展開完整比對</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={lv} onChange={setLv} options={(["全部", "高影響", "中影響", "低影響"] as const).map((v) => ({ v, label: v }))} />
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-xl border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"><option value="全部">部門：全部</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select>
            <GhostBtn onClick={() => toast("已匯出影響分析（示範）")}><Download size={14} />匯出分析</GhostBtn>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {rules.map((r) => {
            const on = open === r.code;
            return (
              <div key={r.code} className={cn("overflow-hidden rounded-2xl border transition", on ? "border-brand/40 bg-brand-soft/30" : "border-line")}>
                <button onClick={() => setOpen(on ? null : r.code)} className="flex w-full items-center gap-4 p-4 text-left">
                  <span className="h-12 w-1.5 shrink-0 rounded-full" style={{ background: lvColor[r.level] }} />
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-brand">{r.name} ↗</span><span className="text-xs text-sub">{r.code} · {r.clauses}</span></span>
                  <span className="hidden w-52 text-xs text-sub md:block">{r.dept}</span>
                  <span className="hidden w-20 text-xs font-semibold text-brand md:block">{r.basis} ↗</span>
                  <Badge tone={r.level === "高影響" ? "danger" : r.level === "中影響" ? "warn" : "ok"}>{r.level}</Badge>
                </button>
                {on && (
                  <div className="grid gap-4 border-t border-line/70 p-4 pt-4 text-[13px] animate-rise md:grid-cols-[1fr_auto]">
                    <div><div className="text-[11px] font-semibold text-faint">影響理由</div><p className="mt-1 leading-relaxed">{r.reason}</p></div>
                    <div className="flex gap-2"><GhostBtn onClick={() => go("diff")}>查看條文</GhostBtn><GhostBtn onClick={() => go("review")}>送複核</GhostBtn></div>
                  </div>
                )}
              </div>
            );
          })}
          {!rules.length && <div className="rounded-2xl border border-dashed border-line py-10 text-center text-sm text-sub">沒有符合篩選的內規</div>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6" onMouseEnter={() => c.setPaused(true)} onMouseLeave={() => c.setPaused(false)}>
          <div className="flex items-start justify-between">
            <div><h3 className="text-lg font-extrabold text-navy-900">改善建議與因應措施</h3><p className="mt-1 text-xs text-sub">AI 建議方案，請權責部門確認可行性</p></div>
            <Badge tone="brand"><Sparkles size={11} />{MEASURES.length} 項優先措施</Badge>
          </div>
          <div className="mt-5 overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${c.i * 100}%)` }}>
              {MEASURES.map((m, i) => (
                <div key={m.t} className="w-full shrink-0 pr-1">
                  <div className="rounded-2xl p-5" style={{ background: ["#eef3ff", "#f0ecff", "#e2f6f9", "#fff4e0"][i] }}>
                    <div className="flex items-center justify-between"><span className="num font-mono text-xs font-semibold text-sub">措施 0{i + 1}</span><Badge tone={m.pri === "高" ? "danger" : m.pri === "中" ? "warn" : "ok"}>{m.pri}優先</Badge></div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-bold text-navy-900"><CheckCircle2 size={20} className="text-brand" />{m.t}</div>
                    <p className="mt-2 text-[13px] leading-relaxed text-sub">{m.d}</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sub"><span>{m.owner} · 建議期限 {m.due}（示範）</span>
                      <button onClick={() => createTask(m)} disabled={added.includes(m.t)} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition", added.includes(m.t) ? "bg-ok-soft text-ok" : "bg-brand text-white hover:-translate-y-0.5")}>{added.includes(m.t) ? "已建立任務" : "建立任務 →"}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between"><CarouselDots n={MEASURES.length} i={c.i} set={c.set} /><ArrowBtns prev={c.prev} next={c.next} /></div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-extrabold text-navy-900">部門影響分布</h3>
          <p className="mt-1 text-xs text-sub">內規關聯數量 · 非風險評分</p>
          <div className="mt-5 space-y-4">
            {deptCount.map((d) => <div key={d.d}><div className="mb-1.5 flex justify-between text-[13px]"><b>{d.d}</b><span className="num font-bold" style={{ color: d.color }}>{d.n} 件</span></div><Bar value={(d.n / 3) * 100} color={d.color} h="h-2.5" /></div>)}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-sub">同一內規可同時關聯多個部門，作數不等於不同部門的負擔。</p>
          <GhostBtn onClick={() => go("heat")} className="mt-4"><ClipboardList size={14} />查看風險熱度圖</GhostBtn>
        </Card>
      </div>
    </>
  );
}
