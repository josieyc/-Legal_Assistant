import { useMemo, useRef, useState } from "react";
import { ArrowBtns } from "../ui";
import { AlertTriangle, ArrowRight, Download, User } from "lucide-react";
import { DEPTS, HEAT_ALERTS, HEAT_PERIODS, HEAT_SOURCES, REGS, TOPICS, heatMatrix, scoreTone } from "../data";
import { Badge, Bar, Card, GhostBtn, PageHeader, PrimaryBtn, RiskBadge, Select, cn } from "../ui";
import { useStore } from "../store";

const LEVELS = [
  { k: "低", range: "1–3", bg: "#eaf0fa" },
  { k: "中", range: "4–5", bg: "#f8dfb2" },
  { k: "偏高", range: "6–7", bg: "#efb162" },
  { k: "高", range: "8–10", bg: "#d85c63" },
];
const OWNERS: Record<string, string> = { 營運部: "王志明", 法遵部: "林怡君", 資訊部: "李承翰", 風控部: "張世文", 客服部: "陳雅婷", 授信部: "黃淑芬" };

function reasonsFor(dept: string, topic: string, score: number) {
  const hi = score >= 8, mid = score >= 6;
  return [
    { t: `${topic}法規近期修訂，直接影響${dept}作業`, w: hi ? 40 : mid ? 30 : 15, c: "#e5484d" },
    { t: `關聯內規 ${hi ? 3 : mid ? 2 : 1} 項尚未完成對照修訂`, w: hi ? 35 : mid ? 28 : 12, c: "#e8890c" },
    { t: `近 90 天有 ${hi ? 2 : mid ? 1 : 0} 起同業裁罰案例可參照`, w: hi ? 25 : mid ? 18 : 6, c: "#7c5cfc" },
  ];
}

const EXTRA_ALERTS = [
  { dept: "授信部", topic: "授信管理", level: "需注意", t: "關係人交易檢核欄位待補", d: "授信申請表需新增關係人檢核欄位，並與風控部確認授權額度。" },
  { dept: "法遵部", topic: "個資保護", level: "需注意", t: "個資告知事項需同步更新", d: "官網與申請書的告知文字須於生效前改版，並保留版本紀錄。" },
  { dept: "風控部", topic: "防制洗錢", level: "高風險", t: "跨境匯款申報門檻調整", d: "確認監控系統門檻參數與例外簽核流程，安排上線前測試。" },
];

export default function Heat() {
  const scroller = useRef<HTMLDivElement>(null);
  const { go, toast, setRegId } = useStore();
  const [period, setPeriod] = useState(HEAT_PERIODS[0]);
  const [dept, setDept] = useState("全部");
  const [source, setSource] = useState(HEAT_SOURCES[0]);
  const [levels, setLevels] = useState<string[]>(["低", "中", "偏高", "高"]);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [hov, setHov] = useState<[number, number] | null>(null);

  const m = useMemo(() => heatMatrix(HEAT_PERIODS.indexOf(period), HEAT_SOURCES.indexOf(source)), [period, source]);
  const rows = DEPTS.map((d, i) => ({ d, i })).filter((r) => dept === "全部" || r.d === dept);
  const flat = m.flat();
  const hiCount = flat.filter((v) => v >= 8).length;
  const [si, sj] = rows.some((r) => r.i === sel[0]) ? sel : [rows[0].i, 0];
  const score = m[si][sj];
  const tone = scoreTone(score);
  const rel = REGS.filter((r) => r.topic === TOPICS[sj]);
  const reasons = reasonsFor(DEPTS[si], TOPICS[sj], score);

  const toggle = (k: string) => setLevels(levels.includes(k) ? levels.filter((x) => x !== k) : [...levels, k]);

  return (
    <>
      <PageHeader title="風險熱度圖" sub="用部門 × 主題矩陣掌握風險集中處，讓管理資源優先投入關鍵影響。" action={<PrimaryBtn onClick={() => toast("已匯出風險報表（示範）")}><Download size={16} />匯出風險報表</PrimaryBtn>} />
      <div className="flex flex-wrap items-center gap-3">
        <Select label="期間" value={period} options={HEAT_PERIODS} onChange={setPeriod} />
        <Select label="部門" value={dept} options={["全部", ...DEPTS]} onChange={setDept} />
        <Select label="風險來源" value={source} options={HEAT_SOURCES} onChange={setSource} />
        <span className="ml-auto text-xs text-sub">24 件異動 · 6 個部門 · 5 個主題 · <b className="text-danger">{hiCount} 格高風險</b></span>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
        <Card className="p-6">
          <div className="flex items-start justify-between"><div><h2 className="text-lg font-extrabold text-navy-900">部門風險熱度矩陣</h2><p className="mt-1 text-xs text-sub">綜合評分 1–10，點選任一格查看原因與建議</p></div><Badge tone="brand">AI 初步評估</Badge></div>
          <div className="mt-5 overflow-x-auto">
            <div className="grid min-w-[560px] gap-2" style={{ gridTemplateColumns: "72px repeat(5, 1fr)" }}>
              <div />
              {TOPICS.map((t, j) => <div key={t} className={cn("pb-1 text-center text-xs font-semibold transition", sj === j ? "text-brand" : "text-sub")}>{t}</div>)}
              {rows.map(({ d, i }) => (
                <div key={d} className="contents">
                  <div className={cn("flex items-center text-[13px] font-bold transition", si === i ? "text-brand" : "text-navy-900")}>{d}</div>
                  {m[i].map((v, j) => {
                    const t = scoreTone(v);
                    const on = levels.includes(t.label);
                    const selected = si === i && sj === j;
                    return (
                      <button key={j} onClick={() => setSel([i, j])} onMouseEnter={() => setHov([i, j])} onMouseLeave={() => setHov(null)}
                        className={cn("num relative h-[68px] rounded-xl text-2xl font-bold transition-all duration-200", selected && "z-10 scale-[1.06] ring-[3px] ring-brand ring-offset-2", !selected && on && "hover:scale-105 hover:shadow-lg", !on && "opacity-20 grayscale")}
                        style={{ background: t.bg, color: t.fg }}>
                        {v}
                        {hov && hov[0] === i && hov[1] === j && on && <span className="absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-900 px-2 py-1 text-[11px] font-medium text-white shadow-pop">{TOPICS[j]} · {t.label}風險</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-sub">
            <span>已選取：<b className="text-ink">{DEPTS[si]} × {TOPICS[sj]}</b></span>
            <div className="flex items-center gap-2">
              <span>點選圖例篩選：</span>
              {LEVELS.map((l) => (
                <button key={l.k} onClick={() => toggle(l.k)} className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition", levels.includes(l.k) ? "border-line bg-white" : "border-transparent bg-slate-100 opacity-50 line-through")}>
                  <i className="h-3 w-3 rounded" style={{ background: l.bg }} />{l.k} {l.range}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-faint">評估依據：異動重要性 40% + 內規落差 35% + 裁罰關聯 25%，分數為示範結果，需主管複核後確認採用。</p>
        </Card>

        <Card key={`${si}-${sj}`} className="p-6 animate-rise">
          <div className="flex items-start justify-between"><div><h3 className="text-[15px] font-bold text-navy-900">{score >= 8 ? "最高影響焦點" : "格位詳細資料"}</h3><p className="mt-0.5 text-xs text-sub">{DEPTS[si]} × {TOPICS[sj]}</p></div><AlertTriangle size={18} style={{ color: tone.bg }} /></div>
          <div className="mt-4 flex items-end gap-3"><span className="num text-6xl font-extrabold leading-none" style={{ color: score >= 8 ? "#d85c63" : score >= 6 ? "#d9871a" : "#5b6780" }}>{score}.0</span><RiskBadge risk={score >= 8 ? "高風險" : score >= 6 ? "中風險" : "低風險"} /><span className="pb-1 text-xs text-sub">{score >= 6 ? "需優先處理" : "持續觀察"}</span></div>
          <div className="mt-5 space-y-3">
            <div className="text-xs font-bold text-navy-900">風險成因</div>
            {reasons.map((r) => <div key={r.t}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{r.t}</span><b className="num" style={{ color: r.c }}>{r.w}%</b></div><Bar value={r.w * 2.4} color={r.c} h="h-1.5" /></div>)}
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <div className="text-xs font-bold text-navy-900">關聯事項</div>
            <ul className="mt-2 space-y-1.5 text-xs text-sub">
              {rel.length ? rel.slice(0, 3).map((r) => <li key={r.id}><button onClick={() => { setRegId(r.id); go("impact"); }} className="text-left hover:text-brand">• {r.name} <ArrowRight size={10} className="inline" /></button></li>) : <li>• 目前無直接關聯法規</li>}
              <li>• {score >= 8 ? 3 : 1} 個內規版本待調整</li>
            </ul>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-sub"><User size={14} className="text-brand" />{DEPTS[si]} · {OWNERS[DEPTS[si]]}</div>
          <PrimaryBtn onClick={() => go("impact")} className="mt-4 w-full justify-center">查看影響與措施</PrimaryBtn>
        </Card>
      </div>

      {/* <Card className="p-6">
        <div className="flex items-start justify-between"><div><h3 className="text-lg font-extrabold text-navy-900">風險提醒與注意事項</h3><p className="mt-1 text-xs text-sub">將高風險格轉換為可採取的行動，供決策判定</p></div><GhostBtn onClick={() => go("kanban")}>全部提醒 →</GhostBtn></div>
        <div className="mt-1 flex justify-end gap-2"><ArrowBtns prev={() => scroller.current?.scrollBy({ left: -340, behavior: "smooth" })} next={() => scroller.current?.scrollBy({ left: 340, behavior: "smooth" })} /></div>
        <div ref={scroller} className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {[...HEAT_ALERTS, ...EXTRA_ALERTS].map((a, i) => (
            <div key={a.t} className="group w-[320px] shrink-0 snap-start rounded-2xl border border-line p-4 transition hover:-translate-y-1 hover:shadow-tile" >
              <div className="flex items-center justify-between text-[11px] text-sub"><span>{a.dept} · {a.topic}</span><Badge tone={i < 2 ? "danger" : "warn"}>{a.level}</Badge></div>
              <div className="mt-2 text-sm font-bold text-navy-900">{a.t}</div>
              <p className="mt-1.5 text-xs leading-relaxed text-sub">{a.d}</p>
              <button onClick={() => { setSel([DEPTS.indexOf(a.dept), TOPICS.indexOf(a.topic)]); window.scrollTo(0, 0); document.getElementById("main-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-3 text-xs font-semibold text-brand">在熱度圖定位 →</button>
            </div>
          ))}
        </div>
      </Card> */}
    </>
  );
}
