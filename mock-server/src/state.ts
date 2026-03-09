import fs from "node:fs";
import path from "node:path";
import {
  type AppState,
  type CheckinRecord,
  type PlazaPost,
  type SymptomAssessment,
  buildAlerts,
  buildGuidance,
  computeDistressIndex,
  deriveRiskLevel,
  generateId,
  nowIso,
  summarizeAssessment
} from "../../shared/domain";

const runtimeDir = path.resolve(process.cwd(), "mock-server", "runtime");
const stateFile = path.join(runtimeDir, "state.json");

function seedAssessment(input: Omit<SymptomAssessment, "id" | "createdAt" | "distressIndex" | "riskLevel" | "summary">): SymptomAssessment {
  const createdAt = nowIso();
  return {
    id: generateId("assessment"),
    createdAt,
    distressIndex: computeDistressIndex(input),
    riskLevel: deriveRiskLevel(input),
    summary: summarizeAssessment(input),
    ...input
  };
}

function seedCheckin(partial: Omit<CheckinRecord, "id" | "createdAt">): CheckinRecord {
  return {
    id: generateId("checkin"),
    createdAt: nowIso(),
    ...partial
  };
}

function seedPost(partial: Partial<PlazaPost> & Pick<PlazaPost, "title" | "content">): PlazaPost {
  return {
    id: partial.id || generateId("post"),
    title: partial.title,
    content: partial.content,
    excerpt: partial.excerpt || partial.content.slice(0, 56),
    tags: partial.tags || ["康复", "经验"],
    authorName: partial.authorName || "王女士",
    likes: partial.likes ?? 0,
    favorites: partial.favorites ?? 0,
    likedByMe: partial.likedByMe ?? false,
    favoritedByMe: partial.favoritedByMe ?? false,
    status: partial.status || "approved",
    statusLabel: partial.statusLabel || "已通过",
    createdAt: partial.createdAt || nowIso(),
    isOwner: partial.isOwner ?? true,
    comments: partial.comments || []
  };
}

function normalizeActionPlanText(value: string) {
  const normalized = String(value || "").trim();
  if (normalized === "When fatigue reaches 5") {
    return "当疲乏等级达到 5 分时";
  }
  if (normalized === "Take a 15 minute interval walk and hydrate") {
    return "我会进行 15 分钟的间歇性散步，并补充温水。";
  }
  return normalized;
}

function migrateState(state: AppState) {
  state.actionPlans = (state.actionPlans || []).map((plan) => ({
    ...plan,
    trigger: normalizeActionPlanText(plan.trigger),
    response: normalizeActionPlanText(plan.response)
  }));

  state.plazaPosts = (state.plazaPosts || []).map((post) => ({
    ...post,
    likedByMe: Boolean(post.likedByMe),
    favoritedByMe: Boolean(post.favoritedByMe),
    comments: Array.isArray(post.comments) ? post.comments : []
  }));

  return state;
}

export function createSeedState(): AppState {
  const symptomAssessments = [
    seedAssessment({
      painNrs: 2,
      nausea: 3,
      diarrheaCount: 1,
      dermatitis: 2,
      marrowSuppression: 3,
      fatigue: 4,
      note: "今天整体平稳，午后稍有疲惫。"
    }),
    seedAssessment({
      painNrs: 4,
      nausea: 3,
      diarrheaCount: 2,
      dermatitis: 4,
      marrowSuppression: 4,
      fatigue: 5,
      note: "放疗区域轻度发红。"
    })
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const checkins = [
    seedCheckin({
      temperature: "36.7",
      bloodPressure: "116/74",
      weight: "58.8",
      symptomChange: "疲乏较前一天略有缓解。",
      diet: "少量多餐，增加了温软食物。",
      exerciseMinutes: "18",
      medication: "已按计划服药",
      mood: "平稳"
    }),
    seedCheckin({
      temperature: "36.8",
      bloodPressure: "118/76",
      weight: "58.5",
      symptomChange: "皮肤泛红，需要继续保湿。",
      diet: "清淡饮食",
      exerciseMinutes: "22",
      medication: "已按计划服药",
      mood: "略紧张"
    })
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const plazaPosts = [
    seedPost({
      title: "放化疗期我是怎么把腹泻控制下来的",
      content: "我把饮食调整成低脂少渣，并把喝水拆成很多小口，连续三天后情况明显稳定下来。",
      tags: ["放化疗", "腹泻管理"],
      likes: 16,
      favorites: 9,
      comments: [
        {
          id: generateId("comment"),
          authorName: "李女士",
          content: "谢谢分享，我也准备试试少量多餐。",
          createdAt: nowIso()
        }
      ]
    }),
    seedPost({
      title: "疲乏明显时，我的间歇散步安排",
      content: "把 15 分钟步行拆成三段后更容易坚持，也不会一下子太累。",
      tags: ["疲乏", "运动"],
      likes: 12,
      favorites: 7,
      authorName: "张女士",
      isOwner: false
    })
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const diagnosticsAlerts = symptomAssessments.flatMap((assessment) => buildAlerts(assessment));

  return {
    patientProfile: {
      id: "patient-001",
      name: "王女士",
      treatmentStage: "chemoradiotherapy",
      diagnosis: "宫颈癌 IIB 期",
      treatmentPlan: "同步放化疗 + 规律复查",
      followUpPlan: "每 3 个月门诊复查一次，必要时完善影像学检查。",
      careTeam: "妇科肿瘤病区 3 组",
      emergencyContact: "李先生 138-0000-0000"
    },
    educationItems: [
      {
        id: "edu-01",
        title: "宫颈癌的病因、预防与筛查重点",
        summary: "帮助你快速理解 HPV、筛查路径和早期预防策略。",
        body: "宫颈癌与高危型 HPV 持续感染密切相关。规律筛查、HPV 疫苗接种、异常出血及早就诊，是当前最关键的三级预防路径。",
        mediaType: "article",
        stage: "screening",
        durationMinutes: 6,
        isFavorite: false,
        takeaways: ["异常出血需尽快就诊", "筛查与疫苗是重要预防策略"]
      },
      {
        id: "edu-02",
        title: "同步放化疗期：药物原理与常见副作用",
        summary: "梳理放疗、化疗协同原理，以及恶心、腹泻、皮炎等副作用的日常观察要点。",
        body: "同步放化疗通过提高肿瘤细胞敏感性达到更好的局部控制。治疗过程中需重点关注腹泻、皮肤损伤、骨髓抑制和疲乏，并及时完成症状记录。",
        mediaType: "video",
        stage: "chemoradiotherapy",
        durationMinutes: 8,
        isFavorite: true,
        takeaways: ["每日记录症状变化", "高风险症状要尽快报告"]
      },
      {
        id: "edu-03",
        title: "康复期复发筛查与长期健康管理",
        summary: "从复查时间表、危险信号到睡眠、营养和运动一并梳理。",
        body: "康复期重点是规律复查、识别复发风险信号，并通过营养、运动和情绪管理帮助恢复长期生活质量。",
        mediaType: "article",
        stage: "recovery",
        durationMinutes: 7,
        isFavorite: false,
        takeaways: ["坚持复查时间表", "优先保持规律作息和适量运动"]
      },
      {
        id: "edu-04",
        title: "5 分钟正念呼吸，缓解治疗相关焦虑",
        summary: "适合睡前或治疗后收听的正念练习。",
        body: "找一个安静舒适的位置，缓慢吸气、停顿、呼气，让注意力回到身体感受，并允许情绪存在而不急着对抗。",
        mediaType: "audio",
        stage: "chemoradiotherapy",
        durationMinutes: 5,
        isFavorite: true,
        takeaways: ["用呼吸重新找回节律", "情绪波动时先稳定身体感受"]
      }
    ],
    mindfulnessCourses: [
      {
        id: "mind-01",
        title: "5 分钟正念呼吸",
        summary: "治疗后快速降噪，缓解心慌与紧张感。",
        durationMinutes: 5
      },
      {
        id: "mind-02",
        title: "渐进式肌肉放松",
        summary: "适合睡前做一轮，帮助身体真正放下紧绷。",
        durationMinutes: 8
      }
    ],
    communicationTemplates: [
      "医生，我最近出现了腹泻和疲劳，尝试清淡饮食后仍无明显缓解，您建议我下一步怎么处理？",
      "我这两天放疗区域皮肤发红并伴轻微刺痛，请问现在需要重点注意什么？",
      "最近情绪波动比较大，想了解有没有适合我当前阶段的放松方法和转诊建议？"
    ],
    faqItems: [
      {
        id: "faq-01",
        question: "腹泻什么时候需要尽快就医？",
        answer: "当腹泻达到 3 次/天及以上、伴明显乏力、口渴或尿量减少时，建议尽快就医评估。"
      },
      {
        id: "faq-02",
        question: "放疗区皮肤发红能热敷吗？",
        answer: "不建议热敷。应以轻柔清洁、保湿和避免摩擦为主，若破溃渗液需尽快联系医护。"
      }
    ],
    actionPlans: [
      {
        id: generateId("plan"),
        trigger: "当疲乏等级达到 5 分时",
        response: "我会进行 15 分钟的间歇式散步，并把家务拆成两段完成。",
        reminderTime: "20:00",
        active: true,
        createdAt: nowIso()
      }
    ],
    symptomAssessments,
    consultations: [
      {
        id: generateId("consult"),
        content: "最近放疗后皮肤发红，有轻微灼热感，应该怎样护理？",
        attachment: null,
        createdAt: nowIso(),
        replyStatus: "responded",
        replyContent: "建议继续轻柔清洁和保湿，避免搔抓与热敷；若出现破溃、感染或渗液，请尽快来院评估。",
        replyAt: nowIso()
      }
    ],
    proactiveGuidance: [
      {
        id: generateId("push"),
        title: "腹泻管理强化提醒",
        body: "如果今天腹泻次数继续增加，建议按时补液并复查用药，必要时尽快联系责任医护。"
      }
    ],
    checkins,
    plazaPosts,
    reminders: [
      { id: "rem-01", label: "服药提醒", channelLabel: "APP 内消息 / Mock 短信", enabled: true, time: "08:30" },
      { id: "rem-02", label: "复查提醒", channelLabel: "APP 内消息 / Mock 短信", enabled: true, time: "09:00" },
      { id: "rem-03", label: "症状自评提醒", channelLabel: "APP 内消息", enabled: true, time: "19:30" },
      { id: "rem-04", label: "课程学习提醒", channelLabel: "APP 内消息", enabled: false, time: "21:00" }
    ],
    feedbacks: [],
    diagnostics: {
      alertEvents: diagnosticsAlerts,
      timeline: diagnosticsAlerts.map((item) => ({
        id: item.id,
        type: "alert",
        title: item.title,
        detail: item.message,
        createdAt: item.createdAt
      })),
      exports: [],
      emergencies: []
    }
  };
}

export function ensureRuntimeDir() {
  fs.mkdirSync(runtimeDir, { recursive: true });
}

export function loadState() {
  ensureRuntimeDir();
  if (!fs.existsSync(stateFile)) {
    const seed = createSeedState();
    saveState(seed);
    return seed;
  }
  const loaded = JSON.parse(fs.readFileSync(stateFile, "utf8")) as AppState;
  const migrated = migrateState(loaded);
  saveState(migrated);
  return migrated;
}

export function saveState(state: AppState) {
  ensureRuntimeDir();
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), "utf8");
}

export function resetState() {
  const nextState = createSeedState();
  saveState(nextState);
  return nextState;
}

export function appendAssessment(state: AppState, input: Omit<SymptomAssessment, "id" | "createdAt" | "distressIndex" | "riskLevel" | "summary">) {
  const assessment = seedAssessment(input);
  state.symptomAssessments.unshift(assessment);
  const alerts = buildAlerts(assessment);
  if (alerts.length) {
    state.diagnostics.alertEvents.unshift(...alerts);
    state.diagnostics.timeline.unshift(
      ...alerts.map((item) => ({
        id: item.id,
        type: "alert" as const,
        title: item.title,
        detail: item.message,
        createdAt: item.createdAt
      }))
    );
  }
  state.proactiveGuidance.unshift({
    id: generateId("push"),
    title: assessment.riskLevel === "urgent" ? "高优先级症状处理建议" : "个性化症状管理建议",
    body: buildGuidance(assessment)[0].body
  });
  return assessment;
}
