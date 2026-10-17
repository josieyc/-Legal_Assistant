import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Columns2, History, Paperclip, Save, Sparkles, UserCheck, Check, FileText, CheckCheck } from "lucide-react";
import { REVIEW_ARTICLES } from "../data";
import { Badge, Card, GhostBtn, PageHeader, PrimaryBtn, RegBar, Select, cn } from "../ui";
import { useStore } from "../store";

const CHOICES = ["採納 AI 判斷", "採納並調整因應措施", "退回重新分析", "不適用，附具理由"];
interface Log { t: string; time: string; by: string; d: string; color: string }
const LOGS: Log[] = [
  { t: "AI 完成初步分析", time: "2026/10/12 09:30（示範）", by: "系統 · 教育 v2.0", d: "", color: "#7c5cfc" },
  { t: "法遵管理員開啟複核", time: "2026/10/12 10:05（示範）", by: "林怡君 · 檢視異常狀況", d: "", color: "#1b59f8" },
  { t: "人工調整保留草稿", time: "2026/10/12 10:18（示範）", by: "林怡君 · 尚未提交", d: "", color: "#e8890c" },
];

export default function Review() {
  const { go, toast } = useStore();
  const [idx, setIdx] = useState(0);
  const [dec, setDec] = useState<Record<number, { c: number; note: string; done: boolean }>>({ 0: { c: 1, note: "同意修訂審查頻率。重大事件觸發條件由營運部與風控部共同定義，並於主管核准流程中一併完成測試。", done: false } });
  const [logs, setLogs] = useState(LOGS);
  const a = REVIEW_ARTICLES[idx];
  const d = dec[idx] ?? { c: -1, note: "", done: false };
  const upd = (p: Partial<typeof d>) => setDec({ ...dec, [idx]: { ...d, ...p } });
  const doneN = Object.values(dec).filter((x) => x.done).length;

  const submit = () => {
    if (d.c < 0 || !d.note.trim()) return toast("請選擇複核結果並填寫決定理由");
    upd({ done: true });
    setLogs([...logs, { t: `第 ${a.no} 條複核：${CHOICES[d.c]}`, time: "剛剛", by: "林怡君 · 已提交", d: "", color: "#0f9d6b" }]);
    toast(`第 ${a.no} 條決定已提交`);
    if (idx < REVIEW_ARTICLES.length - 1) setTimeout(() => setIdx((i) => i + 1), 500);
  };
  const render = (s: string) => s;

  return (
    <>
      <PageHeader title="複核頁" sub="條文、AI 判斷與人工決定並排核視，保留每一次法遵決策的依據。" action={<PrimaryBtn onClick={submit}><Check size={16} />提交複核決定</PrimaryBtn>} />
      <RegBar />
      <div className="flex flex-wrap items-center gap-3">
        <Select label="條文" value={`第 ${a.no} 條 · ${a.title}`} options={REVIEW_ARTICLES.map((x) => `第 ${x.no} 條 · ${x.title}`)} onChange={(v) => setIdx(REVIEW_ARTICLES.findIndex((x) => v.startsWith(`第 ${x.no} 條`)))} />
        <Badge tone="warn">待人工複核</Badge>
        <div className="flex items-center gap-1.5">{REVIEW_ARTICLES.map((x, i) => <button key={x.no} onClick={() => setIdx(i)} className={cn("h-2 rounded-full transition-all", i === idx ? "w-8 bg-brand" : dec[i]?.done ? "w-4 bg-ok" : "w-4 bg-slate-300")} aria-label={`第 ${x.no} 條`} />)}</div>
        <span className="text-xs text-sub">第 {idx + 1} / {REVIEW_ARTICLES.length} 項 · 已完成 {doneN}</span>
        <div className="ml-auto flex gap-2">
          <GhostBtn onClick={() => setIdx(Math.max(0, idx - 1))}><ChevronLeft size={14} />上一項</GhostBtn>
          <GhostBtn onClick={() => setIdx(Math.min(REVIEW_ARTICLES.length - 1, idx + 1))}>下一項<ChevronRight size={14} /></GhostBtn>
        </div>
      </div>

      <div key={idx} className="grid items-start gap-5 xl:grid-cols-3 animate-rise">
        <Card className="p-5">
          <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">法規條文</h3><p className="mt-0.5 text-xs text-sub">示範新版 v2.0 · 第 {a.no} 條</p></div><FileText size={17} className="text-brand" /></div>
          <Badge className="mt-3">原始依據</Badge>
          <div className="mt-3 rounded-xl bg-brand-soft/60 p-4 text-[13px] leading-relaxed">
            <div className="mb-2 font-bold">第 {a.no} 條　{a.title}</div>
            {a.text.map((t, i) => <p key={i} className={cn("mb-2", i > 0 && "font-semibold text-brand")}>{render(t)}</p>)}
          </div>
          <div className="mt-4 border-t border-line pt-4 text-xs"><div className="font-bold text-navy-900">關聯內規</div><button className="mt-1.5 font-semibold text-brand hover:underline">{a.related} ↗</button><p className="mt-2 text-sub">現行規定：{a.current}</p></div>
          <GhostBtn className="mt-4" onClick={() => go("diff")}><Columns2 size={14} />開啟完整差異對照</GhostBtn>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">AI 判斷</h3><p className="mt-0.5 text-xs text-sub">模型分析 · 2026/10/12 09:30</p></div><Sparkles size={17} className="text-violet" /></div>
          <div className="mt-3 flex items-center gap-2"><Badge tone="danger">{a.level}</Badge><Badge tone="violet">信心 {a.conf}%</Badge></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-violet to-brand" style={{ width: `${a.conf}%` }} /></div>
          <h4 className="mt-4 text-[15px] font-bold leading-snug text-navy-900">{a.headline}</h4>
          <div className="mt-4 text-xs font-bold">判斷理由</div>
          <ol className="mt-1.5 space-y-1.5 text-[13px] text-sub">{a.reasons.map((r, i) => <li key={i} className="flex gap-2"><b className="text-brand">{i + 1}.</b>{r}</li>)}</ol>
          <div className="mt-4 text-xs font-bold">建議因應</div>
          <p className="mt-1.5 text-[13px] text-sub">{a.advice}</p>
          <div className="mt-4 rounded-xl bg-warn-soft p-3.5"><div className="text-xs font-bold text-warn">待確認事項</div><p className="mt-1 text-xs leading-relaxed text-sub">{a.warn}</p></div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">人工決定</h3><p className="mt-0.5 text-xs text-sub">複核人：林怡君 · 法遵管理員</p></div><UserCheck size={17} className="text-brand" /></div>
          <div className="mt-4 text-xs font-bold">複核結果 <span className="text-danger">*</span></div>
          <div className="mt-2 space-y-2">
            {CHOICES.map((c, i) => (
              <button key={c} disabled={d.done} onClick={() => upd({ c: i })} className={cn("flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-[13px] transition", d.c === i ? "border-brand bg-brand-soft font-semibold text-brand" : "border-line hover:border-brand/40")}>
                <span className={cn("grid h-4 w-4 place-items-center rounded-full border-2", d.c === i ? "border-brand" : "border-slate-300")}>{d.c === i && <i className="h-2 w-2 rounded-full bg-brand" />}</span>{c}
              </button>
            ))}
          </div>
          <div className="mt-4 text-xs font-bold">決定理由與調整內容 <span className="text-danger">*</span></div>
          <textarea disabled={d.done} value={d.note} onChange={(e) => upd({ note: e.target.value })} rows={5} placeholder="請說明採納或調整的理由…" className="mt-2 w-full resize-none rounded-xl border border-line p-3 text-[13px] leading-relaxed outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 disabled:bg-slate-50" />
          <div className="mt-3 grid grid-cols-2 gap-2.5"><Select label="責任" value="營運部" options={["營運部", "法遵部", "資訊部"]} onChange={() => {}} /><Select label="到期" value="10/23" options={["10/23", "10/30", "11/06"]} onChange={() => {}} /></div>
          <div className="mt-3 flex items-center gap-2 text-xs text-brand"><Paperclip size={13} />KYC 修訂草稿.pdf<span className="ml-auto text-faint">284 KB</span></div>
          {d.done ? <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-ok-soft py-3 text-sm font-bold text-ok"><CheckCheck size={16} />已提交</div> : <GhostBtn className="mt-4 w-full justify-center" onClick={() => toast("草稿已儲存")}><Save size={14} />儲存草稿</GhostBtn>}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between"><div className="flex items-center gap-2"><History size={18} className="text-brand" /><div><h3 className="font-bold text-navy-900">複核與稽核紀錄</h3><p className="mt-0.5 text-xs text-sub">每筆紀錄保留時間、執行人員與版本，確保決策可追溯</p></div></div><Badge tone="warn">尚未提交完成決定</Badge></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {logs.map((l, i) => (
            <div key={i} className="flex gap-3 animate-rise"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: l.color }}><BookOpen size={14} /></span><div><div className="text-[13px] font-bold text-navy-900">{l.t}</div><div className="text-[11px] text-sub">{l.time}</div><div className="text-[11px] text-faint">{l.by}</div></div></div>
          ))}
        </div>
      </Card>
    </>
  );
}
