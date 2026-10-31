import { useState } from "react";
import { ArrowRight, Check, FileUp, FileText, Lock, Mail, ShieldCheck, Sparkles, Trash2, UploadCloud, User, Building2 } from "lucide-react";
import { INDUSTRIES, regulationsForIndustries } from "../data";
import { ArrowBtns, CarouselDots, Marquee, cn, useCarousel } from "../ui";
import { useStore } from "../store";

const SLIDES = [
  { k: "01", t: "法規異動，即時掌握", d: "自動蒐集主管機關公告，AI 解析重點並標註風險等級。", c: "#D6C1A6" },
  { k: "02", t: "新舊條文，一眼對照", d: "逐條標示新增、刪除與修改，快速理解修訂核心。", c: "#A9B8C3" },
  { k: "03", t: "影響到內規與部門", d: "自動映射受影響內規，並產出建議因應措施與信心程度。", c: "#B99A78" },
  { k: "04", t: "從複核到結案的閉環", d: "待辦看板、人工複核、稽核軌跡，讓每次決策有跡可循。", c: "#E2D8C8" },
];
const FILES = [["客戶審查作業辦法.pdf", "1.2 MB"], ["洗錢防制紀錄保存政策.docx", "380 KB"], ["委外服務監督作業程序.pdf", "910 KB"]];

export default function Auth({ onEnter }: { onEnter: () => void }) {
  const { toast, industryIds, setIndustryIds, setRegId, setUserName } = useStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>(industryIds);
  const [files, setFiles] = useState<string[][]>([]);
  const [name, setName] = useState("");
  const [drag, setDrag] = useState(false);
  const car = useCarousel(SLIDES.length, 4500);
  const s = SLIDES[car.i];

  const addSample = () => { setFiles(FILES); toast("已匯入 3 份示範內規"); };
  const field = "flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10";
  const input = "w-full bg-transparent text-sm outline-none placeholder:text-faint";

  return (
    <div className="grid h-full lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-12 text-white lg:flex lg:flex-col" onMouseEnter={() => car.setPaused(true)} onMouseLeave={() => car.setPaused(false)}>
        <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_30%_30%,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full blur-3xl transition-colors duration-1000" style={{ background: s.c, opacity: 0.28 }} />
        <div className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-violet/30 blur-3xl animate-float" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-[#D6C1A6]"><ShieldCheck size={22} strokeWidth={1.8} /></div>
          <div className="leading-tight"><div className="text-lg font-semibold tracking-wide">ForesLex</div><div className="mt-1 text-xs tracking-wide text-white/55">法瞰-以 AI 洞察法規，以先見掌握風險</div></div>
        </div>
        <div className="relative mt-auto mb-auto max-w-xl">
          <div key={car.i} className="animate-rise">
            <div className="font-mono text-7xl font-semibold" style={{ color: s.c }}>{s.k}</div>
            <h2 className="mt-4 text-4xl font-extrabold leading-tight">{s.t}</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-white/70">{s.d}</p>
          </div>
          <div className="mt-8 flex items-center gap-6"><CarouselDots n={SLIDES.length} i={car.i} set={car.set} light /><ArrowBtns prev={car.prev} next={car.next} light /></div>
        </div>
        <div className="relative">
          <div className="mb-3 text-[11px] font-semibold tracking-widest text-white/40">本週監理動態</div>
          <Marquee>
            {["防制洗錢作業準則修正", "消費者申訴時限縮短", "資安管理要點新增", "授信風險指引更新", "個資保護規範生效倒數"].map((t, i) => (
              <span key={t} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-xs ring-1 ring-white/10"><i className="mr-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: SLIDES[i % 4].c }} />{t}</span>
            ))}
          </Marquee>
        </div>
      </section>

      <section className="flex flex-col overflow-auto bg-white">
        <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 py-10">
          <div className="mb-8 inline-flex w-fit rounded-xl bg-slate-100 p-1">
            {(["login", "register"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setStep(0); }} className={cn("rounded-lg px-5 py-2 text-sm font-semibold transition", mode === m ? "bg-white text-brand shadow-sm" : "text-sub")}>{m === "login" ? "登入" : "註冊"}</button>
            ))}
          </div>

          {mode === "login" ? (
            <div key="login" className="animate-rise space-y-5">
              <div><h1 className="text-3xl font-extrabold text-navy-900">歡迎回來</h1><p className="mt-1.5 text-sm text-sub">登入以進入您的監理智慧工作台。</p></div>
              <label className={field}><Mail size={16} className="text-faint" /><input className={input} defaultValue="yichun.lin@demo-bank.tw" /></label>
              <label className={field}><Lock size={16} className="text-faint" /><input className={input} type="password" defaultValue="demo1234" /></label>
              <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-sub"><input type="checkbox" defaultChecked className="accent-brand" />保持登入</label><button className="font-semibold text-brand">忘記密碼？</button></div>
              <button onClick={onEnter} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,36,58,0.24)] transition hover:-translate-y-0.5 hover:bg-navy-800">登入平台 <ArrowRight size={16} /></button>
              <div className="flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />或<span className="h-px flex-1 bg-line" /></div>
              <button onClick={onEnter} className="w-full rounded-xl border border-line py-3 text-sm font-semibold transition hover:border-brand hover:text-brand">以企業 SSO 登入（示範）</button>
            </div>
          ) : (
            <div key={"reg" + step} className="animate-rise space-y-5">
              <div className="flex items-center gap-2">
                {["帳號", "選擇產業", "匯入內規"].map((l, i) => (
                  <div key={l} className="flex flex-1 items-center gap-2">
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition", i < step ? "bg-ok text-white" : i === step ? "bg-brand text-white" : "bg-slate-100 text-faint")}>{i < step ? <Check size={12} /> : i + 1}</span>
                    <span className={cn("text-xs font-semibold", i === step ? "text-ink" : "text-faint")}>{l}</span>
                    {i < 2 && <span className="h-px flex-1 bg-line" />}
                  </div>
                ))}
              </div>
              {step === 0 && (
                <>
                  <div><h1 className="text-3xl font-extrabold text-navy-900">建立帳號</h1><p className="mt-1.5 text-sm text-sub">三步驟完成設定，開始追蹤法規異動。</p></div>
                  <label className={field}><User size={16} className="text-faint" /><input className={input} value={name} onChange={(event) => setName(event.target.value)} placeholder="姓名" autoComplete="name" /></label>
                  <label className={field}><Building2 size={16} className="text-faint" /><input className={input} placeholder="機構名稱" /></label>
                  <label className={field}><Mail size={16} className="text-faint" /><input className={input} placeholder="公司 Email" /></label>
                  <label className={field}><Lock size={16} className="text-faint" /><input className={input} type="password" placeholder="設定密碼" /></label>
                </>
              )}
              {step === 1 && (
                <>
                  <div><h1 className="text-3xl font-extrabold text-navy-900">選擇產業</h1><p className="mt-1.5 text-sm text-sub">可複選；平台會優先顯示本公司產業法規，也可搜尋其他產業規範。</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    {INDUSTRIES.map((o) => {
                      const on = picked.includes(o.id);
                      return (
                        <button key={o.id} onClick={() => setPicked(on ? picked.filter((x) => x !== o.id) : [...picked, o.id])} className={cn("relative rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5", on ? "bg-white shadow-tile" : "border-line bg-white")} style={on ? { borderColor: o.color } : undefined}>
                          <span className="mb-3 grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: o.color }}><Sparkles size={16} /></span>
                          <div className="text-sm font-bold">{o.name}</div>
                          <div className="mt-0.5 text-[11px] text-sub">{o.desc}</div>
                          {on && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white animate-pop" style={{ background: o.color }}><Check size={12} strokeWidth={3} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <div><h1 className="text-3xl font-extrabold text-navy-900">匯入內規</h1><p className="mt-1.5 text-sm text-sub">上傳內部規章，AI 將自動比對法規異動的影響。</p></div>
                  <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); const n = Array.from(e.dataTransfer.files).map((f) => [f.name, `${Math.max(1, Math.round(f.size / 1024))} KB`]); if (n.length) setFiles((x) => [...x, ...n]); }} className={cn("flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition", drag ? "border-brand bg-brand-soft" : "border-slate-300 bg-canvas")}>
                    <UploadCloud size={30} className="text-brand" />
                    <div className="text-sm font-semibold">拖曳檔案至此，或</div>
                    <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-xs font-semibold text-brand ring-1 ring-brand/30 hover:bg-brand-soft">選擇檔案<input type="file" multiple className="hidden" onChange={(e) => { const n = Array.from(e.target.files ?? []).map((f) => [f.name, `${Math.max(1, Math.round(f.size / 1024))} KB`]); setFiles((x) => [...x, ...n]); }} /></label>
                    <button onClick={addSample} className="text-xs font-semibold text-sub underline-offset-2 hover:text-brand hover:underline">或使用示範內規</button>
                    <div className="text-[11px] text-faint">支援 PDF、DOCX、TXT</div>
                  </div>
                  <div className="space-y-2">
                    {files.map(([n, sz], i) => (
                      <div key={n + i} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 animate-pop">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand"><FileText size={16} /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{n}</span><span className="text-[11px] text-ok">已解析 · {sz}</span></span>
                        <button onClick={() => setFiles(files.filter((_, k) => k !== i))} className="text-faint hover:text-danger"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2">
                {step > 0 && <button onClick={() => setStep(step - 1)} className="rounded-xl border border-line px-5 py-3 text-sm font-semibold hover:border-brand">上一步</button>}
                <button onClick={() => {
                  if (step < 2) {
                    if (step === 0 && !name.trim()) {
                      toast("請輸入姓名");
                      return;
                    }
                    if (step === 1 && !picked.length) {
                      toast("請至少選擇一項公司所屬產業");
                      return;
                    }
                    setStep(step + 1);
                    return;
                  }
                  setIndustryIds(picked);
                  setUserName(name.trim());
                  const firstIndustryRegulation = regulationsForIndustries(picked)[0];
                  if (firstIndustryRegulation) setRegId(firstIndustryRegulation.id);
                  onEnter();
                }} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,36,58,0.24)] transition hover:-translate-y-0.5 hover:bg-navy-800">
                  {step < 2 ? "下一步" : files.length ? "完成並進入平台" : "略過並進入平台"} {step < 2 ? <ArrowRight size={16} /> : <FileUp size={16} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
