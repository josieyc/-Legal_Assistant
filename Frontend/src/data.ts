export type Risk = "高風險" | "中風險" | "低風險";
export type Seg = { t: string; k?: "del" | "add" };

export interface Reg {
  id: string;
  name: string;
  article: string;
  note: string;
  topic: string;
  risk: Risk;
  depts: string[];
  date: string;
  status: "待複核" | "分析完成" | "處理中" | "已確認";
  articles: number[];
  effective: string;
  issuer: string;
  industries: string[];
}

export const TOPICS = ["防制洗錢", "消費者保護", "資訊安全", "授信管理", "個資保護"];
export const DEPTS = ["營運部", "法遵部", "資訊部", "風控部", "客服部", "授信部"];
export const INDUSTRIES = [
  { id: "bank", name: "銀行業", desc: "存放款、授信、財管", color: "#061C2A" },
  { id: "ins", name: "保險業", desc: "壽險、產險、再保", color: "#285164" },
  { id: "sec", name: "證券期貨", desc: "經紀、承銷、自營", color: "#153A4B" },
  { id: "trust", name: "投信投顧", desc: "基金、全權委託", color: "#8A6737" },
  { id: "pay", name: "電子支付", desc: "支付、儲值、跨境", color: "#9B7540" },
  { id: "fhc", name: "金融控股", desc: "集團合規與監理", color: "#A9854D" },
];

export const REGS: Reg[] = [
  { id: "REG-2026-014", name: "金融機構防制洗錢作業準則", article: "第 8、12、16 條", note: "新增持續審查及留存要求", topic: "防制洗錢", risk: "高風險", depts: ["法遵", "營運", "資訊"], date: "10/12", status: "待複核", articles: [8, 12, 16], effective: "2026/11/01", issuer: "金管會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
  { id: "REG-2026-013", name: "金融服務消費者保護作業規範", article: "第 7 條", note: "調整申訴回覆時限", topic: "消費者保護", risk: "高風險", depts: ["客服", "法遵"], date: "10/11", status: "分析完成", articles: [7], effective: "2026/12/01", issuer: "金管會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
  { id: "REG-2026-012", name: "金融機構資訊安全管理要點", article: "第 21 條", note: "強化第三方服務監督", topic: "資訊安全", risk: "中風險", depts: ["資訊", "風控"], date: "10/10", status: "處理中", articles: [21], effective: "2027/01/01", issuer: "金管會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
  { id: "REG-2026-011", name: "授信業務風險管理作業指引", article: "第 5 條", note: "補充關係人交易檢核", topic: "授信管理", risk: "中風險", depts: ["授信", "風控"], date: "10/09", status: "分析完成", articles: [5], effective: "2026/12/15", issuer: "銀行局", industries: ["銀行業", "金融控股"] },
  { id: "REG-2026-010", name: "金融機構個人資料保護規範", article: "第 14 條", note: "更新告知事項與紀錄", topic: "個資保護", risk: "低風險", depts: ["法遵", "營運"], date: "10/08", status: "已確認", articles: [14], effective: "2026/11/20", issuer: "個資會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
  { id: "REG-2026-009", name: "電子支付機構業務管理規則", article: "第 30、31 條", note: "調整跨境匯款申報門檻", topic: "防制洗錢", risk: "高風險", depts: ["營運", "風控"], date: "10/07", status: "處理中", articles: [30, 31], effective: "2027/01/15", issuer: "金管會", industries: ["電子支付"] },
  { id: "REG-2026-008", name: "金融機構客戶資料揭露指引", article: "第 3 條", note: "擴大同意取得範圍", topic: "個資保護", risk: "中風險", depts: ["客服", "法遵"], date: "10/05", status: "分析完成", articles: [3], effective: "2026/12/20", issuer: "個資會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
  { id: "REG-2026-007", name: "銀行業內部控制及稽核制度實施辦法", article: "第 11 條", note: "稽核頻率與報告提報修正", topic: "授信管理", risk: "低風險", depts: ["風控"], date: "10/03", status: "已確認", articles: [11], effective: "2026/11/30", issuer: "銀行局", industries: ["銀行業", "金融控股"] },
  { id: "REG-2026-006", name: "金融機構委外作業及監督辦法", article: "第 16 條", note: "加強雲端委外風險評估", topic: "資訊安全", risk: "高風險", depts: ["資訊", "法遵", "風控"], date: "10/01", status: "待複核", articles: [16], effective: "2027/02/01", issuer: "金管會", industries: ["銀行業", "保險業", "證券期貨", "投信投顧", "電子支付", "金融控股"] },
];

export const regulationsForIndustries = (industryIds: string[]) => {
  const industries = INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name);
  return industryIds.length
    ? REGS.filter((regulation) => regulation.industries.some((industry) => industries.includes(industry)))
    : REGS;
};

export const TICKER = [
  { tag: "高風險", text: "金管會修正防制洗錢作業準則，新增高風險客戶每六個月審查", tone: "danger" },
  { tag: "新公告", text: "消費者申訴回覆時限由 30 日縮短為 20 日", tone: "brand" },
  { tag: "生效倒數", text: "個資保護規範將於 2026/11/20 生效，剩餘 36 天", tone: "warn" },
  { tag: "裁罰", text: "某銀行因交易監控缺失遭罰 600 萬元（示範）", tone: "violet" },
  { tag: "草案", text: "金管會預告資安新規草案，意見徵詢至 10/31", tone: "teal" },
  { tag: "已確認", text: "授信風險指引完成法遵部複核並歸檔", tone: "ok" },
];

export const MONTHLY = [
  { m: "5月", v: 11 }, { m: "6月", v: 14 }, { m: "7月", v: 9 }, { m: "8月", v: 17 },
  { m: "9月", v: 18 }, { m: "10月", v: 24 },
];

export interface PenaltyCase {
  title: string;
  who: string;
  date: string;
  fine: string;
  point: string;
  color: string;
  industry: string;
  topic: string;
  relatedRegId: string;
  lesson: string;
  recommendation: string;
}
export const PENALTIES: PenaltyCase[] = [
  {
    title: "客戶審查與交易監控缺失",
    who: "銀行 A",
    date: "2026/10/08",
    fine: "新臺幣 600 萬元",
    point: "高風險客戶審查未落實，交易監控與異常處理紀錄不完整。",
    color: "#e5484d",
    industry: "銀行業",
    topic: "防制洗錢",
    relatedRegId: "REG-2026-014",
    lesson: "客戶風險分級、定期審查頻率與異常交易處理必須形成可追溯的完整證據鏈。",
    recommendation: "盤點高風險客戶審查週期、重大事件觸發機制、主管核准與監控紀錄留存。",
  },
  {
    title: "申訴處理與內控程序缺失",
    who: "銀行 B",
    date: "2026/10/05",
    fine: "新臺幣 200 萬元",
    point: "申訴回覆逾期且處理紀錄不足，未能證明內部時限管理有效。",
    color: "#e8890c",
    industry: "銀行業",
    topic: "消費者保護",
    relatedRegId: "REG-2026-013",
    lesson: "申訴案件需明確設定服務時限、升級處理條件與結案證據。",
    recommendation: "檢查申訴案件 SLA、逾期提醒、主管覆核及回覆內容版本留存。",
  },
  {
    title: "委外雲端服務監督不足",
    who: "證券 C",
    date: "2026/09/28",
    fine: "新臺幣 320 萬元",
    point: "重要委外服務未定期驗證供應商控制措施，契約查核權限與退出安排不足。",
    color: "#7c5cfc",
    industry: "證券業",
    topic: "資訊安全",
    relatedRegId: "REG-2026-006",
    lesson: "委外管理不能止於簽約，應定期驗證服務商控制、資料可攜及退出能力。",
    recommendation: "盤點重要委外契約、查核權限、次委外安排與資料返還演練紀錄。",
  },
  {
    title: "個資外洩通報逾期",
    who: "電支 D",
    date: "2026/09/20",
    fine: "新臺幣 150 萬元",
    point: "發生個資事件後未依內部程序即時通報，事件處理與告知紀錄不完整。",
    color: "#0e9fb3",
    industry: "電子支付",
    topic: "個資保護",
    relatedRegId: "REG-2026-010",
    lesson: "個資事件需有明確通報時限、責任分工、影響評估及完整事件紀錄。",
    recommendation: "檢視個資事件應變流程、通報責任人、時限提醒與演練紀錄。",
  },
];

export interface Article {
  no: number;
  title: string;
  badge: string;
  oldSeg: Seg[][];
  newSeg: Seg[][];
}
export interface DiffInsight { t: string; d: string; ref: string; color: string; }
export interface DiffSet {
  oldVersion: string;
  newVersion: string;
  articles: Article[];
  insights: DiffInsight[];
}
const mk = (s: string, k?: "del" | "add"): Seg => ({ t: s, k });

export const DIFF_SETS: Record<string, DiffSet> = {
  "REG-2026-014": {
    oldVersion: "2025/06/01（示範）",
    newVersion: "2026/10/12（示範）",
    articles: [
      {
        no: 8, title: "客戶持續審查", badge: "重大變動",
        oldSeg: [[mk("金融機構應依客戶風險程度進行持續審查。")], [mk("對高風險客戶，應"), mk("每年辦理一次定期審查", "del"), mk("，並保存審查紀錄。")]],
        newSeg: [[mk("金融機構應依客戶風險程度進行持續審查。")], [mk("對高風險客戶，應至少每六個月辦理一次定期審查，並於重大風險事件發生時啟動加強審查，並保存審查紀錄。", "add")], [mk("審查結果應經權責主管核准，並留存風險評估依據及處理紀錄。", "add")]],
      },
      {
        no: 12, title: "紀錄保存", badge: "要求提高",
        oldSeg: [[mk("金融機構應建立交易監控及紀錄保存機制。")], [mk("相關作業紀錄應保存"), mk("至少五年", "del"), mk("。")]],
        newSeg: [[mk("金融機構應建立交易監控及紀錄保存機制。")], [mk("相關作業紀錄應保存至少七年，並確保可供調閱及追溯。", "add")], [mk("委外處理者亦應遵循相同保存要求，金融機構應定期驗證其執行情形。", "add")]],
      },
      {
        no: 16, title: "委外作業監督", badge: "新增稽核義務",
        oldSeg: [[mk("金融機構應監督外服務之執行情形。")], [mk("依契約約定辦理查核"), mk("。", "del")]],
        newSeg: [[mk("金融機構應監督委外服務之執行情形。")], [mk("應於契約明定紀錄保存要求及查核權限，並定期驗證保存年限、調閱能力與追溯性。", "add")]],
      },
    ],
    insights: [
      { t: "審查頻率提高", d: "高風險客戶由每年一次縮短為每六個月一次；重大事件須啟動加強審查。", ref: "第 8 條", color: "#e5484d" },
      { t: "主管核准與留痕", d: "審查結果須經權責主管核准，並留存風險評估依據。", ref: "第 8 條", color: "#e8890c" },
      { t: "保存期間延長", d: "保存期間由五年延長為七年，且納入委外作業範圍。", ref: "第 12、16 條", color: "#7c5cfc" },
    ],
  },
  "REG-2026-013": {
    oldVersion: "2025/03/01（示範）",
    newVersion: "2026/10/11（示範）",
    articles: [{
      no: 7, title: "申訴處理與回覆", badge: "時限縮短",
      oldSeg: [[mk("金融服務業應建立客戶申訴處理程序。")], [mk("申訴案件應於"), mk("三十日", "del"), mk("內回覆處理結果。")]],
      newSeg: [[mk("金融服務業應提供多元申訴管道，並於受理時告知案件編號及聯絡方式。", "add")], [mk("申訴案件應於二十日內回覆處理結果；複雜案件得延長一次，並應事先通知申訴人。", "add")], [mk("申訴及回覆紀錄應保存至少五年，以供內部稽核。", "add")]],
    }],
    insights: [
      { t: "回覆期限縮短", d: "申訴回覆期限由三十日縮短為二十日，複雜案件須先通知再延長。", ref: "第 7 條", color: "#e5484d" },
      { t: "新增案件追蹤資訊", d: "受理時應提供案件編號及聯絡方式，方便客戶追蹤進度。", ref: "第 7 條", color: "#10243A" },
    ],
  },
  "REG-2026-012": {
    oldVersion: "2024/08/15（示範）",
    newVersion: "2026/10/10（示範）",
    articles: [{
      no: 21, title: "第三方服務管理", badge: "監督強化",
      oldSeg: [[mk("金融機構應評估資訊服務供應商之安全性。")], [mk("依契約約定辦理定期檢視"), mk("。", "del")]],
      newSeg: [[mk("金融機構應於委外前評估供應商之資安能力、事件應變及營運持續機制。", "add")], [mk("委外期間至少每年重新評估一次，並就重大缺失訂定改善期限及追蹤紀錄。", "add")]],
    }],
    insights: [
      { t: "委外前評估擴大", d: "評估範圍新增事件應變與營運持續能力，不只檢視一般資安措施。", ref: "第 21 條", color: "#7c5cfc" },
      { t: "新增年度複評", d: "第三方服務至少每年重新評估，重大缺失須有改善期限與追蹤紀錄。", ref: "第 21 條", color: "#e8890c" },
    ],
  },
  "REG-2026-011": {
    oldVersion: "2025/01/10（示範）",
    newVersion: "2026/10/09（示範）",
    articles: [{
      no: 5, title: "關係人交易檢核", badge: "新增檢核程序",
      oldSeg: [[mk("授信案件應依規定完成徵信及風險評估。")]],
      newSeg: [[mk("授信案件應依規定完成徵信及風險評估。")], [mk("對關係人交易應增加利益衝突檢核，並由非承辦單位覆核交易條件及核准程序。", "add")]],
    }],
    insights: [
      { t: "關係人案件加強把關", d: "新增利益衝突檢核，並要求非承辦單位覆核交易條件及核准程序。", ref: "第 5 條", color: "#e5484d" },
      { t: "覆核責任分離", d: "覆核工作須與案件承辦職責區隔，降低利益衝突風險。", ref: "第 5 條", color: "#10243A" },
    ],
  },
  "REG-2026-010": {
    oldVersion: "2024/11/01（示範）",
    newVersion: "2026/10/08（示範）",
    articles: [{
      no: 14, title: "個人資料蒐集告知", badge: "告知內容更新",
      oldSeg: [[mk("蒐集個人資料時，應告知蒐集目的及利用方式。")], [mk("保存期限依業務需要訂定"), mk("。", "del")]],
      newSeg: [[mk("蒐集個人資料時，應告知蒐集目的、資料類別、利用期間、地區、對象及方式。", "add")], [mk("應明確載明保存期限或決定期限之標準，並留存告知版本及取得同意之紀錄。", "add")]],
    }],
    insights: [
      { t: "告知事項更完整", d: "新增資料類別、利用期間、地區與對象等告知項目。", ref: "第 14 條", color: "#0e9fb3" },
      { t: "同意紀錄須可追溯", d: "須留存告知版本及同意紀錄，並明確說明資料保存期限。", ref: "第 14 條", color: "#7c5cfc" },
    ],
  },
  "REG-2026-009": {
    oldVersion: "2025/05/20（示範）",
    newVersion: "2026/10/07（示範）",
    articles: [
      {
        no: 30, title: "跨境交易申報", badge: "門檻調整",
        oldSeg: [[mk("達規定金額之跨境交易應依程序申報。")], [mk("申報門檻為"), mk("新臺幣五十萬元", "del"), mk("。")]],
        newSeg: [[mk("跨境交易達新臺幣三十萬元，即應依程序申報並完成客戶身分確認。", "add")]],
      },
      {
        no: 31, title: "交易紀錄及異常通報", badge: "通報加強",
        oldSeg: [[mk("機構應保存跨境交易紀錄並定期檢視異常情形。")]],
        newSeg: [[mk("機構應保存跨境交易紀錄至少七年。", "add")], [mk("發現疑似異常交易時，應於內部規定期限內通報專責單位並記錄處理結果。", "add")]],
      },
    ],
    insights: [
      { t: "申報門檻降低", d: "跨境交易申報門檻由五十萬元調降為三十萬元，適用案件將增加。", ref: "第 30 條", color: "#e5484d" },
      { t: "新增異常通報留痕", d: "疑似異常交易須通報專責單位並記錄處理結果。", ref: "第 31 條", color: "#e8890c" },
    ],
  },
  "REG-2026-008": {
    oldVersion: "2025/02/01（示範）",
    newVersion: "2026/10/05（示範）",
    articles: [{
      no: 3, title: "客戶資料提供與同意", badge: "同意範圍擴大",
      oldSeg: [[mk("提供客戶資料予合作機構前，應取得客戶同意。")]],
      newSeg: [[mk("提供客戶資料予合作機構前，應以明確方式取得客戶同意。", "add")], [mk("同意內容應載明資料項目、合作機構名稱、使用目的及撤回方式，並保留同意紀錄。", "add")]],
    }],
    insights: [
      { t: "同意內容具體化", d: "同意須涵蓋資料項目、接收機構、使用目的及撤回方式。", ref: "第 3 條", color: "#0e9fb3" },
      { t: "新增紀錄保存", d: "取得同意後應保留紀錄，供日後查核與客戶權利行使。", ref: "第 3 條", color: "#7c5cfc" },
    ],
  },
  "REG-2026-007": {
    oldVersion: "2024/07/01（示範）",
    newVersion: "2026/10/03（示範）",
    articles: [{
      no: 11, title: "內部稽核與缺失追蹤", badge: "提報頻率調整",
      oldSeg: [[mk("內部稽核單位應定期查核各單位控制作業。")], [mk("稽核報告"), mk("每年提報一次", "del"), mk("，並追蹤缺失改善情形。")]],
      newSeg: [[mk("內部稽核單位應依風險程度調整查核頻率。", "add")], [mk("稽核報告至少每半年提報一次；重大缺失應即時呈報董事會或其授權單位，並追蹤改善完成情形。", "add")]],
    }],
    insights: [
      { t: "報告提報改為半年", d: "稽核報告至少每半年提報一次，重大缺失則須即時呈報。", ref: "第 11 條", color: "#e8890c" },
      { t: "查核頻率依風險調整", d: "稽核單位應依風險程度安排查核，並追蹤缺失改善是否完成。", ref: "第 11 條", color: "#10243A" },
    ],
  },
  "REG-2026-006": {
    oldVersion: "2024/09/01（示範）",
    newVersion: "2026/10/01（示範）",
    articles: [{
      no: 16, title: "雲端委外風險評估", badge: "評估項目增加",
      oldSeg: [[mk("金融機構委外使用雲端服務前，應評估服務供應商及資訊安全風險。")]],
      newSeg: [[mk("金融機構委外使用雲端服務前，應評估資料所在地、次委外安排及服務可攜性。", "add")], [mk("應定期測試退出及資料返還機制，並將測試結果與改善計畫留存備查。", "add")]],
    }],
    insights: [
      { t: "雲端評估範圍擴大", d: "新增資料所在地、次委外安排及服務可攜性等風險評估項目。", ref: "第 16 條", color: "#7c5cfc" },
      { t: "退出機制須實測", d: "應定期測試服務退出與資料返還流程，並保存結果及改善計畫。", ref: "第 16 條", color: "#e5484d" },
    ],
  },
};

export interface Rule { name: string; code: string; clauses: string; reason: string; basis: string; dept: string; level: "高影響" | "中影響" | "低影響"; }
export const RULES: Rule[] = [
  { name: "客戶審查作業辦法", code: "KYC-001", clauses: "第 6~9 點", reason: "高風險客戶目前每年審查，與新規要求的每六個月審查不一致。", basis: "第 8 條", dept: "營運部 / 法遵部", level: "高影響" },
  { name: "洗錢防制紀錄保存政策", code: "AML-006", clauses: "第 4 點", reason: "保存期限仍為五年，需延長至七年並調整系統能力。", basis: "第 12 條", dept: "資訊部 / 營運部", level: "高影響" },
  { name: "委外服務監督作業程序", code: "OUT-001", clauses: "第 12 點", reason: "現行委外查核未納入紀錄保存年限與調閱能力驗證。", basis: "第 16 條", dept: "資訊部 / 風控部", level: "中影響" },
  { name: "法遵風險評估管理辦法", code: "CMP-005", clauses: "第 7 點", reason: "尚未明定重大事件啟動審查與權責主管核准流程。", basis: "第 8 條", dept: "法遵部 / 營運部", level: "中影響" },
  { name: "客服申訴處理要點", code: "CS-014", clauses: "第 3 點", reason: "僅需補充名詞定義，與新規無衝突。", basis: "第 8 條", dept: "客服部", level: "低影響" },
];

export interface Measure { t: string; d: string; owner: string; due: string; status: string; pri: "高" | "中" | "低"; }
export const MEASURES: Measure[] = [
  { t: "修訂高風險客戶審查流程", d: "將定期審查改為每六個月，並列入重大事件觸發與主管核准卡片。", owner: "營運部", due: "2026/10/23", status: "待確認", pri: "高" },
  { t: "調整紀錄保存與系統設定", d: "更新保存政策至七年，完成資料庫留存設定與歷史紀錄調閱測試。", owner: "資訊部", due: "2026/10/26", status: "待確認", pri: "高" },
  { t: "補強委外監督與契約條款", d: "盤點委外契約，納入紀錄保存及查核權限，建立定期驗證清單。", owner: "法遵部", due: "2026/10/28", status: "待確認", pri: "中" },
  { t: "建立重大事件通報演練", d: "每季演練一次，涵蓋審查啟動、主管核准與結果留存。", owner: "風控部", due: "2026/11/05", status: "規劃中", pri: "低" },
];

export const IMPACT_CONF = [
  { label: "條文比對", v: 96 }, { label: "內規映射", v: 91 }, { label: "部門歸屬", v: 88 }, { label: "措施可行性", v: 84 },
];

export const HEAT_PERIODS = ["2026 年 10 月（示範）", "2026 年 9 月（示範）", "2026 年第三季（示範）"];
export const HEAT_SOURCES = ["法規異動 + 裁罰", "僅法規異動", "僅裁罰案例"];
const base = [
  [9, 7, 3, 4, 6],
  [8, 8, 4, 5, 6],
  [6, 3, 9, 2, 7],
  [7, 4, 7, 8, 3],
  [3, 9, 2, 2, 6],
  [5, 3, 3, 8, 2],
];
export function heatMatrix(period: number, source: number) {
  return base.map((row, i) =>
    row.map((v, j) => {
      const shift = period === 0 ? 0 : period === 1 ? ((i + j) % 3) - 1 : ((i * 2 + j) % 4) - 1;
      const s = source === 0 ? 0 : source === 1 ? (v > 6 ? -1 : 0) : (v < 5 ? 1 : -1);
      return Math.max(1, Math.min(10, v + shift + s));
    }),
  );
}
export const scoreTone = (v: number) =>
  v >= 8 ? { bg: "#d85c63", fg: "#fff", label: "高" } : v >= 6 ? { bg: "#efb162", fg: "#3b2300", label: "偏高" } : v >= 4 ? { bg: "#f8dfb2", fg: "#4a3000", label: "中" } : { bg: "#eaf0fa", fg: "#33415c", label: "低" };

export const HEAT_ALERTS = [
  { dept: "營運部", topic: "防制洗錢", level: "高風險", t: "審查流程需於生效前完成調整", d: "確認高風險名單、半年審查頻率與主管核准權限，避免審查延誤缺漏。" },
  { dept: "資訊部", topic: "資訊安全", level: "高風險", t: "第三方服務監督紀錄不足", d: "稽核供應商保存紀錄與調閱測試，涉及委外與雲端服務合約的確認。" },
  { dept: "客服部", topic: "消費者保護", level: "需注意", t: "申訴回覆時限需重新檢視", d: "更新 SLA 與回覆範本，保留近期客訴案例供教育訓練使用。" },
];

export type Pri = "高優先" | "中優先" | "低優先";
export interface Task { id: string; title: string; desc: string; pri: Pri; topic: string; regId?: string; ref: string; owner: string; dept: string; due: string; col: "todo" | "doing" | "done"; progress?: [number, number]; evidence?: string; evidenceFiles?: string[]; reviewer?: string; reviewedAt?: string; }
export const OWNERS = ["王志明", "林怡君", "陳雅婷", "李承翰", "張世文", "黃淑芬"];
export const TASKS: Task[] = [
  { id: "T-101", title: "確認高風險客戶查核頻率調整", desc: "核對半年審查要求與現行 KYC 作業落差。", pri: "高優先", topic: "防制洗錢", regId: "REG-2026-014", ref: "第 8 條", owner: "王志明", dept: "營運部", due: "10/16", col: "todo" },
  { id: "T-102", title: "確認委外紀錄保存適用範圍", desc: "盤點契約及服務商，確認保存義務。", pri: "高優先", topic: "防制洗錢", regId: "REG-2026-014", ref: "第 16 條", owner: "林怡君", dept: "法遵部", due: "10/18", col: "todo" },
  { id: "T-103", title: "評估申訴回覆 SLA 修訂", desc: "確認新時限與客服流程的銜接需求。", pri: "中優先", topic: "消費者保護", regId: "REG-2026-013", ref: "第 7 條", owner: "陳雅婷", dept: "客服部", due: "10/22", col: "todo" },
  { id: "T-104", title: "更新紀錄保存政策與系統設定", desc: "延長保存年限，執行調閱測試。", pri: "高優先", topic: "防制洗錢", regId: "REG-2026-014", ref: "第 12 條", owner: "李承翰", dept: "資訊部", due: "10/26", col: "doing", progress: [3, 5] },
  { id: "T-105", title: "補強第三方服務核准程序", desc: "新增廠管稽核與服務商保存紀錄。", pri: "中優先", topic: "資訊安全", regId: "REG-2026-012", ref: "第 21 條", owner: "張世文", dept: "風控部", due: "10/28", col: "doing", progress: [2, 4] },
  { id: "T-106", title: "修訂關係人交易檢核清單", desc: "完成授信流程盤點與內規修訂草稿。", pri: "中優先", topic: "授信管理", regId: "REG-2026-011", ref: "第 5 條", owner: "黃淑芬", dept: "授信部", due: "10/30", col: "doing", progress: [1, 3] },
  { id: "T-107", title: "更新個資告知事項範本", desc: "範本內與內規手冊已同步更新。", pri: "低優先", topic: "個資保護", regId: "REG-2026-010", ref: "第 14 條", owner: "林怡君", dept: "法遵部", due: "10/10", col: "done" },
  { id: "T-108", title: "完成法規異動教育訓練", desc: "已完成宣導，教材與簽到紀錄已留存。", pri: "低優先", topic: "防制洗錢", ref: "事項", owner: "王志明", dept: "營運部", due: "10/09", col: "done" },
];

export const REVIEW_ARTICLES = [
  { no: 8, title: "客戶持續審查", level: "營運單位內規", conf: 96, headline: "現行審查頻率低於新版要求，建議列為高優先因應事項。", reasons: ["內規為每年審查，新條文要求至少每六個月審查一次。", "內規未明定重大事件觸發加強審查之機制。", "應補充主管核准與留存紀錄的責任。"], advice: "調整審查頻率與作業流程，增設加強審查觸發與核准關卡。", warn: "「重大風險事件」範圍尚未於主管機關說明，應保留人工複核。", text: ["金融機構應依客戶風險程度進行持續審查。", "對高風險客戶，應至少每六個月辦理一次定期審查，並於重大風險事件發生時啟動加強審查。", "審查結果應經權責主管核准，並留存風險評估依據及處理紀錄。"], related: "客戶審查作業辦法 第 6 點", current: "「高風險客戶每年辦理一次定期審查。」" },
  { no: 12, title: "紀錄保存", level: "營運單位內規", conf: 93, headline: "保存期限需由五年延長為七年，並確認系統調閱能力。", reasons: ["政策保存年限為五年，低於新條文要求。", "歷史資料調閱測試尚無標準程序。", "委外處理者保存要求未納入。"], advice: "更新保存政策並完成資料庫設定與調閱測試。", warn: "歷史資料是否追溯適用，建議向主管機關確認。", text: ["金融機構應建立交易監控及紀錄保存機制。", "相關作業紀錄應保存至少七年，並確保可供調閱及追溯。"], related: "洗錢防制紀錄保存政策 第 4 點", current: "「相關紀錄應保存至少五年。」" },
  { no: 16, title: "委外作業監督", level: "資訊與風控", conf: 88, headline: "委外契約須補齊保存與查核權限，建議建立年度驗證。", reasons: ["委外契約未載明查核權限。", "未定期驗證服務商保存與調閱能力。", "缺少委外異常通報時限。"], advice: "盤點契約、補充條款並建立驗證清單。", warn: "雲端服務商之查核方式需法務確認。", text: ["金融機構應監督委外服務之執行情形。", "應於契約明定紀錄保存要求及查核權限，並定期驗證保存年限、調閱能力與追溯性。"], related: "委外服務監督作業程序 第 12 點", current: "「依契約約定辦理查核。」" },
];

export interface Doc { id: string; name: string; ver: string; kind: "法規" | "內規"; range: string; regId?: string; ruleId?: string; }
export const DOCS: Doc[] = [
  { id: "d1", name: "金融機構防制洗錢作業準則（示範）", ver: "v2.0", kind: "法規", range: "第 1-23 條", regId: "REG-2026-014" },
  { id: "d2", name: "客戶審查作業辦法（示範）", ver: "v1.3", kind: "內規", range: "第 1-12 點", ruleId: "r1" },
  { id: "d3", name: "洗錢防制紀錄保存政策", ver: "v1.1", kind: "內規", range: "第 1-8 點", ruleId: "r2" },
  { id: "d4", name: "金融服務消費者保護作業規範", ver: "v3.0", kind: "法規", range: "第 1-19 條", regId: "REG-2026-013" },
  { id: "d5", name: "金融機構資訊安全管理要點", ver: "v1.8", kind: "法規", range: "第 1-30 條", regId: "REG-2026-012" },
  { id: "d6", name: "委外服務監督作業程序", ver: "v1.0", kind: "內規", range: "第 1-15 點", ruleId: "r3" },
  { id: "d7", name: "授信業務風險管理作業指引", ver: "v2.2", kind: "法規", range: "第 1-18 條", regId: "REG-2026-011" },
  { id: "d8", name: "金融機構個人資料保護規範", ver: "v2.0", kind: "法規", range: "第 1-22 條", regId: "REG-2026-010" },
  { id: "d9", name: "電子支付機構業務管理規則", ver: "v4.1", kind: "法規", range: "第 1-35 條", regId: "REG-2026-009" },
  { id: "d10", name: "金融機構客戶資料揭露指引", ver: "v1.5", kind: "法規", range: "第 1-12 條", regId: "REG-2026-008" },
  { id: "d11", name: "銀行業內部控制及稽核制度實施辦法", ver: "v3.0", kind: "法規", range: "第 1-30 條", regId: "REG-2026-007" },
  { id: "d12", name: "金融機構委外作業及監督辦法", ver: "v2.1", kind: "法規", range: "第 1-20 條", regId: "REG-2026-006" },
];

export interface Source { n: number; title: string; where: string; quote: string; regId?: string; ruleId?: string; }
export interface Msg { role: "user" | "ai"; time: string; text: string; points?: { h: string; d: string }[]; sources?: Source[]; warn?: string; mode?: string; }
export interface Convo { id: string; title: string; when: string; count: number; msgs: Msg[]; }
export const CONVOS: Convo[] = [
  { id: "c1", title: "高風險客戶審查要求", when: "今天 10:24", count: 2, msgs: [
    { role: "user", time: "10:24", text: "新版對高風險客戶的審查有何新要求？我們應該如何調整內規？" },
    { role: "ai", time: "10:24", text: "依據您選取的示範新版第 8 條，應調整審查頻率、事件觸發流程與核准紀錄。現行內規與新版要求有明確落差。",
      points: [{ h: "審查頻率：至少每 6 個月一次", d: "高風險客戶定期審查由每年一次調整為至少每六個月，建議同步更新內規與稽核機制。[1][2]" }, { h: "事件觸發：啟動加強審查", d: "重大風險事件發生時，須依事前定義之流程啟動加強審查。[1]" }, { h: "核准留痕：保留判斷依據", d: "審查結果須經權責主管核准並留存風險評估依據。[1]" }],
      sources: [{ n: 1, title: "金融機構防制洗錢作業準則", where: "第 8 條 · v2.0 · 示範新版", quote: "「至少每六個月辦理一次定期審查」", regId: "REG-2026-014" }, { n: 2, title: "客戶審查作業辦法", where: "第 6 點 · v1.3 · 現行", quote: "「高風險客戶每年辦理一次定期審查」", ruleId: "r1", regId: "REG-2026-014" }],
      warn: "本回答不含於您限定範圍之外資料；「重大風險事件」定義仍須人工確認，不能視為最終採用。" },
  ] },
  { id: "c2", title: "委外服務的紀錄保存", when: "今天 09:42", count: 4, msgs: [
    { role: "user", time: "09:42", text: "委外服務商需要保存紀錄多久？我們要驗證什麼？" },
    { role: "ai", time: "09:42", text: "依第 12、16 條，委外處理者須遵循相同的七年保存要求，金融機構應定期驗證其保存與調閱能力。",
      points: [{ h: "保存期限：至少七年", d: "與機構自身保存義務一致，需納入契約。[1]" }, { h: "驗證項目：保存、調閱、追溯", d: "建議每年一次抽樣測試並留存報告。[1]" }],
      sources: [{ n: 1, title: "金融機構防制洗錢作業準則", where: "第 12、16 條 · v2.0", quote: "「並定期驗證保存年限、調閱能力與追溯性」", regId: "REG-2026-014" }] },
  ] },
  { id: "c3", title: "生效前的因應優先順序", when: "昨天 16:10", count: 3, msgs: [
    { role: "user", time: "16:10", text: "11/01 生效前，我們應該先做哪些事？" },
    { role: "ai", time: "16:10", text: "建議以影響程度排序，先完成高影響內規，再處理系統與契約調整。",
      points: [{ h: "第一優先：客戶審查辦法", d: "修訂審查頻率與核准流程。[1]" }, { h: "第二優先：保存政策與系統", d: "延長保存年限並測試調閱。[1]" }, { h: "第三優先：委外契約", d: "補充查核與保存條款。[1]" }],
      sources: [{ n: 1, title: "影響分析報告", where: "REG-2026-014 · 初步評估", quote: "「3 項優先措施，建議生效前完成」", regId: "REG-2026-014" }] },
  ] },
];
export const SUGGESTS = ["哪些內規需要修訂？", "如何建立核准稽核表？", "生效日前要完成什麼？", "與舊版差異有哪些？"];
