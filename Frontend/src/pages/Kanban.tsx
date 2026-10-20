import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, GripVertical, LayoutGrid, List, Move, Plus, Trash2 } from "lucide-react";
import { DEPTS, OWNERS, TOPICS, type Pri, type Task } from "../data";
import { Badge, Card, Modal, PageHeader, PrimaryBtn, Segmented, Select, cn } from "../ui";
import { useStore } from "../store";

const COLS = [
  { k: "todo" as const, label: "待確認", color: "#e8890c", tint: "#fff8ec" },
  { k: "doing" as const, label: "處理中", color: "#1b59f8", tint: "#eff4ff" },
  { k: "done" as const, label: "已完成", color: "#0f9d6b", tint: "#ecfaf3" },
];
const priTone = (p: Pri) => (p === "高優先" ? "danger" : p === "中優先" ? "warn" : "ok");
const avatarBg = ["#1b59f8", "#7c5cfc", "#0e9fb3", "#e8890c", "#0f9d6b", "#e5484d"];

export default function Kanban() {
  const { tasks, setTasks, toast, go } = useStore();
  const [f, setF] = useState({ dept: "全部", topic: "全部", owner: "全部", pri: "全部" });
  const [view, setView] = useState<"board" | "list">("board");
  const [drag, setDrag] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState({ title: "", dept: DEPTS[0], owner: OWNERS[0], pri: "中優先" as Pri, topic: TOPICS[0] });

  const match = (t: Task) => (f.dept === "全部" || t.dept === f.dept) && (f.topic === "全部" || t.topic === f.topic) && (f.owner === "全部" || t.owner === f.owner) && (f.pri === "全部" || t.pri === f.pri);
  const visible = useMemo(() => tasks.filter(match), [tasks, f]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = Object.values(f).some((v) => v !== "全部");

  const move = (id: string, col: Task["col"], before: string | null) => {
    setTasks((all) => {
      const t = all.find((x) => x.id === id)!;
      const rest = all.filter((x) => x.id !== id);
      const moved: Task = { ...t, col, progress: col === "done" ? undefined : col === "doing" ? t.progress ?? [1, 4] : undefined };
      const idx = before ? rest.findIndex((x) => x.id === before) : -1;
      if (idx >= 0) rest.splice(idx, 0, moved);
      else rest.push(moved);
      return rest;
    });
    const t = tasks.find((x) => x.id === id)!;
    if (t.col !== col) toast(`「${t.title.slice(0, 12)}…」移至${COLS.find((c) => c.k === col)!.label}`);
  };
  const end = () => { setDrag(null); setOverCol(null); setOverId(null); };

  const add = () => {
    if (!draft.title.trim()) return;
    setTasks((a) => [...a, { id: "T-" + (300 + a.length), title: draft.title, desc: "手動建立的示範任務。", pri: draft.pri, topic: draft.topic, ref: "第 8 條", owner: draft.owner, dept: draft.dept, due: "11/05", col: "todo" }]);
    setModal(false); setDraft({ ...draft, title: "" }); toast("已新增任務");
  };

  const renderCard = (t: Task) => (
    <div key={t.id} draggable onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={end}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverId(t.id); setOverCol(t.col); }}
      onClick={() => setSel(sel === t.id ? null : t.id)}
      className={cn("group cursor-grab rounded-xl border bg-white p-3.5 shadow-sm transition-all active:cursor-grabbing", drag === t.id ? "rotate-2 opacity-40" : "hover:-translate-y-0.5 hover:shadow-tile", sel === t.id ? "border-brand ring-2 ring-brand/20" : "border-line", overId === t.id && drag && drag !== t.id && "translate-y-2")}>
      <div className="flex items-center justify-between"><Badge tone={priTone(t.pri)}>{t.pri === "高優先" ? "高優先" : t.pri}</Badge><div className="flex items-center gap-1 text-faint"><GripVertical size={14} /><button onClick={(e) => { e.stopPropagation(); setTasks((a) => a.filter((x) => x.id !== t.id)); toast("已刪除任務"); }} className="opacity-0 transition hover:text-danger group-hover:opacity-100"><Trash2 size={13} /></button></div></div>
      <div className="mt-2.5 text-[14px] font-bold leading-snug text-navy-900">{t.title}</div>
      <p className="mt-1 text-xs text-sub">{t.desc}</p>
      <button onClick={(e) => { e.stopPropagation(); go("diff"); }} className="mt-2 text-[11px] font-semibold text-brand hover:underline">{t.topic} · {t.ref} ↗</button>
      {t.progress && (
        <div className="mt-2.5"><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(t.progress[0] / t.progress[1]) * 100}%` }} /></div><div className="mt-1 text-[10px] text-faint">{t.progress[0]} / {t.progress[1]} 項檢核已完成</div></div>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5 text-[11px] text-sub">
        <span className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: avatarBg[OWNERS.indexOf(t.owner) % 6] }}>{t.owner[0]}</span>{t.owner} · {t.dept}</span>
        {t.col === "done" ? <span className="flex items-center gap-1 text-ok"><CheckCircle2 size={12} />完成 {t.due}</span> : <span className="flex items-center gap-1"><CalendarDays size={12} />到期 {t.due}</span>}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader title="待辦看板" sub="追蹤法規因應進度，從確認到完成，讓每項事務都有責任與期限。" action={<PrimaryBtn onClick={() => setModal(true)}><Plus size={16} />新增任務</PrimaryBtn>} />
      <div className="flex flex-wrap items-center gap-3">
        <Select label="部門" value={f.dept} options={["全部", ...DEPTS]} onChange={(v) => setF({ ...f, dept: v })} />
        <Select label="主題" value={f.topic} options={["全部", ...TOPICS]} onChange={(v) => setF({ ...f, topic: v })} />
        <Select label="負責人" value={f.owner} options={["全部", ...OWNERS]} onChange={(v) => setF({ ...f, owner: v })} />
        <Select label="優先程度" value={f.pri} options={["全部", "高優先", "中優先", "低優先"]} onChange={(v) => setF({ ...f, pri: v })} />
        {filtered && <button onClick={() => setF({ dept: "全部", topic: "全部", owner: "全部", pri: "全部" })} className="text-xs font-semibold text-brand">清除</button>}
        <div className="ml-auto"><Segmented value={view} onChange={setView} options={[{ v: "board", label: <><LayoutGrid size={14} />看板</> }, { v: "list", label: <><List size={14} />列表</> }]} /></div>
      </div>

      <Card className="flex flex-wrap items-center gap-6 px-5 py-3.5 text-[13px]">
        <b className="text-navy-900">本次示範工作集 · {visible.length} 件</b>
        {COLS.map((c) => <span key={c.k} className="flex items-center gap-1.5 text-sub"><i className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.label} <b className="num text-ink">{visible.filter((t) => t.col === c.k).length}</b></span>)}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-brand"><Move size={14} />拖拉卡片以變更狀態或排序</span>
      </Card>

      {view === "board" ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {COLS.map((c) => {
            const items = visible.filter((t) => t.col === c.k);
            const hot = drag && overCol === c.k;
            return (
              <div key={c.k} onDragOver={(e) => { e.preventDefault(); setOverCol(c.k); if (e.target === e.currentTarget) setOverId(null); }} onDrop={(e) => { e.preventDefault(); if (drag) move(drag, c.k, overId && overId !== drag ? overId : null); end(); }}
                className="min-h-[280px] rounded-2xl p-3 transition-all" style={{ background: c.tint, outline: hot ? `2px dashed ${c.color}` : "2px dashed transparent", outlineOffset: -2 }}>
                <div className="mb-3 flex items-center justify-between px-1.5">
                  <span className="flex items-center gap-2 text-sm font-bold"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.label}</span>
                  <span className="num grid h-6 min-w-6 place-items-center rounded-md bg-white px-1.5 text-xs font-bold shadow-sm" style={{ color: c.color }}>{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map(renderCard)}
                  {drag && (
                    <div onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverId(null); setOverCol(c.k); }} className={cn("grid place-items-center rounded-xl border-2 border-dashed py-5 text-xs font-semibold transition", hot && !overId ? "scale-[1.02] bg-white" : "bg-white/40")} style={{ borderColor: c.color + "88", color: c.color }}>＋ 將卡片拖曳至此</div>
                  )}
                  {!items.length && !drag && <div className="py-10 text-center text-xs text-faint">沒有符合條件的任務</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead><tr className="text-[11px] text-faint">{["任務", "狀態", "優先", "負責人", "部門", "到期"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {visible.map((t) => {
                const c = COLS.find((x) => x.k === t.col)!;
                return (
                  <tr key={t.id} className="border-t border-line/70 hover:bg-brand-soft/40">
                    <td className="px-4 py-3"><div className="font-bold text-navy-900">{t.title}</div><div className="text-xs text-sub">{t.topic} · {t.ref}</div></td>
                    <td className="px-4"><select value={t.col} onChange={(e) => move(t.id, e.target.value as Task["col"], null)} className="rounded-lg border-0 px-2 py-1 text-xs font-semibold outline-none" style={{ background: c.tint, color: c.color }}>{COLS.map((x) => <option key={x.k} value={x.k}>{x.label}</option>)}</select></td>
                    <td className="px-4"><Badge tone={priTone(t.pri)}>{t.pri}</Badge></td>
                    <td className="px-4">{t.owner}</td><td className="px-4 text-sub">{t.dept}</td><td className="num px-4 text-sub">{t.due}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="新增任務">
        <div className="space-y-3 text-sm">
          <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="任務名稱，例如：更新客戶審查檢核表" className="w-full rounded-xl border border-line px-4 py-3 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="部門" value={draft.dept} options={DEPTS} onChange={(v) => setDraft({ ...draft, dept: v })} />
            <Select label="負責人" value={draft.owner} options={OWNERS} onChange={(v) => setDraft({ ...draft, owner: v })} />
            <Select label="主題" value={draft.topic} options={TOPICS} onChange={(v) => setDraft({ ...draft, topic: v })} />
            <Select label="優先" value={draft.pri} options={["高優先", "中優先", "低優先"]} onChange={(v) => setDraft({ ...draft, pri: v as Pri })} />
          </div>
          <div className="flex justify-end gap-2 pt-2"><button onClick={() => setModal(false)} className="rounded-xl border border-line px-4 py-2.5 font-semibold">取消</button><PrimaryBtn onClick={add}>建立</PrimaryBtn></div>
        </div>
      </Modal>
    </>
  );
}
