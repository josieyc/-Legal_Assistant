import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, History, Lock, ListTodo, Plus, Search, Send, ShieldCheck, Sparkles, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { CONVOS, DIFF_SETS, DOCS, INDUSTRIES, REGS, SUGGESTS, type Convo, type Msg, type Source, type Task } from "../data";
import { Badge, Card, GhostBtn, Marquee, PageHeader, PrimaryBtn, Segmented, cn } from "../ui";
import { useStore } from "../store";
import type { IRule } from "../rulesData";

interface EvidenceDocument {
  id: string;
  title: string;
  version: string;
  range: string;
  excerpt: string;
  topic: string;
  regId?: string;
  ruleId?: string;
}

const QA_EXAMPLES = [
  {
    question: "高風險客戶的審查頻率有什麼要求？",
    label: "解讀條文",
    description: "快速整理指定條文的要求與重點。",
  },
  {
    question: "請比較高風險客戶審查辦法和新規的頻率差異。",
    label: "比較新舊規",
    description: "比對法規與內規，找出可能需要調整的地方。",
  },
  {
    question: "高風險客戶審查流程應該如何調整？",
    label: "整理因應方向",
    description: "依據文件內容歸納後續可確認的行動。",
  },
];

const QA_PROMPTS = [
  ...QA_EXAMPLES.map((example) => example.question),
  ...SUGGESTS,
  "最近有哪些法規需要優先處理？",
  "高風險客戶審查有哪些新要求？",
  "哪些部門需要修訂內規？",
  "裁罰案例有哪些重點？",
  "把客戶款項暫時挪作公司周轉，可能有什麼法律或法遵問題？",
  "收到可疑交易通知後，第一步該怎麼做？",
  "把客戶資料提供給合作廠商前，要確認什麼？",
  "委外雲端服務合約要補哪些控管？",
  "發現內規和新規不一致時，應該怎麼處理？",
];

const QA_DEMOS: {
  matches: RegExp;
  keywords?: string[];
  text: string;
  points: { h: string; d: string }[];
  sourceIds?: string[];
  warn?: string;
}[] = [
  {
    matches: /最近.*法規|法規.*優先|近期.*法規/,
    keywords: ["新聞", "法規最新消息", "法規更新"],
    text: "依平台目前收錄的示範資料，建議先處理可能涉及高風險客戶審查、消費者申訴時限及委外監督的法規異動。這是依示範資料整理的優先順序，不代表即時新聞或主管機關最新公告。",
    points: [
      { h: "優先一｜防制洗錢與高風險客戶審查", d: "檢視定期審查頻率、重大事件觸發、主管核准及紀錄保存要求，確認相關內規與系統是否需要調整。" },
      { h: "優先二｜消費者申訴處理", d: "確認申訴回覆時限、逾期提醒、升級處理及結案紀錄，並盤點客服流程與服務水準。" },
      { h: "優先三｜委外及雲端服務監督", d: "檢查供應商風險評估、查核權、次委外、事件通報及退出與資料返還安排。" },
    ],
    sourceIds: ["d1", "d4", "d6", "d12"],
    warn: "法規清單與日期是平台示範資料，並非即時新聞或正式法規查詢；請以主管機關公告及適用文件確認。",
  },
  {
    matches: /高風險客戶.*(新要求|要求)|新要求.*高風險客戶/,
    keywords: ["高風險客戶", "客戶審查", "洗錢防制"],
    text: "依平台示範資料，高風險客戶審查的重點包括提高定期審查頻率、重大風險事件觸發加強審查，以及留存主管核准與風險評估依據。",
    points: [
      { h: "定期審查頻率", d: "示範新規要求至少每六個月辦理一次；請對照目前適用法規與內規確認。" },
      { h: "重大事件觸發", d: "建立可能改變客戶風險的事件條件，明確規範何時啟動加強審查及由誰執行。" },
      { h: "核准與紀錄", d: "留存評估依據、審查結果、主管核准及後續處理紀錄，確保可供稽核追溯。" },
    ],
    sourceIds: ["d1", "d2"],
  },
  {
    matches: /哪些部門.*(修訂|負責)|部門.*修訂.*內規|誰.*修訂.*內規/,
    keywords: ["部門", "內規修訂", "負責單位"],
    text: "依平台示範資料，內規修訂通常需要法遵部統籌，並由受影響的業務單位負責流程內容；若涉及紀錄保存或系統控制，資訊部也需共同評估。",
    points: [
      { h: "法遵部｜規範與審核", d: "盤點適用法規與差異、確認修訂方向、協調會簽並追蹤核准及公告。" },
      { h: "營運／客服等業務單位｜流程落地", d: "依受影響的業務範圍修訂作業程序、表單及教育訓練內容，並指定流程負責人。" },
      { h: "資訊部與風控部｜系統及控制", d: "若涉及系統提醒、資料保存、權限或監控，評估需求、測試及控制證據；由風控協助檢視風險。" },
    ],
    sourceIds: ["d1", "d2", "d3", "d6"],
    warn: "實際負責部門仍須依機構組織、權責表及內部核准程序確認。",
  },
  {
    matches: /高風險客戶.*審查頻率|審查頻率.*高風險客戶/,
    text: "依目前選取的示範文件，高風險客戶應至少每六個月辦理一次定期審查；若發生重大風險事件，也應依程序啟動加強審查。",
    points: [
      { h: "定期審查", d: "將現行每年一次的安排檢視是否需調整為至少每六個月一次。" },
      { h: "事件觸發", d: "建立重大風險事件的判斷條件與加強審查流程。" },
      { h: "核准留痕", d: "保留風險評估依據、審查結果及權責主管核准紀錄。" },
    ],
    sourceIds: ["d1", "d2"],
  },
  {
    matches: /高風險客戶.*審查流程|審查流程.*調整/,
    text: "可以從審查頻率、重大事件觸發、主管覆核及紀錄留存四個部分調整流程，並同步檢查內規、表單與系統提醒。",
    points: [
      { h: "調整審查排程", d: "依適用要求設定定期審查週期及逾期提醒，並保留完成紀錄。" },
      { h: "補上事件觸發條件", d: "定義哪些重大風險事件會啟動加強審查，以及案件如何分派與升級。" },
      { h: "確保覆核可追溯", d: "明確指定承辦與核准權責，留存評估依據、處理結果及覆核紀錄。" },
    ],
    sourceIds: ["d1", "d2"],
  },
  {
    matches: /挪用|挪作|周轉|週轉|把.*款項|把.*資金/,
    text: "這需要先確認資金所有權、用途限制與核准權限，不能只以「暫時周轉」判斷是否允許。若涉及客戶款項、信託或專款，未經授權改變用途可能帶來重大法律、契約及監理風險；不要先行移轉或以其他交易掩飾。",
    points: [
      { h: "先辨明資金性質與限制", d: "確認款項屬於公司自有資金、客戶資產、信託財產或其他專款，並查核契約、法規及帳戶用途限制。" },
      { h: "確認授權與利益衝突", d: "查明是否有明確法源、權責主管核准及必要的獨立覆核；涉及關係人或個人利益時應揭露並迴避。" },
      { h: "暫停交易並保留紀錄", d: "在法遵或法務確認前先不要執行；保存用途說明、核准紀錄與往來資料，依內部程序升級通報。" },
    ],
    warn: "目前選取的文件不足以判定這筆資金的法律性質或具體法律責任。請先由法遵及法務依資金來源、用途、授權與適用規範確認。",
  },
  {
    matches: /哪些內規|內規.*修訂|修訂.*內規|內規.*新規/,
    text: "可以先比對新規要求與現行內規，將有落差的條文列為修訂項目，再安排權責單位、覆核人與完成期限。",
    points: [
      { h: "優先檢查高風險差異", d: "確認審查頻率、紀錄保存、重大事件處理及主管核准等控制是否與新規一致。" },
      { h: "建立修訂清單", d: "逐項記錄法規依據、現行作法、差異、建議文字、負責單位與預計完成日。" },
      { h: "完成核准與落地確認", d: "依內部權限完成會簽、核准、公告及教育訓練，並確認表單與系統流程已同步更新。" },
    ],
    sourceIds: ["d1", "d2", "d3", "d6"],
  },
  {
    matches: /核准.*稽核表|稽核表/,
    text: "建議將核准稽核表設計成可追溯的控制清單，讓每個檢核項目都有依據、執行人、覆核人與證據。",
    points: [
      { h: "檢核項目", d: "列明適用條文、觸發條件、應完成的審查或核准，以及不適用時的理由。" },
      { h: "責任與時點", d: "記錄承辦人、獨立覆核人、核准權責與完成時間，避免同一人包辦所有步驟。" },
      { h: "證據與缺失追蹤", d: "連結評估資料、核准紀錄及附件；對缺失設定改善負責人、期限與結案覆核。" },
    ],
    sourceIds: ["d1", "d2"],
  },
  {
    matches: /生效日前|生效前|完成什麼|先做哪些/,
    text: "建議先確認生效日與適用範圍，再依風險及所需作業時間安排修訂、系統調整、測試與核准。",
    points: [
      { h: "盤點差異與責任人", d: "確認受影響的內規、表單、系統及委外契約，為各項差異指定負責單位。" },
      { h: "先處理高風險控制", d: "優先完成客戶審查、保存年限、異常通報等可能影響法遵的流程與系統需求。" },
      { h: "測試、核准並留存證據", d: "安排情境測試、主管核准、教育訓練及文件版本更新，保留完成紀錄以供查核。" },
    ],
    sourceIds: ["d1", "d2", "d3"],
  },
  {
    matches: /舊版|新舊|差異有哪些|比較/,
    text: "比對文件時，建議逐條確認新增、刪除及文字調整，再評估對現行流程、內規與系統控制的影響。",
    points: [
      { h: "辨認條文變動", d: "整理修正條文及版本日期，區分新增義務、期限或門檻的調整，以及刪除內容。" },
      { h: "連結現行內規", d: "確認哪些作業程序、表單或系統設定仍依舊版要求，標記衝突或未涵蓋之處。" },
      { h: "形成可追蹤的因應事項", d: "將差異轉成修訂、測試或教育訓練任務，指定負責人及完成期限。" },
    ],
    sourceIds: ["d1", "d2"],
  },
  {
    matches: /裁罰|案例.*重點/,
    text: "整理裁罰案例時，應聚焦違規事實、失效的控制、監理關注點及可落地的改善措施，不宜只看裁罰金額。",
    points: [
      { h: "釐清違規事實", d: "確認案件中的作業缺失、涉及流程及被忽略的警訊，並與自身制度逐項比對。" },
      { h: "檢查控制是否留下證據", d: "特別檢視審查紀錄、異常處理、主管覆核及改善追蹤是否完整可追溯。" },
      { h: "轉化為內部檢核", d: "將案例教訓納入抽查、教育訓練或流程改善；個案事實仍應以正式公告為準。" },
    ],
    warn: "此處提供的是案例分析方法；目前選取文件不等同於裁罰公告，請勿將其視為特定案件的正式事實。",
  },
  {
    matches: /可疑交易|異常交易|交易通知/,
    text: "先依內部通報程序升級處理並保留紀錄，不要因通知本身就自行推定違法，也不要忽略或擅自結案。",
    points: [
      { h: "依程序通報專責單位", d: "記錄通知時間、交易識別資訊、初步檢視結果與承辦人，依機構程序送交權責人員。" },
      { h: "保全資料並限制知悉", d: "保存相關交易與查核紀錄，依內部權限控管資料，避免未經授權的對外揭露。" },
      { h: "依覆核結果決定後續", d: "由權責單位評估是否需補充查核、申報或採取其他措施，並記錄決策依據。" },
    ],
    sourceIds: ["d1"],
  },
  {
    matches: /客戶資料|合作廠商|提供.*資料/,
    text: "提供客戶資料前，先確認提供目的、資料範圍、接收對象與適用依據，並確認同意或其他合法基礎及必要控管。",
    points: [
      { h: "確認目的與資料最小化", d: "只提供達成特定目的所需的資料欄位，並確認使用方式沒有超出原先告知或授權範圍。" },
      { h: "確認接收方與契約控管", d: "核對合作廠商身分、保存與刪除安排、保密義務、再委外及事件通報責任。" },
      { h: "留存核准及交付紀錄", d: "保存法遵審查、必要核准、資料項目與交付時間等紀錄，並確認後續查核方式。" },
    ],
    sourceIds: ["d8", "d10"],
  },
  {
    matches: /委外|雲端.*合約|合約.*控管/,
    text: "委外或雲端服務合約應與風險評估及監督流程一致，除了服務範圍，也要明確約定查核、事件處理及退出安排。",
    points: [
      { h: "服務商與次委外管理", d: "釐清服務範圍、資料所在地、次委外安排及重大變更通知責任。" },
      { h: "查核及事件應變", d: "約定查核權、紀錄提供、資安事件通報、改善期限及必要的合作義務。" },
      { h: "退出與資料返還", d: "明定終止或轉換服務時的資料返還、刪除、可攜性與服務不中斷安排，並定期測試。" },
    ],
    sourceIds: ["d5", "d6", "d12"],
  },
  {
    matches: /不一致|有落差|怎麼處理/,
    text: "發現內規和新規不一致時，先記錄條文依據及落差，再依風險安排修訂與過渡控制，並由權責單位核准。",
    points: [
      { h: "確認適用性與期限", d: "核對新規適用對象、生效日及過渡安排，避免將不適用規定直接套用。" },
      { h: "評估風險並設定暫行措施", d: "對尚未完成修訂的高風險差異，提報權責主管並評估必要的暫行控制。" },
      { h: "修訂、溝通與追蹤", d: "更新內規及相關表單或系統，完成核准後公告訓練，追蹤改善至結案。" },
    ],
    sourceIds: ["d1", "d2", "d3"],
  },
];

function collectEvidence(selectedIds: string[], rules: IRule[]): EvidenceDocument[] {
  return selectedIds.flatMap((id) => {
    const document = DOCS.find((item) => item.id === id);
    if (!document) return [];
    const regulation = REGS.find((item) => item.id === document.regId);
    if (regulation) {
      const diff = DIFF_SETS[regulation.id];
      const excerpt = [
        ...diff.articles.map((article) => `第 ${article.no} 條（${article.title}）：${article.newSeg.flat().map((segment) => segment.t).join("")}`),
        ...diff.insights.map((insight) => `${insight.ref} 重點：${insight.t}。${insight.d}`),
      ].join("\n");
      return [{
        id,
        title: document.name,
        version: diff.newVersion,
        range: document.range,
        excerpt,
        topic: regulation.topic,
        regId: regulation.id,
      }];
    }
    const rule = rules.find((item) => item.id === document.ruleId);
    if (!rule) {
      return [{ id, title: document.name, version: document.ver, range: document.range, excerpt: "", topic: "未分類" }];
    }
    return [{
      id,
      title: rule.name,
      version: rule.version,
      range: document.range,
      excerpt: rule.clauses.map((clause) => `${clause.no}${clause.ref ? `（對照${clause.ref}）` : ""}：${clause.text}`).join("\n"),
      topic: REGS.find((regulation) => rule.linked.includes(regulation.id))?.topic ?? "內規",
      regId: rule.linked[0],
      ruleId: rule.id,
    }];
  });
}

function localRetrieveReply(q: string, evidence: EvidenceDocument[], notice: string): Msg {
  const t = new Date();
  const time = `${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`;
  if (!evidence.length) return {
    role: "ai",
    time,
    mode: "AI 問答示範",
    text: "目前尚未選取任何文件範圍，請先在左側勾選至少一份法規或內規，再提出問題。",
    warn: notice,
  };
  const terms = q.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]{2}/g) ?? [];
  const ranked = evidence
    .map((item) => ({
      item,
      score: terms.reduce((score, term) => score + (item.excerpt.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .sort((first, second) => second.score - first.score)
    .filter((item) => item.score > 0);
  const selected = ranked.slice(0, 3);
  const sourceDocs = selected.map(({ item }) => item).slice(0, 3);
  const sources: Source[] = sourceDocs.map((item, index) => ({
    n: index + 1,
    title: item.title,
    where: `${item.range} · ${item.version}`,
    quote: item.excerpt ? item.excerpt.slice(0, 260) : "此範例文件尚未提供可檢索的條文摘錄。",
    regId: item.regId,
    ruleId: item.ruleId,
  }));
  return {
    role: "ai",
    time,
    mode: "AI 問答示範",
    text: selected.length
      ? `我比對了目前選取的文件，找到 ${selected.length} 份與「${q.trim()}」相關的資料。以下整理出可參考的條文重點，並附上來源供你核對。`
      : `我目前在選取的文件中找不到與「${q.trim()}」明確相符的內容，因此不臆測法規結論。可以試試條文關鍵字，或增加相關文件範圍。`,
    points: selected.map(({ item }) => ({
      h: `${item.topic} · ${item.title}`,
      d: item.excerpt.slice(0, 300) || "此範例文件尚未提供可檢索的條文摘錄。",
    })),
    sources,
    warn: `${notice} 目前顯示的是平台示範資料，重要判斷請核對原文並由法遵人員確認。`,
  };
}

function getDemoReply(q: string, evidence: EvidenceDocument[], notice: string): Msg | undefined {
  const prompt = q.trim().toLowerCase();
  const demo = QA_DEMOS.find((item) => item.matches.test(prompt) || item.keywords?.some((keyword) => prompt.includes(keyword.toLowerCase())));
  if (!demo) return undefined;
  const sources: Source[] = evidence
    .filter((item) => demo.sourceIds?.includes(item.id))
    .map((item, index) => ({
      n: index + 1,
      title: item.title,
      where: `${item.range} · ${item.version}`,
      quote: item.excerpt ? item.excerpt.slice(0, 260) : "此範例文件尚未提供可檢索的條文摘錄。",
      regId: item.regId,
      ruleId: item.ruleId,
    }));
  return {
    role: "ai",
    time: new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false }),
    mode: "AI 問答示範",
    text: demo.text,
    points: demo.points,
    ...(sources.length ? { sources } : {}),
    warn: [notice, demo.warn, sources.length ? undefined : "目前選取的文件未包含可直接支持此回答的來源，請依實際適用規範確認。"]
      .filter(Boolean)
      .join(" "),
  };
}

export default function QA() {
  const { qaSeed, toast, go, setRegId, rules, setTasks, industryIds, setRuleFocusId, userName } = useStore();
  const [convos, setConvos] = useState<Convo[]>(CONVOS);
  const [cid, setCid] = useState(CONVOS[0].id);
  const [docs, setDocs] = useState<string[]>(["d1", "d2"]);
  const [industryScope, setIndustryScope] = useState<"company" | "all">("company");
  const [kind, setKind] = useState<"全部" | "法規" | "內規">("全部");
  const [docSearch, setDocSearch] = useState("");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [liked, setLiked] = useState<Record<number, "up" | "down">>({});
  const [createdTaskMessages, setCreatedTaskMessages] = useState<string[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  const convo = convos.find((c) => c.id === cid)!;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [convo.msgs.length, typing, cid]);

  const ask = (q: string, id = cid) => {
    if (!q.trim() || typing) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, count: c.count + 1, msgs: [...c.msgs, { role: "user", time, text: q }] } : c)));
    setInput("");
    setTyping(true);
    const evidence = collectEvidence(docs, rules);
    const notice = "回答範圍限於目前選取的文件；點選來源卡片可查看對應法規或內規。";
    const answer = evidence.length
      ? getDemoReply(q, evidence, notice) ?? localRetrieveReply(q, evidence, notice)
      : localRetrieveReply(q, evidence, notice);
    window.setTimeout(() => {
      setTyping(false);
      setConvos((cs) => cs.map((c) => (c.id === id ? { ...c, msgs: [...c.msgs, answer] } : c)));
    }, 280);
  };

  useEffect(() => {
    if (qaSeed && !seeded.current) {
      seeded.current = true;
      const id = "c" + Date.now();
      setConvos((cs) => [{ id, title: qaSeed.slice(0, 16), when: "剛剛", count: 0, msgs: [] }, ...cs]);
      setCid(id);
      setTimeout(() => ask(qaSeed, id), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const newChat = () => { const id = "c" + Date.now(); setConvos([{ id, title: "新對話", when: "剛剛", count: 0, msgs: [] }, ...convos]); setCid(id); };
  const scopedDocs = useMemo(() => DOCS.filter((document) => {
    if (industryScope === "all" || !industryIds.length) return true;
    const regulation = REGS.find((item) => item.id === document.regId);
    if (regulation) return regulation.industries.some((industry) => INDUSTRIES.some((option) => industryIds.includes(option.id) && option.name === industry));
    const rule = rules.find((item) => item.id === document.ruleId);
    return Boolean(rule?.linked.some((id) => REGS.find((item) => item.id === id)?.industries.some((industry) => INDUSTRIES.some((option) => industryIds.includes(option.id) && option.name === industry))));
  }), [industryScope, industryIds, rules]);
  const shownDocs = useMemo(() => scopedDocs.filter((document) =>
    (kind === "全部" || document.kind === kind)
    && (!docSearch.trim() || `${document.name} ${document.id}`.toLowerCase().includes(docSearch.trim().toLowerCase())),
  ), [scopedDocs, kind, docSearch]);
  const scopedDocIds = useMemo(() => scopedDocs.map((document) => document.id), [scopedDocs]);
  useEffect(() => {
    setDocs((current) => current.filter((id) => scopedDocIds.includes(id)));
  }, [scopedDocIds]);
  const shownConvos = useMemo(() => convos.filter((c) => c.title.includes(search)), [convos, search]);
  const toggle = (id: string) => setDocs(docs.includes(id) ? docs.filter((x) => x !== id) : [...docs, id]);
  const createTaskFromAnswer = (messageIndex: number, answer: Msg) => {
    const taskKey = `${cid}:${messageIndex}`;
    if (createdTaskMessages.includes(taskKey)) return;
    const question = convo.msgs[messageIndex - 1]?.text ?? "依據法規問答進行人工確認";
    const source = answer.sources?.[0];
    const sourceRule = source?.ruleId ? rules.find((item) => item.id === source.ruleId) : undefined;
    const regulation = source?.regId
      ? REGS.find((item) => item.id === source.regId)
      : sourceRule ? REGS.find((item) => sourceRule.linked.includes(item.id)) : undefined;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const priority: Task["pri"] = regulation?.risk === "高風險"
      ? "高優先"
      : regulation?.risk === "低風險" ? "低優先" : "中優先";
    const task: Task = {
      id: `T-${Date.now()}`,
      title: `確認法規分析：${question.trim().slice(0, 28)}`,
      desc: `${answer.text.slice(0, 1200)}${source ? `\n\n參考來源：${source.title} ${source.where}` : ""}`,
      pri: priority,
      topic: regulation?.topic ?? "法遵追蹤",
      ...(regulation ? { regId: regulation.id } : {}),
      ref: source?.where ?? "問答分析",
      owner: sourceRule?.owner ?? "林怡君",
      dept: sourceRule?.dept ?? "法遵部",
      due: `${String(dueDate.getMonth() + 1).padStart(2, "0")}/${String(dueDate.getDate()).padStart(2, "0")}`,
      col: "todo",
    };
    setTasks((current) => [task, ...current]);
    setCreatedTaskMessages((current) => [...current, taskKey]);
    toast("已建立法遵確認任務，可至待辦看板追蹤");
  };

  return (
    <>
      <PageHeader title="法規問答" sub="可詢問條文重點、比較法規與內規差異，或整理因應方向；回答附上可追溯來源。" action={<PrimaryBtn onClick={newChat}><Plus size={16} />新增對話</PrimaryBtn>} />
      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-5 lg:sticky lg:top-2">
          <Card className="p-5">
            <div className="flex items-start justify-between"><div><h3 className="font-bold text-navy-900">限定法規範圍</h3><p className="mt-0.5 text-xs text-sub">僅依選取的文件作答</p></div><Lock size={15} className="text-brand" /></div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-brand" />
              <span className="font-semibold text-navy-900">回答範圍 · 僅限已選文件</span>
            </div>
            <div className="mt-3">
              <Segmented value={industryScope} onChange={setIndustryScope} options={[
                { v: "company", label: "本公司產業" },
                { v: "all", label: "全部產業" },
              ]} />
              <p className="mt-1.5 text-[10px] text-faint">{industryScope === "company" ? `優先顯示 ${INDUSTRIES.filter((industry) => industryIds.includes(industry.id)).map((industry) => industry.name).join("、") || "未設定產業"} 相關法規與內規` : "可檢索其他產業法規及內規"}</p>
            </div>
            <div className="mt-3"><Segmented value={kind} onChange={setKind} options={(["全部", "法規", "內規"] as const).map((v) => ({ v, label: v }))} /></div>
            <label className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs"><Search size={13} className="text-faint" /><input value={docSearch} onChange={(event) => setDocSearch(event.target.value)} placeholder={industryScope === "all" ? "搜尋所有產業法規或內規" : "搜尋公司產業法規或內規"} className="w-full bg-transparent outline-none" /></label>
            <div className="mt-3 max-h-[300px] space-y-2 overflow-auto">
              {shownDocs.map((d) => {
                const on = docs.includes(d.id);
                return (
                  <button key={d.id} onClick={() => toggle(d.id)} className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition", on ? "border-brand/40 bg-brand-soft" : "border-line hover:border-brand/30")}>
                    <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border-2 text-white transition", on ? "border-brand bg-brand" : "border-slate-300")}>{on && <span className="text-[10px] leading-none">✓</span>}</span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold leading-snug">{d.name}</span><span className="mt-1 flex items-center gap-1.5 text-[11px] text-sub"><Badge tone={d.kind === "法規" ? "brand" : "violet"}>{d.kind}</Badge>{d.ver} · {d.range}</span></span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-sub"><span>已選 <b className="text-brand">{docs.length}</b> / {shownDocs.length} 份</span><div className="flex gap-3 font-semibold text-brand"><button onClick={() => setDocs(shownDocs.map((d) => d.id))}>全選</button><button onClick={() => setDocs([])}>清除</button></div></div>
            <div className="mt-2 text-[10px] leading-relaxed text-faint">選取法規與內規後即可開始提問；回答會附上對應來源，方便你回到原文確認。</div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between"><h3 className="font-bold text-navy-900">近期對話</h3><History size={15} className="text-brand" /></div>
            <label className="mt-3 flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-xs"><Search size={13} className="text-faint" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋對話" className="w-full bg-transparent outline-none" /></label>
            <div className="mt-2 space-y-1">
              {shownConvos.map((c) => (
                <button key={c.id} onClick={() => setCid(c.id)} className={cn("block w-full rounded-xl px-3 py-2.5 text-left transition", c.id === cid ? "bg-brand-soft" : "hover:bg-slate-50")}>
                  <div className={cn("text-[13px] font-semibold", c.id === cid && "text-brand")}>{c.title}</div>
                  <div className="text-[11px] text-faint">{c.when} · {c.count} 則對話</div>
                </button>
              ))}
              {!shownConvos.length && <div className="py-4 text-center text-xs text-faint">沒有對話</div>}
            </div>
          </Card>

          <div className="flex gap-3 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-600 p-4 text-white">
            <ShieldCheck size={20} className="shrink-0" />
            <div><div className="text-sm font-bold">可信賴的法規助手</div><p className="mt-1 text-xs leading-relaxed text-white/70">回答會以選取文件為範圍並附上來源；涉及法規判斷時，請由法遵人員覆核。</p></div>
          </div>
        </div>

        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div><h2 className="text-lg font-extrabold text-navy-900">{convo.title}</h2><p className="mt-0.5 text-xs text-sub">已限定 {docs.length} 份文件 · 回答依據所選版本摘錄</p></div>
            <Badge tone="brand"><i className="h-1.5 w-1.5 rounded-full bg-brand" />AI 問答示範</Badge>
          </div>
          <div className="flex-1 space-y-5 overflow-auto px-6 py-5" style={{ maxHeight: 560 }}>
            {!convo.msgs.length && (
              <div className="mx-auto flex h-full min-h-[320px] max-w-xl flex-col justify-center">
                <div className="text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Sparkles size={24} /></div><div className="mt-3 font-bold text-navy-900">想了解什麼法規？</div><p className="mt-1 text-sm text-sub">試著用自然語言提問，法規助手會整理重點並提供來源。</p></div>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {QA_EXAMPLES.map((example) => <button key={example.question} onClick={() => ask(example.question)} className="rounded-xl border border-line p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"><div className="text-[11px] font-bold text-brand">{example.label}</div><div className="mt-1 text-xs font-semibold leading-relaxed text-navy-900">{example.question}</div><div className="mt-1.5 text-[11px] leading-relaxed text-sub">{example.description}</div></button>)}
                </div>
              </div>
            )}
            {convo.msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] animate-rise rounded-2xl rounded-tr-md bg-brand-soft px-4 py-3"><div className="mb-1 text-[11px] text-sub"><b className="text-ink">{userName}</b> · {m.time}</div><div className="text-sm">{m.text}</div></div>
              ) : (
                <div key={i} className="animate-rise">
                  <div className="mb-2 flex items-center gap-2 text-xs"><span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-white"><Sparkles size={12} /></span><b>RegInsight 法規助手</b><span className="text-faint">{m.time} · {m.mode ?? "歷史範例"}</span></div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
                  {m.points && <div className="mt-3 space-y-3">{m.points.map((p) => <div key={p.h} className="border-l-2 border-brand/40 pl-3"><div className="text-[13px] font-bold text-navy-900">{p.h}</div><p className="mt-0.5 text-[13px] text-sub">{p.d}</p></div>)}</div>}
                  {m.warn && <div className="mt-3 flex gap-2 rounded-xl bg-warn-soft p-3 text-xs text-warn"><TriangleAlert size={14} className="mt-0.5 shrink-0" />{m.warn}</div>}
                  {m.sources && (
                    <div className="mt-4 border-t border-line pt-3"><div className="text-xs font-bold text-navy-900">{m.mode?.startsWith("Google Gemini") ? "提供模型分析的來源摘錄" : "檢索來源 · 可追溯文件"}</div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">{m.sources.map((s) => <button key={s.n} onClick={() => {
                        if (s.ruleId) {
                          setRuleFocusId(s.ruleId);
                          go("rules");
                        } else if (s.regId) {
                          setRegId(s.regId);
                          go("diff");
                        } else {
                          toast("此來源尚未連結到可開啟的法規或內規資料");
                        }
                      }} className="rounded-xl border border-line p-3 text-left transition hover:border-brand/40 hover:bg-brand-soft/40"><div className="text-xs font-bold text-brand">[{s.n}] {s.title} ↗</div><div className="mt-0.5 text-[11px] text-sub">{s.where}</div><div className="mt-1.5 text-xs text-ink/80">{s.quote}</div></button>)}</div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-faint">
                    <button onClick={() => setLiked({ ...liked, [i]: "up" })} className={cn("rounded-lg p-2 hover:bg-slate-100", liked[i] === "up" && "text-ok")}><ThumbsUp size={15} /></button>
                    <button onClick={() => setLiked({ ...liked, [i]: "down" })} className={cn("rounded-lg p-2 hover:bg-slate-100", liked[i] === "down" && "text-danger")}><ThumbsDown size={15} /></button>
                    <button onClick={() => {
                      if (!navigator.clipboard) {
                        toast("此瀏覽器不支援複製，請手動選取文字");
                        return;
                      }
                      void navigator.clipboard.writeText(m.text).then(() => toast("已複製答案")).catch(() => toast("無法複製答案，請手動選取文字"));
                    }} className="flex items-center gap-1 rounded-lg p-2 text-xs hover:bg-slate-100"><Copy size={14} />複製答案</button>
                    <GhostBtn className="ml-auto" disabled={createdTaskMessages.includes(`${cid}:${i}`)} onClick={() => createTaskFromAnswer(i, m)}>{createdTaskMessages.includes(`${cid}:${i}`) ? <CheckCircle2 size={14} /> : <ListTodo size={14} />}{createdTaskMessages.includes(`${cid}:${i}`) ? "已建立任務" : "轉為因應任務"}</GhostBtn>
                  </div>
                </div>
              ),
            )}
            {typing && <div className="flex items-center gap-2 text-xs text-sub"><span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-to-br from-brand to-violet text-white"><Sparkles size={12} /></span>正在查找來源條文<span className="flex gap-1">{[0, 1, 2].map((k) => <i key={k} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${k * 120}ms` }} />)}</span></div>}
            <div ref={end} />
          </div>
          <div className="border-t border-line p-4">
            <Marquee className="mb-3 [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
              {QA_PROMPTS.map((s) => <button key={s} onClick={() => ask(s)} className="whitespace-nowrap rounded-full bg-slate-100 px-3.5 py-1.5 text-xs text-sub transition hover:bg-brand-soft hover:text-brand">{s}</button>)}
            </Marquee>
            <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="rounded-2xl border border-line p-3 transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} rows={2} placeholder="針對已限定法規提問…" className="w-full resize-none bg-transparent text-sm outline-none" />
              <div className="flex items-center justify-between"><span className="text-[11px] text-faint">僅回答限定範圍 · Enter 送出（Shift+Enter 換行）</span><button disabled={typing || !input.trim()} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"><Send size={14} />{typing ? "分析中" : "送出"}</button></div>
            </form>
            <p className="mt-2 flex items-start gap-1.5 px-1 text-[10px] leading-relaxed text-faint"><Lock size={11} className="mt-0.5 shrink-0" />回答依目前選取的文件整理，請點選來源核對原文；示範內容不構成正式法律意見。</p>
          </div>
        </Card>
      </div>
    </>
  );
}
