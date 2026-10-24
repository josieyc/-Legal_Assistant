export type RuleStatus = "生效中" | "修訂中" | "草稿";
export interface Clause { id: string; no: string; text: string; ref?: string }
export interface Hist { v: string; date: string; by: string; note: string }
export interface IRule {
  id: string;
  code: string;
  name: string;
  dept: string;
  category: string;
  version: string;
  status: RuleStatus;
  updated: string;
  owner: string;
  clauses: Clause[];
  linked: string[];
  health: number;
  dirty: number;
  pending?: { reg: string; reason: string };
  history: Hist[];
}

export const RULE_CATEGORIES = ["作業辦法", "管理政策", "作業程序", "稽核制度"];
export const TODAY = "2026/10/17";

let n = 0;
const cl = (no: string, text: string, ref?: string): Clause => ({ id: `c${++n}`, no, text, ref });

export const RULES_SEED: IRule[] = [
  {
    id: "r1", code: "KYC-001", name: "客戶審查作業辦法", dept: "營運部", category: "作業辦法", version: "v1.3", status: "生效中", updated: "2025/07/02", owner: "王志明", health: 58, dirty: 0,
    clauses: [cl("第 6 點", "金融機構應依客戶風險程度進行持續審查。"), cl("第 7 點", "高風險客戶應每年辦理一次定期審查，並保存審查紀錄。", "第 8 條"), cl("第 8 點", "審查結果由業務單位主管核准。"), cl("第 9 點", "客戶風險等級變更時，應於五個工作日內更新系統資料。")],
    linked: ["REG-2026-014"], pending: { reg: "REG-2026-014", reason: "新規要求高風險客戶每六個月審查，並需權責主管核准與留存依據。" },
    history: [{ v: "v1.3", date: "2025/07/02", by: "王志明", note: "調整風險等級變更時限" }, { v: "v1.2", date: "2024/11/18", by: "林怡君", note: "新增審查紀錄保存要求" }, { v: "v1.0", date: "2024/01/10", by: "王志明", note: "首次發布" }],
  },
  {
    id: "r2", code: "AML-006", name: "洗錢防制紀錄保存政策", dept: "資訊部", category: "管理政策", version: "v1.1", status: "生效中", updated: "2025/03/21", owner: "李承翰", health: 52, dirty: 0,
    clauses: [cl("第 3 點", "交易監控及相關紀錄應建立集中保存機制。"), cl("第 4 點", "作業紀錄應保存至少五年。", "第 12 條"), cl("第 5 點", "稽核單位得調閱保存紀錄，資訊部應於三個工作日內提供。")],
    linked: ["REG-2026-014"], pending: { reg: "REG-2026-014", reason: "保存期限需由五年延長為七年，並驗證系統調閱能力。" },
    history: [{ v: "v1.1", date: "2025/03/21", by: "李承翰", note: "新增調閱時限" }, { v: "v1.0", date: "2024/05/09", by: "李承翰", note: "首次發布" }],
  },
  {
    id: "r3", code: "OUT-001", name: "委外服務監督作業程序", dept: "資訊部", category: "作業程序", version: "v1.0", status: "生效中", updated: "2024/12/05", owner: "張世文", health: 64, dirty: 0,
    clauses: [cl("第 11 點", "委外服務商應經風控部審查後始得簽約。"), cl("第 12 點", "依契約約定辦理查核。", "第 16 條"), cl("第 13 點", "重要委外每年至少檢視一次服務水準。")],
    linked: ["REG-2026-014", "REG-2026-006"], pending: { reg: "REG-2026-006", reason: "雲端委外需補充風險評估，且契約須明定紀錄保存與查核權限。" },
    history: [{ v: "v1.0", date: "2024/12/05", by: "張世文", note: "首次發布" }],
  },
  {
    id: "r4", code: "CMP-005", name: "法遵風險評估管理辦法", dept: "法遵部", category: "管理政策", version: "v2.1", status: "修訂中", updated: "2026/09/30", owner: "林怡君", health: 71, dirty: 1,
    clauses: [cl("第 5 點", "法遵風險評估應每年辦理至少一次。"), cl("第 7 點", "重大事件發生時，法遵部得啟動專案評估。", "第 8 條"), cl("第 8 點", "評估結果應提報法遵委員會。")],
    linked: ["REG-2026-014"],
    history: [{ v: "v2.1", date: "2026/09/30", by: "林怡君", note: "草案：新增專案評估" }, { v: "v2.0", date: "2025/10/12", by: "林怡君", note: "年度改版" }],
  },
  {
    id: "r5", code: "CS-014", name: "客服申訴處理要點", dept: "客服部", category: "作業程序", version: "v1.6", status: "生效中", updated: "2026/04/08", owner: "陳雅婷", health: 66, dirty: 0,
    clauses: [cl("第 2 點", "客戶申訴應於收件後三十日內回覆。", "第 7 條"), cl("第 3 點", "申訴案件應建檔並每月彙整檢討。"), cl("第 4 點", "重大客訴應即時通報客服部主管。")],
    linked: ["REG-2026-013"], pending: { reg: "REG-2026-013", reason: "申訴回覆時限將由 30 日縮短為 20 日。" },
    history: [{ v: "v1.6", date: "2026/04/08", by: "陳雅婷", note: "新增每月檢討" }],
  },
  {
    id: "r6", code: "CR-003", name: "授信風險管理辦法", dept: "授信部", category: "作業辦法", version: "v3.2", status: "生效中", updated: "2026/06/14", owner: "黃淑芬", health: 88, dirty: 0,
    clauses: [cl("第 4 點", "授信案件應進行信用風險評等。"), cl("第 5 點", "關係人交易應依授權額度提報董事會。", "第 5 條"), cl("第 6 點", "逾期案件應於十日內啟動催收程序。")],
    linked: ["REG-2026-011"],
    history: [{ v: "v3.2", date: "2026/06/14", by: "黃淑芬", note: "補充關係人交易檢核" }],
  },
  {
    id: "r7", code: "PI-002", name: "個資保護管理政策", dept: "法遵部", category: "管理政策", version: "v1.4", status: "生效中", updated: "2026/08/19", owner: "林怡君", health: 93, dirty: 0,
    clauses: [cl("第 8 點", "蒐集個資前應完整告知蒐集目的與利用範圍。", "第 14 條"), cl("第 9 點", "個資事件應於七十二小時內通報主管機關。")],
    linked: ["REG-2026-010", "REG-2026-008"],
    history: [{ v: "v1.4", date: "2026/08/19", by: "林怡君", note: "更新告知事項" }],
  },
  {
    id: "r8", code: "IC-009", name: "內部稽核實施細則", dept: "風控部", category: "稽核制度", version: "v1.0", status: "草稿", updated: "2026/10/10", owner: "張世文", health: 40, dirty: 0,
    clauses: [cl("第 1 點", "稽核計畫應每年度擬定並經董事會核定。"), cl("第 2 點", "稽核報告應於完成後十五日內提報。", "第 11 條")],
    linked: ["REG-2026-007"],
    history: [{ v: "v1.0", date: "2026/10/10", by: "張世文", note: "草稿建立" }],
  },
  {
    id: "r9", code: "TPM-004", name: "第三方資訊服務安全管理辦法", dept: "資訊部", category: "管理政策", version: "v1.0", status: "生效中", updated: "2026/08/12", owner: "李承翰", health: 61, dirty: 0,
    clauses: [cl("第 9 點", "資訊服務供應商應依契約接受定期安全檢視。", "第 21 條"), cl("第 10 點", "供應商缺失應列管並追蹤改善。")],
    linked: ["REG-2026-012"],
    history: [{ v: "v1.0", date: "2026/08/12", by: "李承翰", note: "首次發布" }],
  },
  {
    id: "r10", code: "XBP-002", name: "跨境支付交易監控作業規範", dept: "營運部", category: "作業程序", version: "v1.2", status: "生效中", updated: "2026/05/20", owner: "王志明", health: 57, dirty: 0,
    clauses: [cl("第 5 點", "達申報門檻之跨境交易應完成身分確認及申報。", "第 30 條"), cl("第 6 點", "交易紀錄應保存並定期檢視異常情形。", "第 31 條")],
    linked: ["REG-2026-009"],
    history: [{ v: "v1.2", date: "2026/05/20", by: "王志明", note: "更新跨境交易檢核流程" }],
  },
];

export const bumpVersion = (v: string) => {
  const m = /v(\d+)\.(\d+)/.exec(v);
  return m ? `v${m[1]}.${Number(m[2]) + 1}` : "v1.1";
};
