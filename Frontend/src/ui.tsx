import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Info, Search, X } from "lucide-react";
import { INDUSTRIES, REGS, regulationsForIndustries, type Reg, type Risk } from "./data";
import { useStore } from "./store";

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...p} className={cn("rounded-2xl bg-white shadow-tile ring-1 ring-line/70", className)}>
      {children}
    </div>
  );
}

const TONES: Record<string, string> = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  ok: "bg-ok-soft text-ok",
  brand: "bg-brand-soft text-brand",
  violet: "bg-violet-soft text-violet",
  teal: "bg-teal-soft text-teal",
  gray: "bg-slate-100 text-sub",
};
export function Badge({ tone = "gray", children, className }: { tone?: string; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold", TONES[tone], className)}>{children}</span>;
}
export const riskTone = (r: string) => (r.startsWith("高") ? "danger" : r.startsWith("中") ? "warn" : "ok");
export const RiskBadge = ({ risk }: { risk: Risk | string }) => <Badge tone={riskTone(risk)}>{risk}</Badge>;
export const statusTone = (s: string) => ({ 待複核: "warn", 分析完成: "brand", 處理中: "violet", 已確認: "ok" } as Record<string, string>)[s] ?? "gray";

export function PageHeader({ title, sub, action, className }: { title: string; sub: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4 animate-rise", className)}>
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-navy-900">{title}</h1>
        <p className="mt-1 text-sm text-sub">{sub}</p>
      </div>
      {action}
    </div>
  );
}

export function PrimaryBtn({ children, onClick, className, disabled }: { children: ReactNode; onClick?: () => void; className?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("inline-flex items-center gap-2 rounded-xl border border-accent/70 bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(6,28,42,0.16)] transition hover:-translate-y-0.5 hover:bg-navy-800 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0", className)}>
      {children}
    </button>
  );
}
export function GhostBtn({ children, onClick, className, active, disabled }: { children: ReactNode; onClick?: () => void; className?: string; active?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-ink", active ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-ink", className)}>
      {children}
    </button>
  );
}



export function Select({ label, value, options, onChange, className }: { label: string; value: string; options: string[]; onChange: (v: string) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button onClick={() => setOpen(!open)} className={cn("flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-[13px] transition hover:border-brand/50", open ? "border-brand ring-4 ring-brand/10" : "border-line")}>
        <span className="truncate"><span className="text-sub">{label}：</span><b className="font-semibold">{value}</b></span>
        <ChevronDown size={15} className={cn("shrink-0 text-faint transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 min-w-max overflow-hidden rounded-xl bg-white p-1 shadow-pop ring-1 ring-line animate-pop">
          {options.map((o) => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }} className={cn("flex w-full items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-brand-soft", o === value && "bg-brand-soft font-semibold text-brand")}>
              {o}
              {o === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", value === o.v ? "bg-white text-brand shadow-sm" : "text-sub hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function RegBar({ extra }: { extra?: ReactNode }) {
  const { reg, setRegId, toast, industryIds } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const companyRegIds = new Set(regulationsForIndustries(industryIds).map((item) => item.id));
  const options = REGS
    .filter((item) => (showAll || query.trim() || companyRegIds.has(item.id))
      && (!query.trim() || `${item.name} ${item.id} ${item.topic} ${item.industries.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())))
    .sort((first, second) => Number(companyRegIds.has(second.id)) - Number(companyRegIds.has(first.id)));
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <Card className="relative z-20 flex flex-wrap items-center gap-4 p-4 animate-rise">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-soft to-white text-brand ring-1 ring-brand/15"><FileText size={20} /></div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold text-navy-900">{reg.name}（示範）</div>
        <div className="mt-0.5 text-xs text-sub">{reg.id} · {reg.article} · 預計生效日 {reg.effective}</div>
      </div>
      {extra}
      <RiskBadge risk={reg.risk} />
      <Badge tone="brand">{reg.topic}</Badge>
      <div ref={ref} className="relative">
        <GhostBtn onClick={() => setOpen(!open)}>切換法規 <ChevronDown size={14} /></GhostBtn>
        {open && (
          <div className="absolute right-0 top-full z-40 mt-2 w-[min(420px,calc(100vw-2rem))] rounded-2xl bg-white p-2 shadow-pop ring-1 ring-line animate-pop">
            <label className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs focus-within:border-brand"><Search size={14} className="text-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋所有產業法規、主題或編號" className="min-w-0 flex-1 bg-transparent outline-none" /></label>
            <div className="flex items-center justify-between gap-2 px-2 py-2 text-[10px] text-sub">
              <span>{industryIds.length ? `優先顯示：${INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、")}` : "尚未設定公司產業"}</span>
              <button type="button" onClick={() => setShowAll(!showAll)} className="shrink-0 font-semibold text-brand">{showAll ? "僅顯示公司產業" : "顯示所有產業"}</button>
            </div>
            <div className="max-h-72 overflow-auto">
            {options.map((r) => (
              <button key={r.id} onClick={() => { setRegId(r.id); setOpen(false); setQuery(""); toast(`已切換至「${r.name}」`); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-soft", r.id === reg.id && "bg-brand-soft")}>
                <span className={cn("h-8 w-1 rounded-full", r.risk === "高風險" ? "bg-danger" : r.risk === "中風險" ? "bg-warn" : "bg-ok")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{r.name}</span>
                  <span className="text-[11px] text-sub">{r.id} · {r.topic} · {r.industries.join("、")}</span>
                </span>
                {!companyRegIds.has(r.id) && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-sub">其他產業</span>}
                {r.id === reg.id && <Check size={14} className="text-brand" />}
              </button>
            ))}
            {!options.length && <div className="px-3 py-6 text-center text-xs text-sub">找不到符合的法規</div>}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function Modal({ open, onClose, title, children, width = "max-w-lg" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-navy-950/45 p-4 backdrop-blur-[3px]" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className={cn("w-full rounded-2xl bg-white p-6 shadow-pop animate-pop", width)}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-900">{title}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-sub hover:bg-slate-100"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-medium text-white shadow-pop animate-pop">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-navy-900"><Check size={12} strokeWidth={3} /></span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function Marquee({ children, reverse, className }: { children: ReactNode; reverse?: boolean; className?: string }) {
  return (
    <div className={cn("marquee-pause overflow-hidden", className)}>
      <div className={cn("flex w-max gap-4", reverse ? "animate-marquee-rev" : "animate-marquee")}>
        <div className="flex shrink-0 gap-4">{children}</div>
        <div className="flex shrink-0 gap-4" aria-hidden>{children}</div>
      </div>
    </div>
  );
}

export function useCarousel(len: number, ms = 5000) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || len < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % len), ms);
    return () => clearInterval(t);
  }, [paused, len, ms]);
  return { i, set: (n: number) => setI((n + len) % len), next: () => setI((x) => (x + 1) % len), prev: () => setI((x) => (x - 1 + len) % len), setPaused };
}

export function CarouselDots({ n, i, set, light }: { n: number; i: number; set: (i: number) => void; light?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: n }).map((_, k) => (
        <button key={k} onClick={() => set(k)} aria-label={`第 ${k + 1} 張`} className={cn("h-1.5 rounded-full transition-all", k === i ? (light ? "w-6 bg-white" : "w-6 bg-brand") : light ? "w-1.5 bg-white/35" : "w-1.5 bg-slate-300")} />
      ))}
    </div>
  );
}
export function ArrowBtns({ prev, next, light }: { prev: () => void; next: () => void; light?: boolean }) {
  const c = cn("grid h-8 w-8 place-items-center rounded-full border transition", light ? "border-white/25 text-white hover:bg-white/15" : "border-line bg-white text-sub hover:border-brand hover:text-brand");
  return (
    <div className="flex gap-2">
      <button onClick={prev} className={c} aria-label="上一張"><ChevronLeft size={16} /></button>
      <button onClick={next} className={c} aria-label="下一張"><ChevronRight size={16} /></button>
    </div>
  );
}

export function CountUp({ to, pad = 0, suffix = "", ms = 900 }: { to: number; pad?: number; suffix?: string; ms?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{String(v).padStart(pad, "0")}{suffix}</>;
}

export function Bar({ value, color = "#10243A", h = "h-2" }: { value: number; color?: string; h?: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value), 60); return () => clearTimeout(t); }, [value]);
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-slate-100", h)}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${w}%`, background: color }} />
    </div>
  );
}
