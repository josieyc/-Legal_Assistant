import { createContext, useCallback, useEffect, useContext, useState, type ReactNode } from "react";
import { REGS, TASKS, type Reg, type Task } from "./data";
import { RULES_SEED, type IRule } from "./rulesData";

const load = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem("reginsight:" + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
};
const save = (k: string, v: unknown) => { try { localStorage.setItem("reginsight:" + k, JSON.stringify(v)); } catch { /* ignore */ } };
export const authStore = { get: () => load("auth", false), set: (v: boolean) => save("auth", v) };

export type PageKey = "dashboard" | "rules" | "diff" | "impact" | "heat" | "kanban" | "review" | "qa";

interface Store {
  page: PageKey;
  go: (p: PageKey) => void;
  reg: Reg;
  setRegId: (id: string) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
  qaSeed: string;
  askQa: (q: string) => void;
  rules: IRule[];
  setRules: React.Dispatch<React.SetStateAction<IRule[]>>;
  openSearch: boolean;
  setOpenSearch: (v: boolean) => void;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageKey>(() => load<PageKey>("page", "dashboard"));
  const [regId, setRegId] = useState(() => load("reg", REGS[0].id));
  const [rules, setRules] = useState<IRule[]>(() => load("rules", RULES_SEED));
  const [tasks, setTasks] = useState<Task[]>(() => load("tasks", TASKS));
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [qaSeed, setQaSeed] = useState("");
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => save("page", page), [page]);
  useEffect(() => save("reg", regId), [regId]);
  useEffect(() => save("tasks", tasks), [tasks]);
  useEffect(() => save("rules", rules), [rules]);

  const toast = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const go = useCallback((p: PageKey) => {
    setPage(p);
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, []);

  const askQa = (q: string) => {
    setQaSeed(q);
    go("qa");
  };

  const reg = REGS.find((r) => r.id === regId) ?? REGS[0];

  return (
    <Ctx.Provider value={{ page, go, reg, setRegId, tasks, setTasks, rules, setRules, toast, toasts, qaSeed, askQa, openSearch, setOpenSearch }}>
      {children}
    </Ctx.Provider>
  );
}
