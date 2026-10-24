import { axiosClient } from './axiosClient';

export interface PolicyRiskEvent {
  risk_event_id: number;
  industry: string[];
  act_name: string;
  topic: string | null;
  risk: number;
  affected_department: string | null;
  event_date: string;
  status: string;
}

export interface PolicyRiskEventDetail {
  risk_event_id: number;
  act_change_event_id: number;
  policy_id: number | null;
  policy_article_id: number | null;
  department_id: number | null;
  obligation_intensity: string | null;
  deadline: string | null;
  topic: string | null;
  state: string;
  reason: string | null;
  confidence_level: number | null;
  suggest_next_step: string | null;
  suggest_due_date: string | null;
  create_at: string;
}

export interface ActChangeEventVersion {
  act_name: string;
  industries: string[];
  article: number | null;
  change_type: string;
  last_version: { version_id: string; content: string | null };
  new_version: { version_id: string; content: string | null };
}

export interface ActChangeEventVersions {
  status: string;
  previous_source: string;
  current_source: string;
  changed_law_count: number;
  detected_event_count: number;
  events: ActChangeEventVersion[];
}

export interface ActChangeEventSyncResult {
  status: string;
  changed_law_count: number;
  detected_event_count: number;
  created_event_count: number;
  created_industry_relation_count: number;
  created_version_count: number;
}

export interface FirmPolicyImportResult {
  status: string;
  policy_name: string;
  article_count: number;
  committed: boolean;
}

export type PolicyRiskEventState =
  | "Pending"
  | "InReview"
  | "Reviewed"
  | "ReanalysisRequired"
  | "Closed";

export interface BackendHealth {
  status: string;
  message: string;
}


export async function getBackendHealth(): Promise<BackendHealth> {
  const { data } = await axiosClient.get<BackendHealth>("/");
  if (data.status !== "success") {
    throw new Error("後端健康檢查未通過。");
  }
  return data;
}

// 1. 取得全部政策風險事件列表 (GET)
export async function getPolicyRiskEvents(signal?: AbortSignal): Promise<PolicyRiskEvent[]> {
  const { data } = await axiosClient.get<PolicyRiskEvent[]>("/act/policy_risk_events", { signal });
  if (!Array.isArray(data)) {
    throw new Error("法規異動 API 回傳格式錯誤，預期為陣列。");
  }
  return data;
}

export async function getPolicyRiskEventsByState(
  state: PolicyRiskEventState,
  signal?: AbortSignal,
): Promise<PolicyRiskEvent[]> {
  const { data } = await axiosClient.get<PolicyRiskEvent[]>("/policy/policy-risk-events", {
    params: { state },
    signal,
  });
  if (!Array.isArray(data)) {
    throw new Error("政策風險事件 API 回傳格式錯誤，預期為陣列。");
  }
  return data;
}

export async function getPolicyRiskEvent(
  riskEventId: number,
  signal?: AbortSignal,
): Promise<PolicyRiskEventDetail> {
  const { data } = await axiosClient.get<PolicyRiskEventDetail>(
    `/policy/policy-risk-events/${riskEventId}`,
    { signal },
  );
  return data;
}

export async function triggerActChangeEventSync(
  signal?: AbortSignal,
): Promise<ActChangeEventSyncResult> {
  const { data } = await axiosClient.get<ActChangeEventSyncResult>(
    "/act/act_change_event",
    { signal },
  );
  return data;
}

export async function getActChangeEventVersions(
  signal?: AbortSignal,
): Promise<ActChangeEventVersions> {
  const { data } = await axiosClient.get<ActChangeEventVersions>(
    "/act/act_change_event/versions",
    { signal },
  );
  if (!Array.isArray(data.events)) {
    throw new Error("法規版本比較 API 回傳格式錯誤。");
  }
  return data;
}

export async function importFirmPolicyXml(file: File): Promise<FirmPolicyImportResult> {
  const formData = new FormData();
  formData.append("xml_file", file);
  const { data } = await axiosClient.post<FirmPolicyImportResult>(
    "/act/firm-policy/import",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export interface FirmPolicyApi {
  policy_id: number;
  policy_name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  articles: {
    policy_article_id: number;
    chapter: string | null;
    article: number | null;
    paragraph: number | null;
    subparagraph: number | null;
    item: number | null;
    context: string;
  }[];
}

export async function getFirmPolicies(signal?: AbortSignal): Promise<FirmPolicyApi[]> {
  const { data } = await axiosClient.get<FirmPolicyApi[]>("/policy/firm-policies", { signal });
  if (!Array.isArray(data)) {
    throw new Error("公司內規 API 回傳格式錯誤，預期為陣列。");
  }
  return data;
}

export interface FirmPolicyHealth {
  policy_id: number;
  policy_name: string;
  chapter: string;
  affected_article_count: number;
  total_article_count: number;
  health: number;
}

export async function getFirmPolicyHealth(signal?: AbortSignal): Promise<FirmPolicyHealth[]> {
  const { data } = await axiosClient.get<FirmPolicyHealth[]>("/policy/health", { signal });
  if (!Array.isArray(data)) {
    throw new Error("內規健康度 API 回傳格式錯誤，預期為陣列。");
  }
  return data;
}