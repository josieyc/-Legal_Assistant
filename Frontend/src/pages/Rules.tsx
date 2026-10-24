import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, BookMarked, Check, ChevronRight, FilePlus2, FileUp, History, LayoutGrid, Link2, List, Pencil, Plus, Rocket, Search, Sparkles, Table2, Trash2, UploadCloud, X } from "lucide-react";
import { useStore } from "../store";
import { REGS } from "../data";
import { RULE_CATEGORIES, TODAY, bumpVersion, type Clause, type IRule } from "../rulesData";
import { Badge, Bar, Card, CarouselDots, ArrowBtns, CountUp, GhostBtn, Modal, PageHeader, PrimaryBtn, Segmented, Select, cn, useCarousel } from "../ui";
import { Donut, HBars } from "../charts";

const DEPTS = ["營運部", "資訊部", "法遵部", "客服部", "授信部", "風控部"];
const DEPT_COLORS = ["#1b59f8", "#7c5cfc", "#0e9fb3", "#e8890c", "#0f9d6b", "#e5484d"];
const statusTone = (s: string) => (s === "生效中" ? "ok" : s === "修訂中" ? "warn" : "gray");
const healthColor = (h: number) => (h >= 80 ? "#0f9d6b" : h >= 60 ? "#e8890c" : "#e5484d");
let uid = 1000;
const nid = () => `n${++uid}`;

export default function Rules() {
  const { rules, setRules, toast, go, askQa, ruleFocusId, setRuleFocusId } = useStore();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("全部部門");
  const [cat, setCat] = useState("全部類別");
  const [st, setSt] = useState("全部狀態");
  const [view, setView] = useState<"card" | "table">("card");
  const [openId, setOpenId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<null | { rule?: string }>(null);
  const [addOpen, setAddOpen] = useState<null | { rule?: string }>(null);

  const filtered = useMemo(
    () => rules.filter((r) => (dept === "全部部門" || r.dept === dept) && (cat === "全部類別" || r.category === cat) && (st === "全部狀態" || r.status === st) &&
      (!q || (r.name + r.code + r.clauses.map((c) => c.text).join("")).toLowerCase().includes(q.toLowerCase()))),
    [rules, q, dept, cat, st],
  );
  const pending = rules.filter((r) => r.pending);
  const clauseN = rules.reduce((s, r) => s + r.clauses.length, 0);
  const avg = Math.round(rules.reduce((s, r) => s + r.health, 0) / (rules.length || 1));
  const open = rules.find((r) => r.id === openId) ?? null;
  const upd = (id: string, f: (r: IRule) => IRule) => setRules((rs) => rs.map((r) => (r.id === id ? f(r) : r)));
  const car = useCarousel(Math.max(pending.length, 1), 6000);
  const chart = useCarousel(3, 8000);
  useEffect(() => {
    if (!ruleFocusId) return;
    setOpenId(ruleFocusId);
    setRuleFocusId("");
  }, [ruleFocusId, setRuleFocusId]);

  const deptData = DEPTS.map((d, i) => ({ label: d.replace("部", ""), value: rules.filter((r) => r.dept === d).length, color: DEPT_COLORS[i] })).filter((d) => d.value);
  const catData = RULE_CATEGORIES.map((c, i) => ({ label: c, value: rules.filter((r) => r.category === c).length, color: DEPT_COLORS[i] }));
  const healthData = [...rules].sort((a, b) => a.health - b.health).slice(0, 6).map((r) => ({ label: r.code, value: r.health, color: healthColor(r.health) }));
  const stats = [
    { l: "內規總數", v: rules.length, s: "份", c: "text-navy-900" },
    { l: "條文總數", v: clauseN, s: "條", c: "text-brand" },
    { l: "待更新內規", v: pending.length, s: "份", c: "text-warn" },
    { l: "平均合規健康度", v: avg, s: "%", c: "text-ok" },
  ];

  return (
    <>
      <PageHeader title="內規管理" sub="匯入新版內規、新增條文並追蹤每份內規與外部法規的對應狀態。" action={
        <div className="flex gap-2">
          <GhostBtn onClick={() => setAddOpen({})}><Plus size={15} />新增條文</GhostBtn>
          <PrimaryBtn onClick={() => setWizard({})}><FileUp size={16} />匯入內規</PrimaryBtn>
        </div>
      } />

      <div className="grid grid-cols-2 gap-6 px-1 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l}>
            <div className="text-xs font-semibold text-sub">{s.l}</div>
            <div className={cn("mt-1 text-5xl font-extrabold tracking-tight", s.c)}><CountUp to={s.v} /><span className="ml-1 text-base font-semibold text-faint">{s.s}</span></div>
          </div>
        ))}
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3" onMouseEnter={() => car.setPaused(true)} onMouseLeave={() => car.setPaused(false)}>
          <Card className="relative h-full overflow-hidden bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16} className="text-amber-300" />優先更新提醒<span className="rounded-full bg-white/15 px-2 text-xs">{pending.length}</span></div>
              <ArrowBtns prev={car.prev} next={car.next} light />
            </div>
            {pending.length === 0 ? (
              <div className="grid h-40 place-items-center text-sm text-white/70">目前沒有需要更新的內規 🎉</div>
            ) : (
              <div className="mt-4 overflow-hidden">
                <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${(car.i % pending.length) * 100}%)` }}>
                  {pending.map((r) => (
                    <div key={r.id} className="w-full shrink-0 pr-2">
                      <div className="text-xs text-white/60">{r.code} · {r.dept}</div>
                      <h3 className="mt-1 text-2xl font-extrabold">{r.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/80">受 <b className="text-amber-300">{r.pending!.reg}</b> 影響：{r.pending!.reason}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button onClick={() => setWizard({ rule: r.id })} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-navy-900 transition hover:-translate-y-0.5"><UploadCloud size={15} />匯入新版內規</button>
                        <button onClick={() => setOpenId(r.id)} className="rounded-xl border border-white/30 px-4 py-2 text-[13px] font-semibold hover:bg-white/10">直接編輯條文</button>
                        <span className="text-xs text-white/60">健康度 {r.health}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-5"><CarouselDots n={Math.max(pending.length, 1)} i={car.i % Math.max(pending.length, 1)} set={car.set} light /></div>
          </Card>
        </div>

        <div className="xl:col-span-2" onMouseEnter={() => chart.setPaused(true)} onMouseLeave={() => chart.setPaused(false)}>
          <Card className="h-full p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy-900">{["各部門內規分布", "內規類別統計", "合規健康度最低 6 份"][chart.i]}</h3>
              <ArrowBtns prev={chart.prev} next={chart.next} />
            </div>
            <div key={chart.i} className="mt-4 flex min-h-[190px] items-center justify-center animate-rise">
              {chart.i === 0 && <Donut data={deptData} center={String(rules.length)} sub="份內規" />}
              {chart.i === 1 && <div className="w-full"><HBars data={catData} max={Math.max(...catData.map((c) => c.value), 1) + 1} /></div>}
              {chart.i === 2 && <div className="w-full"><HBars data={healthData} max={100} suffix="%" /></div>}
            </div>
            <div className="mt-3 flex justify-center"><CarouselDots n={3} i={chart.i} set={chart.set} /></div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="mr-2 text-lg font-bold text-navy-900">內規總覽</h3>
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋內規名稱、編號或條文內容" className="w-full rounded-xl border border-line py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
          </div>
          <Select label="部門" value={dept} options={["全部部門", ...DEPTS]} onChange={setDept} />
          <Select label="類別" value={cat} options={["全部類別", ...RULE_CATEGORIES]} onChange={setCat} />
          <Select label="狀態" value={st} options={["全部狀態", "生效中", "修訂中", "草稿"]} onChange={setSt} />
          <div className="ml-auto"><Segmented value={view} onChange={setView} options={[{ v: "card", label: <><LayoutGrid size={14} />卡片</> }, { v: "table", label: <><Table2 size={14} />表格</> }]} /></div>
        </div>
        <div className="mt-1 text-xs text-sub">共 {filtered.length} 份</div>

        {filtered.length === 0 ? (
          <div className="grid place-items-center py-16 text-sm text-sub"><BookMarked size={30} className="mb-2 text-faint" />找不到符合條件的內規
            <button onClick={() => { setQ(""); setDept("全部部門"); setCat("全部類別"); setSt("全部狀態"); }} className="mt-2 font-semibold text-brand">清除篩選</button></div>
        ) : view === "card" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <button key={r.id} onClick={() => setOpenId(r.id)} className="group rounded-2xl border border-line bg-white p-4 text-left transition hover:-translate-y-1 hover:border-brand/40 hover:shadow-tile">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[11px] font-semibold text-faint">{r.code} · {r.version}</div>
                  <div className="flex gap-1.5">{r.pending && <Badge tone="warn">待更新</Badge>}<Badge tone={statusTone(r.status)}>{r.status}</Badge></div>
                </div>
                <div className="mt-1.5 font-bold text-navy-900 group-hover:text-brand">{r.name}</div>
                <div className="mt-1 text-xs text-sub">{r.dept} · {r.category} · {r.clauses.length} 條</div>
                <div className="mt-4 flex items-center gap-2 text-[11px] text-sub"><span>健康度</span><Bar value={r.health} color={healthColor(r.health)} h="h-1.5" /><b style={{ color: healthColor(r.health) }}>{r.health}%</b></div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-faint"><span>更新 {r.updated}</span><ChevronRight size={14} className="transition group-hover:translate-x-1" /></div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="text-xs text-sub"><tr className="border-b border-line">{["編號", "名稱", "部門", "類別", "版本", "條數", "健康度", "狀態", "更新日"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-line/60 transition hover:bg-brand-soft/50">
                    <td className="px-3 py-3 font-mono text-xs text-sub">{r.code}</td>
                    <td className="px-3 py-3 font-semibold text-navy-900">{r.name}{r.pending && <span className="ml-2 text-[11px] text-warn">● 待更新</span>}</td>
                    <td className="px-3 py-3">{r.dept}</td><td className="px-3 py-3">{r.category}</td><td className="px-3 py-3">{r.version}</td><td className="px-3 py-3">{r.clauses.length}</td>
                    <td className="w-32 px-3 py-3"><div className="flex items-center gap-2"><Bar value={r.health} color={healthColor(r.health)} h="h-1.5" /><b className="text-xs">{r.health}</b></div></td>
                    <td className="px-3 py-3"><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                    <td className="whitespace-nowrap px-3 py-3 text-sub">{r.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {open && <Drawer rule={open} onClose={() => setOpenId(null)} upd={upd} toast={toast} onImport={() => setWizard({ rule: open.id })} onAdd={() => setAddOpen({ rule: open.id })}
        onDelete={() => { setRules((rs) => rs.filter((r) => r.id !== open.id)); setOpenId(null); toast("已刪除內規"); }}
        onAsk={() => { askQa(`${open.name}與現行法規是否一致？`); go("qa"); }} />}

      <Wizard state={wizard} onClose={() => setWizard(null)} rules={rules} setRules={setRules} toast={toast} onDone={(id) => { setWizard(null); setOpenId(id); }} />
      <AddClause state={addOpen} onClose={() => setAddOpen(null)} rules={rules} toast={toast} onSave={(id, c) => { upd(id, (r) => ({ ...r, clauses: [...r.clauses, c], status: r.status === "生效中" ? "修訂中" : r.status, dirty: r.dirty + 1 })); setAddOpen(null); setOpenId(id); }} />
    </>
  );
}

function Drawer({ rule, onClose, upd, toast, onImport, onAdd, onDelete, onAsk }: { rule: IRule; onClose: () => void; upd: (id: string, f: (r: IRule) => IRule) => void; toast: (m: string) => void; onImport: () => void; onAdd: () => void; onDelete: () => void; onAsk: () => void }) {
  const [tab, setTab] = useState<"c" | "h" | "l">("c");
  const [edit, setEdit] = useState<string | null>(null);
  const [txt, setTxt] = useState("");
  const [note, setNote] = useState("");
  const [pub, setPub] = useState(false);
  const saveEdit = (c: Clause) => {
    if (!txt.trim()) return toast("條文內容不可為空");
    upd(rule.id, (r) => ({ ...r, clauses: r.clauses.map((x) => (x.id === c.id ? { ...x, text: txt.trim() } : x)), status: r.status === "生效中" ? "修訂中" : r.status, dirty: r.dirty + 1 }));
    setEdit(null); toast("條文已更新（草稿）");
  };
  const publish = () => {
    const v = bumpVersion(rule.version);
    upd(rule.id, (r) => ({ ...r, version: v, status: "生效中", dirty: 0, updated: TODAY, pending: undefined, health: Math.min(98, r.health + (r.pending ? 30 : 5)), history: [{ v, date: TODAY, by: "林怡君", note: note || "更新條文" }, ...r.history] }));
    setPub(false); setNote(""); toast(`已發布 ${v}`);
  };
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-navy-950/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl animate-rise flex-col bg-white shadow-pop">
        <div className="border-b border-line p-6">
          <div className="flex items-start justify-between">
            <div><div className="text-xs font-semibold text-faint">{rule.code} · {rule.dept} · {rule.owner}</div><h2 className="mt-1 text-xl font-extrabold text-navy-900">{rule.name}</h2>
              <div className="mt-2 flex gap-2"><Badge tone="brand">{rule.version}</Badge><Badge tone={statusTone(rule.status)}>{rule.status}</Badge>{rule.pending && <Badge tone="warn">待更新</Badge>}{rule.dirty > 0 && <Badge tone="violet">{rule.dirty} 項未發布變更</Badge>}</div></div>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-sub hover:bg-slate-100"><X size={16} /></button>
          </div>
          {rule.pending && <div className="mt-4 rounded-xl bg-warn-soft p-3 text-xs leading-relaxed text-sub"><b className="text-warn">{rule.pending.reg}</b>：{rule.pending.reason}</div>}
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryBtn onClick={() => setPub(true)}><Rocket size={15} />發布新版本</PrimaryBtn>
            <GhostBtn onClick={onImport}><FileUp size={14} />匯入新版</GhostBtn>
            <GhostBtn onClick={onAsk}><Sparkles size={14} />詢問 AI</GhostBtn>
          </div>
        </div>
        <div className="px-6 pt-4"><Segmented value={tab} onChange={setTab} options={[{ v: "c", label: `條文 (${rule.clauses.length})` }, { v: "h", label: "版本紀錄" }, { v: "l", label: "關聯法規" }]} /></div>
        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {tab === "c" && <>
            {rule.clauses.map((c) => (
              <div key={c.id} className="group rounded-xl border border-line p-4">
                <div className="flex items-center justify-between"><b className="text-[13px] text-brand">{c.no}</b>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => { setEdit(c.id); setTxt(c.text); }} className="grid h-7 w-7 place-items-center rounded-lg text-sub hover:bg-slate-100" aria-label="編輯"><Pencil size={13} /></button>
                    <button onClick={() => { upd(rule.id, (r) => ({ ...r, clauses: r.clauses.filter((x) => x.id !== c.id), dirty: r.dirty + 1, status: r.status === "生效中" ? "修訂中" : r.status })); toast("已刪除條文"); }} className="grid h-7 w-7 place-items-center rounded-lg text-danger hover:bg-danger-soft" aria-label="刪除"><Trash2 size={13} /></button>
                  </div></div>
                {edit === c.id ? (
                  <div className="mt-2"><textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-line p-2.5 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
                    <div className="mt-2 flex justify-end gap-2"><GhostBtn onClick={() => setEdit(null)}>取消</GhostBtn><PrimaryBtn onClick={() => saveEdit(c)}><Check size={14} />儲存</PrimaryBtn></div></div>
                ) : <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{c.text}</p>}
                {c.ref && <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand"><Link2 size={11} />對應法規 {c.ref}</div>}
              </div>
            ))}
            <button onClick={onAdd} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line py-3 text-[13px] font-semibold text-sub transition hover:border-brand hover:text-brand"><Plus size={15} />新增條文</button>
          </>}
          {tab === "h" && <ol className="relative ml-2 space-y-5 border-l-2 border-line pl-5">
            {rule.history.map((h, i) => (
              <li key={h.v + i} className="relative"><span className={cn("absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white", i === 0 ? "bg-brand" : "bg-slate-300")} />
                <div className="flex items-center gap-2"><b className="text-sm text-navy-900">{h.v}</b>{i === 0 && <Badge tone="brand">目前</Badge>}</div>
                <div className="text-xs text-sub">{h.date} · {h.by}</div><p className="mt-1 text-[13px]">{h.note}</p></li>
            ))}
          </ol>}
          {tab === "l" && (rule.linked.length === 0 ? <p className="text-sm text-sub">尚無關聯法規</p> : rule.linked.map((id) => {
            const g = REGS.find((x) => x.id === id);
            return <div key={id} className="rounded-xl border border-line p-4"><div className="font-mono text-xs text-faint">{id}</div><div className="mt-0.5 font-bold text-navy-900">{g?.name ?? id}</div>{g && <div className="mt-1 text-xs text-sub">{g.article} · {g.note}</div>}</div>;
          }))}
          <div className="pt-4"><button onClick={onDelete} className="text-xs font-semibold text-danger hover:underline">刪除此內規</button></div>
        </div>
      </div>
      <Modal open={pub} onClose={() => setPub(false)} title={`發布 ${bumpVersion(rule.version)}`}>
        <p className="text-sm text-sub">發布後會建立新版本紀錄，並清除待更新標記。</p>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="版本說明（例如：高風險客戶審查改為每半年）" className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
        <div className="mt-4 flex justify-end gap-2"><GhostBtn onClick={() => setPub(false)}>取消</GhostBtn><PrimaryBtn onClick={publish}><Rocket size={15} />確認發布</PrimaryBtn></div>
      </Modal>
    </div>
  );
}

function AddClause({ state, onClose, rules, toast, onSave }: { state: null | { rule?: string }; onClose: () => void; rules: IRule[]; toast: (m: string) => void; onSave: (id: string, c: Clause) => void }) {
  const [rid, setRid] = useState("");
  const [no, setNo] = useState("");
  const [text, setText] = useState("");
  const [ref, setRef] = useState("無");
  const cur = rules.find((r) => r.id === (state?.rule ?? rid)) ?? null;
  const submit = () => {
    if (!cur) return toast("請選擇內規");
    if (!no.trim() || !text.trim()) return toast("請填寫條號與內容");
    onSave(cur.id, { id: nid(), no: no.trim(), text: text.trim(), ref: ref === "無" ? undefined : ref });
    toast("條文已新增"); setNo(""); setText(""); setRef("無");
  };
  return (
    <Modal open={!!state} onClose={onClose} title="新增條文">
      <div className="space-y-3">
        <Select label="內規" value={cur ? `${cur.code} ${cur.name}` : "請選擇"} options={rules.map((r) => `${r.code} ${r.name}`)} onChange={(v) => setRid(rules.find((r) => `${r.code} ${r.name}` === v)!.id)} className="w-full" />
        <input value={no} onChange={(e) => setNo(e.target.value)} placeholder={cur ? `條號，例如：第 ${cur.clauses.length + 1} 點` : "條號"} className="w-full rounded-xl border border-line px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="條文內容" className="w-full resize-none rounded-xl border border-line p-3 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" />
        <Select label="對應法規" value={ref} options={["無", "第 8 條", "第 12 條", "第 16 條", "第 7 條", "第 21 條"]} onChange={setRef} />
      </div>
      <div className="mt-5 flex justify-end gap-2"><GhostBtn onClick={onClose}>取消</GhostBtn><PrimaryBtn onClick={submit}><FilePlus2 size={15} />新增</PrimaryBtn></div>
    </Modal>
  );
}

type Parsed = { no: string; text: string; kind: "新增" | "修改" | "不變" };
function Wizard({ state, onClose, rules, setRules, toast, onDone }: { state: null | { rule?: string }; onClose: () => void; rules: IRule[]; setRules: React.Dispatch<React.SetStateAction<IRule[]>>; toast: (m: string) => void; onDone: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"update" | "new">("update");
  const [target, setTarget] = useState("");
  const [file, setFile] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed[]>([]);
  const [name, setName] = useState("");
  const [dept, setDept] = useState("法遵部");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const rid = state?.rule ?? target;
  const rule = rules.find((r) => r.id === rid);
  const isNew = mode === "new" && !state?.rule;

  const reset = () => { setStep(0); setFile(""); setParsed([]); setParsing(false); setName(""); setTarget(""); setMode("update"); };
  const close = () => { reset(); onClose(); };

  const pick = (f: File | undefined) => {
    if (!f) return;
    setFile(f.name); setParsing(true);
    setTimeout(() => {
      const base = isNew ? [] : rule?.clauses ?? [];
      const out: Parsed[] = base.map((c, i) => i === 1 ? { no: c.no, text: c.text.replace(/每年|五年|三十日|五個工作日/, (m) => ({ 每年: "每六個月", 五年: "七年", 三十日: "二十日", 五個工作日: "三個工作日" } as Record<string, string>)[m]), kind: "修改" } : { no: c.no, text: c.text, kind: "不變" });
      if (isNew) out.push({ no: "第 1 點", text: "為健全內部控制，依相關法令訂定本辦法。", kind: "新增" }, { no: "第 2 點", text: "本辦法由權責單位擬訂，經核准後公告實施。", kind: "新增" });
      else out.push({ no: `第 ${base.length + 1} 點`, text: "重大事件應於一個工作日內通報權責主管並留存紀錄。", kind: "新增" });
      setParsed(out); setParsing(false); setStep(2);
    }, 1300);
  };

  const confirm = () => {
    if (isNew) {
      const id = nid();
      setRules((rs) => [{ id, code: `NEW-${String(rs.length + 1).padStart(3, "0")}`, name: name || file.replace(/\.[^.]+$/, ""), dept, category: "管理政策", version: "v1.0", status: "草稿", updated: TODAY, owner: "林怡君", health: 60, dirty: 0, linked: [], history: [{ v: "v1.0", date: TODAY, by: "林怡君", note: `匯入 ${file}` }], clauses: parsed.map((p) => ({ id: nid(), no: p.no, text: p.text })) }, ...rs]);
      toast("已匯入新內規"); const done = id; reset(); onDone(done); return;
    }
    if (!rule) return;
    const v = bumpVersion(rule.version);
    setRules((rs) => rs.map((r) => r.id === rule.id ? { ...r, version: v, status: "生效中", updated: TODAY, pending: undefined, dirty: 0, health: Math.min(98, r.health + 30), clauses: parsed.map((p, i) => ({ id: r.clauses[i]?.id ?? nid(), no: p.no, text: p.text, ref: r.clauses[i]?.ref })), history: [{ v, date: TODAY, by: "林怡君", note: `匯入 ${file}` }, ...r.history] } : r));
    toast(`${rule.name} 已更新至 ${v}`); const done = rule.id; reset(); onDone(done);
  };

  const steps = ["選擇方式", "上傳檔案", "確認差異"];
  const cnt = (k: string) => parsed.filter((p) => p.kind === k).length;
  return (
    <Modal open={!!state} onClose={close} title="匯入內規" width="max-w-2xl">
      <div className="mb-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition", i <= step ? "bg-brand text-white" : "bg-slate-100 text-faint")}>{i < step ? <Check size={12} /> : i + 1}</span>
            <span className={cn("text-xs font-semibold", i <= step ? "text-navy-900" : "text-faint")}>{s}</span>
            {i < 2 && <i className={cn("h-0.5 flex-1 rounded", i < step ? "bg-brand" : "bg-slate-100")} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          {state?.rule ? <div className="rounded-xl bg-brand-soft p-3.5 text-[13px]">將以新版檔案更新：<b>{rule?.name}</b></div> : <>
            {([["update", "更新既有內規", "公司內規有修訂時，上傳新版檔案並比對差異", History], ["new", "匯入全新內規", "第一次建立的內規文件，自動拆解為條文", FilePlus2]] as const).map(([k, t, d, Ic]) => (
              <button key={k} onClick={() => setMode(k)} className={cn("flex w-full items-center gap-4 rounded-xl border p-4 text-left transition", mode === k ? "border-brand bg-brand-soft" : "border-line hover:border-brand/40")}>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand shadow-sm"><Ic size={18} /></span>
                <span><b className="text-sm text-navy-900">{t}</b><span className="block text-xs text-sub">{d}</span></span>
              </button>
            ))}
            {mode === "update" && <Select label="要更新的內規" value={rule ? `${rule.code} ${rule.name}` : "請選擇"} options={rules.map((r) => `${r.code} ${r.name}`)} onChange={(v) => setTarget(rules.find((r) => `${r.code} ${r.name}` === v)!.id)} className="w-full" />}
            {mode === "new" && <div className="grid gap-3 sm:grid-cols-2"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="內規名稱（可留空，沿用檔名）" className="rounded-xl border border-line px-3 py-2.5 text-[13px] outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" /><Select label="部門" value={dept} options={DEPTS} onChange={setDept} /></div>}
          </>}
          <div className="flex justify-end pt-2"><PrimaryBtn onClick={() => { if (!isNew && !rule) return toast("請先選擇要更新的內規"); setStep(1); }}>下一步</PrimaryBtn></div>
        </div>
      )}

      {step === 1 && (
        <div>
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }} onClick={() => input.current?.click()}
            className={cn("grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition", drag ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50")}>
            <input ref={input} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            {parsing ? <><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand/20 border-t-brand" /><div className="mt-3 text-sm font-semibold text-navy-900">AI 正在解析 {file}…</div><div className="text-xs text-sub">辨識條號、拆解條文、比對舊版</div></> :
              <><UploadCloud size={34} className="text-brand" /><div className="mt-3 text-sm font-bold text-navy-900">拖曳檔案至此，或點擊選擇</div><div className="mt-1 text-xs text-sub">支援 PDF、Word、TXT</div></>}
          </div>
          <div className="mt-4 flex justify-between"><GhostBtn onClick={() => setStep(0)}>上一步</GhostBtn>
            {!parsing && <button onClick={() => pick({ name: "內規修訂版_示範.pdf" } as File)} className="text-xs font-semibold text-brand hover:underline">沒有檔案？使用示範檔案</button>}</div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs"><Badge tone="brand">{file}</Badge><Badge tone="ok">新增 {cnt("新增")}</Badge><Badge tone="warn">修改 {cnt("修改")}</Badge><Badge>不變 {cnt("不變")}</Badge></div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {parsed.map((p, i) => (
              <div key={i} className={cn("rounded-xl border p-3 text-[13px]", p.kind === "新增" ? "border-ok/40 bg-ok-soft/60" : p.kind === "修改" ? "border-warn/40 bg-warn-soft/70" : "border-line")}>
                <div className="flex items-center justify-between"><b className="text-navy-900">{p.no}</b>{p.kind !== "不變" && <span className={cn("text-[11px] font-bold", p.kind === "新增" ? "text-ok" : "text-warn")}>{p.kind}</span>}</div>
                <p className="mt-1 leading-relaxed text-sub">{p.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between"><GhostBtn onClick={() => { setStep(1); setParsed([]); }}>重新上傳</GhostBtn><PrimaryBtn onClick={confirm}><Check size={15} />{isNew ? "建立內規" : "套用並發布新版"}</PrimaryBtn></div>
        </div>
      )}
    </Modal>
  );
}
