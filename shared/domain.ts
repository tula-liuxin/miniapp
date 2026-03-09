export type TreatmentStage = "screening" | "chemoradiotherapy" | "recovery";
export type EducationMediaType = "article" | "audio" | "video";
export type RiskLevel = "stable" | "attention" | "urgent";
export type PostStatus = "pending" | "approved" | "rejected";

export interface PatientProfile {
  id: string;
  name: string;
  treatmentStage: TreatmentStage;
  diagnosis: string;
  treatmentPlan: string;
  followUpPlan: string;
  careTeam: string;
  emergencyContact: string;
}

export interface EducationItem {
  id: string;
  title: string;
  summary: string;
  body: string;
  mediaType: EducationMediaType;
  stage: TreatmentStage;
  durationMinutes: number;
  isFavorite: boolean;
  takeaways: string[];
}

export interface SymptomAssessmentInput {
  painNrs: number;
  nausea: number;
  diarrheaCount: number;
  dermatitis: number;
  marrowSuppression: number;
  fatigue: number;
  note?: string;
}

export interface SymptomAssessment extends SymptomAssessmentInput {
  id: string;
  createdAt: string;
  distressIndex: number;
  riskLevel: RiskLevel;
  summary: string;
}

export interface GuidanceItem {
  id: string;
  topic: string;
  title: string;
  body: string;
  urgent: boolean;
}

export interface AlertEvent {
  id: string;
  type: "alert";
  level: RiskLevel;
  title: string;
  message: string;
  createdAt: string;
}

export interface ActionPlan {
  id: string;
  trigger: string;
  response: string;
  reminderTime: string;
  active: boolean;
  createdAt: string;
}

export interface MindfulnessCourse {
  id: string;
  title: string;
  summary: string;
  durationMinutes: number;
}

export interface ConsultationThread {
  id: string;
  content: string;
  attachment: string | null;
  createdAt: string;
  replyStatus: "responded";
  replyContent: string;
  replyAt: string;
}

export interface CheckinRecord {
  id: string;
  temperature: string;
  bloodPressure: string;
  weight: string;
  symptomChange: string;
  diet: string;
  exerciseMinutes: string;
  medication: string;
  mood: string;
  createdAt: string;
}

export interface PlazaComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface PlazaPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  authorName: string;
  likes: number;
  favorites: number;
  likedByMe: boolean;
  favoritedByMe: boolean;
  status: PostStatus;
  statusLabel: string;
  createdAt: string;
  isOwner: boolean;
  comments: PlazaComment[];
  moderationDueAt?: string;
}

export interface ReminderSetting {
  id: string;
  label: string;
  channelLabel: string;
  enabled: boolean;
  time: string;
}

export interface DiagnosticEvent {
  id: string;
  type: "alert" | "reminder" | "export" | "emergency" | "moderation" | "feedback" | "consultation";
  title: string;
  detail: string;
  createdAt: string;
}

export interface AppState {
  patientProfile: PatientProfile;
  educationItems: EducationItem[];
  mindfulnessCourses: MindfulnessCourse[];
  communicationTemplates: string[];
  faqItems: Array<{ id: string; question: string; answer: string }>;
  actionPlans: ActionPlan[];
  symptomAssessments: SymptomAssessment[];
  consultations: ConsultationThread[];
  proactiveGuidance: Array<{ id: string; title: string; body: string }>;
  checkins: CheckinRecord[];
  plazaPosts: PlazaPost[];
  reminders: ReminderSetting[];
  feedbacks: Array<{ id: string; content: string; createdAt: string }>;
  diagnostics: {
    alertEvents: AlertEvent[];
    timeline: DiagnosticEvent[];
    exports: Array<{ id: string; type: string; createdAt: string }>;
    emergencies: Array<{ id: string; source: string; createdAt: string }>;
  };
}

export const stageLabelMap: Record<TreatmentStage, string> = {
  screening: "筛查期",
  chemoradiotherapy: "放化疗期",
  recovery: "康复期"
};

export const mediaTypeLabelMap: Record<EducationMediaType, string> = {
  article: "图文",
  audio: "音频",
  video: "短视频"
};

export const riskLabelMap: Record<RiskLevel, string> = {
  stable: "稳定",
  attention: "重点关注",
  urgent: "紧急"
};

export function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function computeDistressIndex(input: SymptomAssessmentInput) {
  const weighted =
    input.painNrs * 1.3 +
    input.nausea * 0.9 +
    input.dermatitis * 1 +
    input.marrowSuppression * 1.2 +
    input.fatigue * 1.1 +
    Math.min(input.diarrheaCount, 10) * 1.4;
  return Math.round((weighted / 6.9) * 10) / 10;
}

export function deriveRiskLevel(input: SymptomAssessmentInput): RiskLevel {
  if (input.painNrs >= 7 || input.diarrheaCount >= 3 || input.marrowSuppression >= 7) {
    return "urgent";
  }
  if (input.fatigue >= 6 || input.dermatitis >= 5 || input.nausea >= 5) {
    return "attention";
  }
  return "stable";
}

export function summarizeAssessment(input: SymptomAssessmentInput) {
  const parts = [];
  if (input.painNrs >= 7) {
    parts.push("疼痛达到高风险阈值");
  }
  if (input.diarrheaCount >= 3) {
    parts.push("腹泻次数偏高");
  }
  if (input.fatigue >= 6) {
    parts.push("疲乏影响日常活动");
  }
  if (parts.length === 0) {
    parts.push("总体症状处于可管理范围");
  }
  return `${parts.join("，")}。建议结合个性化护理指导及时调整计划。`;
}

export function buildGuidance(input: SymptomAssessmentInput): GuidanceItem[] {
  const guidance: GuidanceItem[] = [];

  if (input.dermatitis >= 4) {
    guidance.push({
      id: generateId("guide"),
      topic: "放射性皮炎",
      title: "皮肤屏障修复优先",
      body: "保持放疗区域轻柔清洁和保湿，避免搔抓与热敷。若皮肤破溃、渗液或伴感染迹象，请尽快联系医护团队。",
      urgent: input.dermatitis >= 7
    });
  }

  if (input.marrowSuppression >= 4) {
    guidance.push({
      id: generateId("guide"),
      topic: "骨髓抑制",
      title: "关注感染与出血信号",
      body: "近期建议重点关注体温、口腔溃疡、牙龈出血和瘀斑，外出佩戴口罩，饮食保证熟食和清洁。",
      urgent: input.marrowSuppression >= 7
    });
  }

  if (input.diarrheaCount >= 2) {
    guidance.push({
      id: generateId("guide"),
      topic: "放射性肠炎/腹泻",
      title: "先从饮食与补液做强化管理",
      body: "选择低脂、少渣、温和饮食，注意补液补盐；若腹泻达到 3 次/天及以上，建议尽快就医评估。",
      urgent: input.diarrheaCount >= 3
    });
  }

  guidance.push({
    id: generateId("guide"),
    topic: "癌因性疲乏",
    title: "按疲乏等级调整休息与活动",
    body:
      input.fatigue >= 6
        ? "建议采用间歇式放松训练与碎片化活动，优先完成必要事项并留出恢复时间。"
        : "可维持轻量室内步行与规律作息，避免久卧导致耐力继续下降。",
    urgent: false
  });

  return guidance;
}

export function buildAlerts(assessment: SymptomAssessment): AlertEvent[] {
  const alerts: AlertEvent[] = [];

  if (assessment.painNrs >= 7) {
    alerts.push({
      id: generateId("alert"),
      type: "alert",
      level: "urgent",
      title: "疼痛达到高风险阈值",
      message: "系统已记录疼痛 NRS ≥ 7 分，建议尽快联系责任医护人员，并按既定止痛方案处理。",
      createdAt: assessment.createdAt
    });
  }

  if (assessment.diarrheaCount >= 3) {
    alerts.push({
      id: generateId("alert"),
      type: "alert",
      level: "urgent",
      title: "腹泻次数达到强化管理阈值",
      message: "系统检测到腹泻 ≥ 3 次/天，请及时补液，必要时尽快就医并复核用药与饮食。",
      createdAt: assessment.createdAt
    });
  }

  if (assessment.riskLevel === "attention" && alerts.length === 0) {
    alerts.push({
      id: generateId("alert"),
      type: "alert",
      level: "attention",
      title: "症状进入重点关注状态",
      message: "建议强化自我观察，按护理指导调整，并在 24 小时内重新完成一次自评。",
      createdAt: assessment.createdAt
    });
  }

  return alerts;
}

export function getTrendValue(assessments: SymptomAssessment[], key: keyof SymptomAssessmentInput) {
  const latest = assessments[0];
  if (!latest) {
    return 0;
  }
  return Number(latest[key]);
}

export function truncate(text: string, length = 48) {
  return text.length > length ? `${text.slice(0, length)}...` : text;
}
