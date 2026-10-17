import { useEffect, useState } from "react";
import { Bell, ClipboardCheck, BookMarked, Columns2, GitBranch, Grid3x3, HelpCircle, KanbanSquare, LayoutDashboard, Menu, MessagesSquare, Search, ShieldCheck, ChevronsUpDown, X, ArrowRight, LogOut } from "lucide-react";
import { StoreProvider, authStore, useStore, type PageKey } from "./store";
import { REGS, TICKER } from "./data";
import { Marquee, Toasts, cn, Badge } from "./ui";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Diff from "./pages/Diff";
import Impact from "./pages/Impact";
import Heat from "./pages/Heat";
import Kanban from "./pages/Kanban";
import Review from "./pages/Review";
import QA from "./pages/QA";
import Rules from "./pages/Rules";

const NAV: { k: PageKey; label: string; icon: typeof Bell }[] = [
  { k: "dashboard", label: "法規動態", icon: LayoutDashboard },
  { k: "rules", label: "內規管理", icon: BookMarked },
  { k: "diff", label: "差異對照", icon: Columns2 },
  { k: "impact", label: "影響分析", icon: GitBranch },
  { k: "heat", label: "風險熱度圖", icon: Grid3x3 },
  { k: "kanban", label: "待辦看板", icon: KanbanSquare },
  { k: "review", label: "複核頁", icon: ClipboardCheck },
  { k: "qa", label: "問答", icon: MessagesSquare },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-navy-800 shadow-[0_6px_18px_rgba(0,0,0,0.25)]"><ShieldCheck size={22} /></div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold text-white">AI 法規與監理小助手</div>
        <div className="text-[11px] text-white/60">Lagal_Assistant</div>
      </div>
    </div>
  );
}

function Sidebar({ onClose, onLogout }: { onClose?: () => void; onLogout: () => void }) {
  const { page, go, tasks } = useStore();
  const pending = tasks.filter((t) => t.col !== "done").length;
  return (
    <aside className="relative flex h-full w-[236px] flex-col overflow-hidden bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950 p-4 text-white">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      <div className="relative flex items-center justify-between">
        <Logo />
        {onClose && <button onClick={onClose} className="text-white/70"><X size={18} /></button>}
      </div>
      <button className="relative mt-5 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/15">
        <span>
          <span className="block text-[10px] text-white/55">示範金融機構</span>
          <span className="text-xs font-medium">法令遵循管理中心</span>
        </span>
        <ChevronsUpDown size={14} className="text-white/50" />
      </button>
      <div className="relative mb-2 mt-6 px-2 text-[10px] font-semibold tracking-widest text-white/45">監理智慧工作台</div>
      <nav className="relative flex flex-col gap-1">
        {NAV.map(({ k, label, icon: I }) => (
          <button key={k} onClick={() => { go(k); onClose?.(); }} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition", page === k ? "bg-brand text-white shadow-[0_8px_22px_rgba(27,89,248,0.45)]" : "text-white/72 hover:bg-white/10 hover:text-white")}>
            <I size={17} className={cn("transition group-hover:scale-110")} />
            <span className="flex-1 text-left">{label}</span>
            {k === "kanban" && <span className="rounded-md bg-white/20 px-1.5 text-[11px] font-semibold">{pending}</span>}
          </button>
        ))}
      </nav>
      <div className="relative mt-auto space-y-3">
        <div className="rounded-xl bg-white/8 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-ring" />監理知識庫已更新</div>
          <div className="mt-1 text-[11px] text-white/55">12 份示範文件 · 僅限內部演示</div>
        </div>
        <div className="flex items-center justify-between px-2"><button className="flex items-center gap-2 text-xs text-white/60 hover:text-white"><HelpCircle size={14} />操作指南</button><button onClick={onLogout} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white"><LogOut size={14} />登出</button></div>
      </div>
    </aside>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { page, setOpenSearch, go, tasks } = useStore();
  const [bell, setBell] = useState(false);
  const label = NAV.find((n) => n.k === page)!.label;
  return (
    <header className="relative z-30 flex shrink-0 items-center gap-3 border-b border-line bg-white/85 px-4 py-3 backdrop-blur md:px-8">
      <button onClick={onMenu} className="grid h-9 w-9 place-items-center rounded-lg border border-line lg:hidden"><Menu size={18} /></button>
      <div className="hidden text-[13px] text-sub sm:block">監理智慧工作台 <span className="mx-1.5 text-faint">›</span> <b className="text-ink">{label}</b></div>
      <div className="ml-auto flex items-center gap-3">
        <button onClick={() => setOpenSearch(true)} className="flex w-56 items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2 text-left text-xs text-faint transition hover:border-brand/40 md:w-72">
          <Search size={14} /><span className="flex-1">搜尋法規、內規與裁罰案例</span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-line">⌘K</kbd>
        </button>
        <div className="relative">
          <button onClick={() => setBell(!bell)} className="relative grid h-9 w-9 place-items-center rounded-xl text-sub hover:bg-slate-100"><Bell size={18} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger ring-2 ring-white" /></button>
          {bell && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white p-2 shadow-pop ring-1 ring-line animate-pop">
              <div className="px-3 py-2 text-xs font-bold text-navy-900">通知</div>
              {[["金管會修正防制洗錢作業準則", "14 分鐘前", "diff"], [`${tasks.filter((t) => t.col === "todo").length} 項待確認任務即將到期`, "1 小時前", "kanban"], ["AI 完成 REG-2026-013 影響分析", "3 小時前", "impact"]].map(([t, w, k]) => (
                <button key={t} onClick={() => { go(k as PageKey); setBell(false); }} className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-soft">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span><span className="block text-[13px] font-medium">{t}</span><span className="text-[11px] text-faint">{w}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-violet text-sm font-bold text-white">林</div>
          <div className="hidden leading-tight sm:block"><div className="text-[13px] font-semibold">林怡君</div><div className="text-[11px] text-sub">法遵管理員</div></div>
        </div>
      </div>
    </header>
  );
}

function SearchPalette() {
  const { openSearch, setOpenSearch, go, setRegId } = useStore();
  const [q, setQ] = useState("");
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpenSearch(true); }
      if (e.key === "Escape") setOpenSearch(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpenSearch]);
  if (!openSearch) return null;
  const regs = REGS.filter((r) => (r.name + r.id + r.topic).includes(q));
  const pages = NAV.filter((n) => n.label.includes(q));
  return (
    <div className="fixed inset-0 z-[90] grid place-items-start bg-navy-950/50 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={() => setOpenSearch(false)}>
      <div onMouseDown={(e) => e.stopPropagation()} className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-pop animate-pop">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4"><Search size={18} className="text-brand" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋法規名稱、編號或頁面…" className="flex-1 bg-transparent text-[15px] outline-none" /></div>
        <div className="max-h-[50vh] overflow-auto p-2">
          {pages.length > 0 && <div className="px-3 py-1.5 text-[11px] font-semibold text-faint">前往頁面</div>}
          {pages.map((n) => (<button key={n.k} onClick={() => { go(n.k); setOpenSearch(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-brand-soft"><n.icon size={16} className="text-brand" />{n.label}<ArrowRight size={14} className="ml-auto text-faint" /></button>))}
          {regs.length > 0 && <div className="px-3 py-1.5 text-[11px] font-semibold text-faint">法規（選取後切換至差異對照）</div>}
          {regs.map((r) => (<button key={r.id} onClick={() => { setRegId(r.id); go("diff"); setOpenSearch(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-soft"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{r.name}</span><span className="text-[11px] text-sub">{r.id} · {r.topic}</span></span><Badge tone={r.risk === "高風險" ? "danger" : r.risk === "中風險" ? "warn" : "ok"}>{r.risk}</Badge></button>))}
          {!regs.length && !pages.length && <div className="p-8 text-center text-sm text-sub">找不到符合「{q}」的結果</div>}
        </div>
      </div>
    </div>
  );
}

function Ticker() {
  const tone: Record<string, string> = { danger: "bg-danger", brand: "bg-brand", warn: "bg-warn", violet: "bg-violet", teal: "bg-teal", ok: "bg-ok" };
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-line bg-navy-900 py-2 text-white">
      <div className="ml-4 flex shrink-0 items-center gap-2 text-[11px] font-bold tracking-widest md:ml-8"><span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse-ring" />LIVE</div>
      <Marquee className="flex-1" >
        {TICKER.map((t) => (
          <span key={t.text} className="flex items-center gap-2 whitespace-nowrap text-xs text-white/85">
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", tone[t.tone])}>{t.tag}</span>{t.text}<span className="ml-4 text-white/25">◆</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { page } = useStore();
  const [drawer, setDrawer] = useState(false);
  const Page = { dashboard: Dashboard, rules: Rules, diff: Diff, impact: Impact, heat: Heat, kanban: Kanban, review: Review, qa: QA }[page];
  return (
    <div className="flex h-full">
      <div className="hidden shrink-0 lg:block"><Sidebar onLogout={onLogout} /></div>
      {drawer && (
        <div className="fixed inset-0 z-[70] flex lg:hidden"><div className="animate-pop"><Sidebar onClose={() => setDrawer(false)} onLogout={onLogout} /></div><div className="flex-1 bg-navy-950/50" onClick={() => setDrawer(false)} /></div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawer(true)} />
        <Ticker />
        <main id="main-scroll" className="flex-1 overflow-auto">
          <div key={page} className="mx-auto max-w-[1320px] space-y-5 px-4 py-7 md:px-8"><Page /></div>
        </main>
      </div>
      <SearchPalette />
      <Toasts />
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => authStore.get());
  const enter = () => { authStore.set(true); setAuthed(true); };
  const logout = () => { authStore.set(false); setAuthed(false); };
  return (
    <StoreProvider>
      {authed ? <Shell onLogout={logout} /> : <Auth onEnter={enter} />}
      {!authed && <Toasts />}
    </StoreProvider>
  );
}
