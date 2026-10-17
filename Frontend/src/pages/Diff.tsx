import { useMemo, useRef, useState } from "react";
import { ArrowBtns, CarouselDots, useCarousel } from "../ui";
import { ArrowRight, ClipboardList, Eye, EyeOff, Sparkles } from "lucide-react";
import { DIFF_DATA, DIFF_INSIGHTS, type Seg } from "../data";
import { Badge, Card, GhostBtn, Notice, PageHeader, PrimaryBtn, RegBar, Segmented, Select, cn } from "../ui";
import { useStore } from "../store";

function Para({ segs, side }: { segs: Seg[]; side: "old" | "new" }) {
  return (
    <p className="leading-relaxed">
      {segs.map((s, i) =>
        s.k === "del" ? <mark key={i} className="rounded bg-danger-soft px-1 font-bold text-danger decoration-danger/60 [text-decoration-line:line-through]">{s.t}</mark>
        : s.k === "add" ? <mark key={i} className="rounded bg-ok-soft px-1 font-bold text-ok">{s.t}</mark>
        : <span key={i}>{s.t}</span>,
      )}
    </p>
  );
}

export default function Diff() {
  const ic = useCarousel(DIFF_INSIGHTS.length, 6000);
  const { reg, go, toast } = useStore();
  const [from, setFrom] = useState("第 8 條");
  const [to, setTo] = useState("第 16 條");
  const [oldV, setOldV] = useState("舊版：2025/06/01（示範）");
  const [newV, setNewV] = useState("新版：2026/10/12（示範）");
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [mode, setMode] = useState<"side" | "merge">("side");
  const [active, setActive] = useState<number | null>(null);
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  const nos = DIFF_DATA.map((d) => `第 ${d.no} 條`);
  const a = nos.indexOf(from), b = nos.indexOf(to);
  const lo = Math.min(a, b), hi = Math.max(a, b);
  const list = useMemo(() => DIFF_DATA.filter((_, i) => i >= lo && i <= hi), [lo, hi]);
  const count = (k: "add" | "del") => list.reduce((n, d) => n + (k === "add" ? d.newSeg : d.oldSeg).flat().filter((s) => s.k === k).length, 0);

  const jump = (no: number) => { setActive(no); refs.current[no]?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => setActive(null), 1800); };

  return (
    <>
      <PageHeader title="差異對照" sub="逐條辨識新舊版差異，快速理解法規修訂的核心要求。" action={<PrimaryBtn onClick={() => go("impact")}><ArrowRight size={16} />前往影響分析</PrimaryBtn>} />
      <Notice />
      <RegBar />
      <div className="flex flex-wrap items-center gap-3">
        <Select label="舊版" value={oldV} options={["舊版：2025/06/01（示範）", "舊版：2024/03/15（示範）"]} onChange={setOldV} />
        <ArrowRight size={14} className="text-faint" />
        <Select label="新版" value={newV} options={["新版：2026/10/12（示範）", "草案：2026/09/20（示範）"]} onChange={setNewV} />
        <div className="mx-1 hidden h-6 w-px bg-line md:block" />
        <Select label="範圍起" value={from} options={nos} onChange={setFrom} />
        <span className="text-sm text-faint">～</span>
        <Select label="範圍迄" value={to} options={nos} onChange={setTo} />
        <GhostBtn onClick={() => setOnlyDiff(!onlyDiff)} active={onlyDiff}>{onlyDiff ? <Eye size={14} /> : <EyeOff size={14} />}僅顯示異動</GhostBtn>
        <Segmented value={mode} onChange={setMode} options={[{ v: "side", label: "並排" }, { v: "merge", label: "合併" }]} />
        <div className="ml-auto flex items-center gap-3 text-xs"><span className="flex items-center gap-1.5 text-danger"><i className="h-2.5 w-2.5 rounded-sm bg-danger" />刪除 {count("del")}</span><span className="flex items-center gap-1.5 text-ok"><i className="h-2.5 w-2.5 rounded-sm bg-ok" />新增 {count("add")}</span><span className="text-sub">{list.length} 條異動</span></div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {mode === "side" && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="flex items-center justify-between px-5 py-3"><b className="text-sm">舊版條文</b><Badge>v1.0</Badge></Card>
              <Card className="flex items-center justify-between px-5 py-3"><b className="text-sm">新版條文</b><Badge tone="brand">v2.0</Badge></Card>
            </div>
          )}
          {list.map((d) => (
            <div key={d.no} ref={(el) => { refs.current[d.no] = el; }} className={cn("rounded-2xl bg-white p-5 shadow-tile ring-1 transition-all duration-500", active === d.no ? "ring-2 ring-brand" : "ring-line/70")}>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-navy-900">第 {d.no} 條 · {d.title}</h3>
                <Badge tone={d.no === 8 ? "danger" : d.no === 12 ? "warn" : "ok"}>{d.badge}</Badge>
              </div>
              {mode === "side" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4 text-[13px]">
                    <div className="mb-2 flex justify-between font-semibold"><span>第 {d.no} 條　{d.title}</span><Badge tone="danger">刪除 / 調整</Badge></div>
                    <div className="space-y-3">{d.oldSeg.map((p, i) => <Para key={i} segs={p} side="old" />)}</div>
                    {!onlyDiff && <div className="mt-4 text-[11px] text-faint">來源：示範知識庫 v1.0 · 非正式法規文本</div>}
                  </div>
                  <div className="rounded-xl bg-ok-soft/40 p-4 text-[13px] ring-1 ring-ok/10">
                    <div className="mb-2 flex justify-between font-semibold"><span>第 {d.no} 條　{d.title}</span><Badge tone="ok">新增 / 修訂</Badge></div>
                    <div className="space-y-3">{d.newSeg.map((p, i) => <Para key={i} segs={p} side="new" />)}</div>
                    {!onlyDiff && <div className="mt-4 text-[11px] text-faint">來源：示範知識庫 v2.0 · 非正式法規文本</div>}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl bg-canvas p-4 text-[13px]">
                  {d.oldSeg.flat().filter((s) => s.k === "del").map((s, i) => <p key={i}><Badge tone="danger" className="mr-2">刪除</Badge><span className="text-danger line-through">{s.t}</span></p>)}
                  {d.newSeg.map((p, i) => <Para key={i} segs={p} side="new" />)}
                </div>
              )}
            </div>
          ))}
          {!list.length && <Card className="p-10 text-center text-sm text-sub">此範圍內沒有條文</Card>}
        </div>

        <Card className="p-5 xl:sticky xl:top-2">
          <div className="flex items-start justify-between"><div><h3 className="text-[15px] font-bold text-navy-900">AI 重點解析</h3><p className="mt-0.5 text-xs text-sub">根據所選範圍的示範版本</p></div><Sparkles size={16} className="text-brand" /></div>
          <Badge tone="brand" className="mt-3">{DIFF_INSIGHTS.length} 項核心變動</Badge>
          <div className="mt-3" onMouseEnter={() => ic.setPaused(true)} onMouseLeave={() => ic.setPaused(false)}>
            {(() => { const s = DIFF_INSIGHTS[ic.i]; return (
              <button key={ic.i} onClick={() => jump(parseInt(s.ref.replace(/\D/g, "")))} className="group block min-h-[132px] w-full rounded-xl p-4 text-left animate-rise" style={{ background: s.color + "14" }}>
                <div className="flex items-center gap-2 text-sm font-bold"><span className="grid h-5 w-5 place-items-center rounded-md text-[11px] text-white" style={{ background: s.color }}>{ic.i + 1}</span>{s.t}</div>
                <p className="mt-2 text-xs leading-relaxed text-sub">{s.d}</p>
                <div className="mt-2 text-[11px] font-semibold text-brand group-hover:underline">依據：{s.ref} ↗</div>
              </button>); })()}
            <div className="mt-3 flex items-center justify-between"><CarouselDots n={DIFF_INSIGHTS.length} i={ic.i} set={ic.set} /><ArrowBtns prev={ic.prev} next={ic.next} /></div>
          </div>
          <div className="mt-2 rounded-xl bg-warn-soft p-3"><div className="text-xs font-bold text-warn">需要人工確認</div><p className="mt-1 text-[11px] leading-relaxed text-sub">條文適用範圍與契約改版時程，需配合法務確認。</p></div>
          <GhostBtn className="mt-3 w-full justify-center" onClick={() => { toast("已送交人工複核"); go("review"); }}><ClipboardList size={14} />送交人工複核</GhostBtn>
        </Card>
      </div>
    </>
  );
}
