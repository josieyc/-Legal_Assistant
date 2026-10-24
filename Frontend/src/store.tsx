import { createContext, useCallback, useEffect, useContext, useState, type ReactNode } from "react";
import { REGS, TASKS, type DiffInsight, type Reg, type Task } from "./data";
import { RULES_SEED, type IRule } from "./rulesData";

export interface ReviewContext {
  regId: string;
  articleNo: number;
  insight: DiffInsight;
}

export interface ReviewAuditEntry {
  id: string;
  regId: string;
  articleNo: number;
  action: string;
  detail: string;
  actor: string;
  timestamp: string;
}

const load = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem("reginsight:" + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
};
const save = (k: string, v: unknown) => { try { localStorage.setItem("reginsight:" + k, JSON.stringify(v)); } catch { /* ignore */ } };
export const authStore = { get: () => load("auth", false), set: (v: boolean) => save("auth", v) };

export type PageKey = "dashboard" | "rules" | "diff" | "impact" | "heat" | "kanban" | "review" | "qa" | "reports";

interface Store {
  page: PageKey;
  go: (p: PageKey) => void;
  reg: Reg;
  setRegId: (id: string) => void;
  industryIds: string[];
  setIndustryIds: (ids: string[]) => void;
  ruleFocusId: string;
  setRuleFocusId: (id: string) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  toast: (msg: string) => void;
  toasts: { id: number; msg: string }[];
  qaSeed: string;
  askQa: (q: string) => void;
  rules: IRule[];
  setRules: React.Dispatch<React.SetStateAction<IRule[]>>;
  reviewContext: ReviewContext | null;
  sendToReview: (context: ReviewContext) => void;
  reviewAudit: ReviewAuditEntry[];
  addReviewAudit: (entry: Omit<ReviewAuditEntry, "id" | "actor" | "timestamp">) => void;
  openSearch: boolean;
  setOpenSearch: (v: boolean) => void;
}

const Ctx = createContext<Store>(null as unknown as Store);
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageKey>(() => load<PageKey>("page", "dashboard"));
  const [regId, setRegId] = useState(() => load("reg", REGS[0].id));
  const [industryIds, setIndustryIds] = useState<string[]>(() => load("industries", ["bank"]));
  const [ruleFocusId, setRuleFocusId] = useState("");
  const [rules, setRules] = useState<IRule[]>(() => {
    const saved = load<IRule[] | null>("demo-rules", null);
    if (!saved) return RULES_SEED;
    const addedRules = RULES_SEED.filter((rule) => ["r9", "r10"].includes(rule.id) && !saved.some((item) => item.id === rule.id));
    return [...saved, ...addedRules];
  });
  const [tasks, setTasks] = useState<Task[]>(() => load("tasks", TASKS));
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(() => load("review-context", null));
  const [reviewAudit, setReviewAudit] = useState<ReviewAuditEntry[]>(() => load("review-audit", []));
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [qaSeed, setQaSeed] = useState("");
  const [openSearch, setOpenSearch] = useState(false);

  useEffect(() => save("page", page), [page]);
  useEffect(() => save("reg", regId), [regId]);
  useEffect(() => save("industries", industryIds), [industryIds]);
  useEffect(() => save("tasks", tasks), [tasks]);
  useEffect(() => save("demo-rules", rules), [rules]);
  useEffect(() => save("review-context", reviewContext), [reviewContext]);
  useEffect(() => save("review-audit", reviewAudit), [reviewAudit]);

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

  const addReviewAudit = useCallback((entry: Omit<ReviewAuditEntry, "id" | "actor" | "timestamp">) => {
    setReviewAudit((entries) => [{
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      actor: "使用者",
      timestamp: new Date().toISOString(),
    }, ...entries]);
  }, []);

  const sendToReview = (context: ReviewContext) => {
    setReviewContext(context);
    setRegId(context.regId);
    addReviewAudit({
      regId: context.regId,
      articleNo: context.articleNo,
      action: "送交人工複核",
      detail: `AI 重點解析：${context.insight.t}`,
    });
    go("review");
  };

  const reg = REGS.find((r) => r.id === regId) ?? REGS[0];

  return (
    <Ctx.Provider value={{ page, go, reg, setRegId, industryIds, setIndustryIds, ruleFocusId, setRuleFocusId, tasks, setTasks, rules, setRules, reviewContext, sendToReview, reviewAudit, addReviewAudit, toast, toasts, qaSeed, askQa, openSearch, setOpenSearch }}>
      {children}
    </Ctx.Provider>
  );
}
