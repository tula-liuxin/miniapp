import cors from "cors";
import express from "express";
import {
  type AppState,
  type CheckinRecord,
  type ConsultationThread,
  type HomePriorityAction,
  type HomeTask,
  type PlazaComment,
  type PlazaPost,
  type SymptomAssessmentInput,
  buildGuidance,
  generateId,
  mediaTypeLabelMap,
  nowIso,
  riskLabelMap,
  stageLabelMap,
  truncate
} from "../../shared/domain";
import { appendAssessment, loadState, resetState, saveState } from "./state";

const app = express();
const port = Number(process.env.PORT ?? 3100);
const host = process.env.HOST ?? "0.0.0.0";

let state = loadState();

app.use(cors());
app.use(express.json());

function persist() {
  saveState(state);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function recentTimeline(type: string) {
  return state.diagnostics.timeline.filter((item) => item.type === type);
}

function getAuditEvents() {
  return state.diagnostics.timeline.filter((item) =>
    ["moderation", "consultation", "feedback"].includes(item.type)
  );
}

function pushTimeline(type: string, title: string, detail: string) {
  state.diagnostics.timeline.unshift({
    id: generateId("diag"),
    type: type as never,
    title,
    detail,
    createdAt: nowIso()
  });
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

function refreshModerationQueue() {
  const now = Date.now();
  let changed = false;

  state.plazaPosts = state.plazaPosts.map((post) => {
    if (post.status !== "pending" || !post.moderationDueAt) {
      return post;
    }

    if (new Date(post.moderationDueAt).getTime() > now) {
      return post;
    }

    changed = true;
    return {
      ...post,
      status: "approved",
      statusLabel: "已通过",
      moderationDueAt: undefined
    };
  });

  if (changed) {
    persist();
  }
}

function buildHomeTasks(): HomeTask[] {
  const latestAssessment = state.symptomAssessments[0];
  const activeReminderCount = state.reminders.filter((item) => item.enabled).length;
  const hasUrgentAlert = state.diagnostics.alertEvents.some((item) => item.level === "urgent");

  return [
    {
      id: "task-symptoms",
      title: "完成今日症状自评",
      description: latestAssessment ? "已记录最新一条症状数据，可随时补充说明。" : "建议在晚间统一完成一次自评。",
      status: latestAssessment ? "done" : "todo",
      iconKey: "symptom",
      url: "/pages/symptoms/index"
    },
    {
      id: "task-checkin",
      title: "更新健康打卡",
      description: state.checkins.length ? "最近一次打卡已生成，可继续补充饮食与情绪。" : "记录体温、血压、体重和运动情况。",
      status: state.checkins.length ? "done" : "todo",
      iconKey: "checkin",
      url: "/pages/checkin/index"
    },
    {
      id: "task-reminders",
      title: "确认提醒是否合适",
      description: activeReminderCount ? `当前已启用 ${activeReminderCount} 项提醒。` : "建议至少开启服药和自评提醒。",
      status: activeReminderCount ? "done" : "todo",
      iconKey: "reminder",
      url: "/pages/reminders/index"
    },
    {
      id: "task-help",
      title: "查看紧急联络方式",
      description: hasUrgentAlert ? "检测到高优先级预警，建议先确认热线和求助路径。" : "提前熟悉热线与求助入口，突发情况更从容。",
      status: hasUrgentAlert ? "attention" : "todo",
      iconKey: "help",
      url: "/pages/help/index"
    }
  ];
}

function buildPriorityAction(): HomePriorityAction {
  const latestAssessment = state.symptomAssessments[0];

  if (!latestAssessment) {
    return {
      title: "先建立今天的健康记录",
      body: "完成一次症状自评和健康打卡，首页推荐和提醒会更贴近当前状态。",
      level: "stable",
      iconKey: "checkin",
      ctaLabel: "开始记录",
      url: "/pages/checkin/index"
    };
  }

  if (latestAssessment.riskLevel === "urgent") {
    return {
      title: "优先处理高风险症状",
      body: "当前症状已达到高优先级阈值，建议先查看护理建议，并尽快联系医护团队。",
      level: "urgent",
      iconKey: "alert",
      ctaLabel: "查看症状建议",
      url: "/pages/symptoms/index"
    };
  }

  if (latestAssessment.riskLevel === "attention") {
    return {
      title: "今晚适合做一次重点复盘",
      body: "建议结合最新症状记录，补全行动计划或发起咨询，把风险控制在可管理范围内。",
      level: "attention",
      iconKey: "action",
      ctaLabel: "完善行动计划",
      url: "/pages/action-plan/index"
    };
  }

  return {
    title: "继续保持当前节奏",
    body: "今天整体状态处于可管理范围，适合完成学习内容并确认明天的提醒安排。",
    level: "stable",
    iconKey: "education",
    ctaLabel: "继续学习",
    url: "/pages/home/index"
  };
}

function buildHomePayload() {
  refreshModerationQueue();
  const latestAssessment = state.symptomAssessments[0];
  const favoriteCount = state.educationItems.filter((item) => item.isFavorite).length;
  const learningProgress = Math.round((favoriteCount / Math.max(state.educationItems.length, 1)) * 100);
  const recommendedPosts = [...state.plazaPosts]
    .filter((post) => post.status === "approved")
    .sort((left, right) => right.likes + right.favorites - (left.likes + left.favorites))
    .slice(0, 2)
    .map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt
    }));

  return {
    summary: {
      patientName: state.patientProfile.name,
      treatmentStageLabel: stageLabelMap[state.patientProfile.treatmentStage],
      greeting: "今天也在认真照顾自己",
      symptomDistressIndex: latestAssessment ? latestAssessment.distressIndex : 0,
      learningProgress,
      nextFollowUpDate: "2026-03-15",
      activeAlerts: state.diagnostics.alertEvents.length
    },
    educationFeed: state.educationItems
      .slice()
      .sort((left, right) =>
        left.stage === state.patientProfile.treatmentStage && right.stage !== state.patientProfile.treatmentStage
          ? -1
          : 1
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        stageLabel: stageLabelMap[item.stage],
        mediaTypeLabel: mediaTypeLabelMap[item.mediaType],
        durationLabel: `${item.durationMinutes} 分钟`,
        isFavorite: item.isFavorite
      })),
    actionPlanHighlights: state.actionPlans.slice(0, 2),
    mindfulnessCourses: state.mindfulnessCourses.map((item) => ({
      ...item,
      durationLabel: `${item.durationMinutes} 分钟`
    })),
    todayTasks: buildHomeTasks(),
    priorityAction: buildPriorityAction(),
    recommendedPosts,
    alerts: state.diagnostics.alertEvents.slice(0, 3).map((item) => ({
      ...item,
      levelLabel: riskLabelMap[item.level]
    }))
  };
}

function buildEducationItem(itemId: string) {
  const item = state.educationItems.find((entry) => entry.id === itemId);
  if (!item) {
    return null;
  }

  return {
    ...item,
    content: item.body,
    stageLabel: stageLabelMap[item.stage],
    mediaTypeLabel: mediaTypeLabelMap[item.mediaType],
    durationLabel: `${item.durationMinutes} 分钟`,
    keyPoints: item.takeaways
  };
}

function buildSymptomOverview() {
  const latest = state.symptomAssessments[0];
  return {
    latestAssessment: latest
      ? {
          ...latest,
          riskLevelLabel: riskLabelMap[latest.riskLevel]
        }
      : null,
    trends: latest
      ? [
          {
            label: "疼痛 NRS",
            latest: latest.painNrs,
            percent: Math.min(100, latest.painNrs * 10)
          },
          {
            label: "腹泻次数/天",
            latest: latest.diarrheaCount,
            percent: Math.min(100, latest.diarrheaCount * 20)
          },
          {
            label: "癌因性疲乏",
            latest: latest.fatigue,
            percent: Math.min(100, latest.fatigue * 10)
          }
        ]
      : [],
    alerts: state.diagnostics.alertEvents.slice(0, 5).map((item) => ({
      ...item,
      levelLabel: riskLabelMap[item.level]
    })),
    guidance: latest ? buildGuidance(latest) : []
  };
}

function buildConsultationOverview() {
  return {
    faqItems: state.faqItems,
    templates: state.communicationTemplates.map((content, index) => ({
      id: `template-${index + 1}`,
      label: `模板 ${index + 1}`,
      content
    })),
    threads: state.consultations.map((thread) => ({
      ...thread,
      replyStatusLabel: "已回复"
    })),
    proactiveGuidance: state.proactiveGuidance
  };
}

function buildWeeklyReport() {
  const latest = state.symptomAssessments[0];
  const latestCheckin = state.checkins[0];
  return {
    rangeLabel: "2026-03-02 至 2026-03-08",
    summary: latest
      ? `本周共完成 ${state.checkins.length} 次健康打卡和 ${state.symptomAssessments.length} 次症状记录，当前最高风险点集中在 ${latest.diarrheaCount >= 3 ? "腹泻管理" : "疲乏管理"}。`
      : "本周尚无足够数据，请先完成症状自评和健康打卡。",
    metrics: {
      symptomAssessments: state.symptomAssessments.length,
      checkins: state.checkins.length,
      completedReminders: state.reminders.filter((item) => item.enabled).length,
      learningMinutes: state.mindfulnessCourses.reduce((total, item) => total + item.durationMinutes, 0)
    },
    highlights: [
      {
        id: generateId("report"),
        title: "症状变化",
        body: latest ? latest.summary : "暂无最新症状总结。"
      },
      {
        id: generateId("report"),
        title: "健康行为执行情况",
        body: latestCheckin
          ? `最近一次打卡记录：运动 ${latestCheckin.exerciseMinutes} 分钟，情绪状态为 ${latestCheckin.mood}。`
          : "暂无最近打卡记录。"
      }
    ],
    nextActions: [
      "继续坚持每日症状自评与打卡",
      "若腹泻再次达到 3 次/天及以上，请及时联系医护团队",
      "本周至少完成 1 次正念放松训练"
    ]
  };
}

function buildRecordsSummary() {
  const metrics = {
    symptomCount: state.symptomAssessments.length,
    checkinCount: state.checkins.length,
    consultationCount: state.consultations.length,
    favoriteCount: state.educationItems.filter((item) => item.isFavorite).length
  };

  return {
    metrics,
    recentAssessments: state.symptomAssessments.slice(0, 3).map((item) => ({
      id: item.id,
      title: `风险等级：${riskLabelMap[item.riskLevel]}`,
      body: item.summary,
      createdAt: item.createdAt
    })),
    recentCheckins: state.checkins.slice(0, 3).map((item) => ({
      id: item.id,
      title: `体温 ${item.temperature} · 血压 ${item.bloodPressure}`,
      body: item.symptomChange || item.diet,
      createdAt: item.createdAt
    })),
    recentConsultations: state.consultations.slice(0, 3).map((item) => ({
      id: item.id,
      title: "医患咨询",
      body: truncate(item.content, 80),
      createdAt: item.createdAt
    })),
    learningRecords: state.educationItems
      .filter((item) => item.isFavorite)
      .map((item) => item.title)
  };
}

function buildDiagnosticsPayload() {
  refreshModerationQueue();
  return {
    alerts: state.diagnostics.alertEvents,
    reminders: recentTimeline("reminder"),
    exports: state.diagnostics.exports,
    emergencies: state.diagnostics.emergencies,
    audits: getAuditEvents()
  };
}

function renderDashboard() {
  const diagnostics = buildDiagnosticsPayload();
  const renderList = (items: Array<{ title?: string; detail?: string; createdAt?: string }>) => {
    if (!items.length) {
      return "<li>暂无记录</li>";
    }
    return items
      .map(
        (item) =>
          `<li><strong>${escapeHtml(item.title ?? "事件")}</strong><div>${escapeHtml(
            item.detail ?? ""
          )}</div><small>${escapeHtml(item.createdAt ?? "")}</small></li>`
      )
      .join("");
  };

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>系统诊断看板</title>
    <style>
      body { font-family: "Microsoft YaHei", sans-serif; background: #f6f2eb; color: #352a21; margin: 0; padding: 24px; }
      h1 { margin: 0 0 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
      .card { background: #fffaf3; border: 1px solid #ead9c8; border-radius: 16px; padding: 16px; box-shadow: 0 10px 24px rgba(87, 58, 31, 0.08); }
      ul { padding-left: 18px; margin: 12px 0 0; }
      li { margin-bottom: 10px; }
      small { color: #7a6d5e; display: block; margin-top: 4px; }
    </style>
  </head>
  <body>
    <h1>系统诊断看板</h1>
    <div class="grid">
      <section class="card"><h2>告警事件</h2><ul>${renderList(diagnostics.alerts)}</ul></section>
      <section class="card"><h2>提醒事件</h2><ul>${renderList(diagnostics.reminders)}</ul></section>
      <section class="card"><h2>导出记录</h2><ul>${renderList(
        diagnostics.exports.map((item) => ({ title: item.type, detail: "已生成导出请求", createdAt: item.createdAt }))
      )}</ul></section>
      <section class="card"><h2>紧急求助</h2><ul>${renderList(
        diagnostics.emergencies.map((item) => ({ title: "紧急求助", detail: item.source, createdAt: item.createdAt }))
      )}</ul></section>
      <section class="card"><h2>审核队列</h2><ul>${renderList(diagnostics.audits)}</ul></section>
    </div>
  </body>
</html>`;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, updatedAt: nowIso() });
});

app.post("/api/test/reset", (_req, res) => {
  state = resetState();
  res.json({ ok: true });
});

app.put("/api/test/reset", (_req, res) => {
  state = resetState();
  res.json({ ok: true });
});

app.delete("/api/test/reset", (_req, res) => {
  state = resetState();
  res.json({ ok: true });
});

app.get("/api/test/diagnostics", (_req, res) => {
  res.json(buildDiagnosticsPayload());
});

app.get("/dashboard", (_req, res) => {
  res.type("html").send(renderDashboard());
});

app.get("/api/patient/summary", (_req, res) => {
  res.json(buildHomePayload());
});

app.get("/api/education/:id", (req, res) => {
  const item = buildEducationItem(req.params.id);
  if (!item) {
    res.status(404).json({ message: "未找到教育内容" });
    return;
  }

  res.json(item);
});

app.post("/api/education/:id/favorite", (req, res) => {
  const item = state.educationItems.find((entry) => entry.id === req.params.id);
  if (!item) {
    res.status(404).json({ message: "未找到教育内容" });
    return;
  }

  item.isFavorite = !item.isFavorite;
  persist();
  res.json(buildEducationItem(item.id));
});

app.get("/api/symptoms/overview", (_req, res) => {
  res.json(buildSymptomOverview());
});

app.post("/api/symptoms/assessments", (req, res) => {
  const payload: SymptomAssessmentInput = {
    painNrs: Number(req.body.painNrs ?? 0),
    nausea: Number(req.body.nausea ?? 0),
    diarrheaCount: Number(req.body.diarrheaCount ?? 0),
    dermatitis: Number(req.body.dermatitis ?? 0),
    marrowSuppression: Number(req.body.marrowSuppression ?? 0),
    fatigue: Number(req.body.fatigue ?? 0),
    note: req.body.note ? String(req.body.note) : ""
  };

  appendAssessment(state, payload);
  persist();
  res.json(buildSymptomOverview());
});

app.get("/api/action-plans/overview", (_req, res) => {
  res.json({
    plans: state.actionPlans.map((plan) => ({
      ...plan,
      trigger: normalizeActionPlanText(plan.trigger),
      response: normalizeActionPlanText(plan.response)
    })),
    mindfulnessCourses: state.mindfulnessCourses,
    communicationTemplates: state.communicationTemplates
  });
});

app.post("/api/action-plans", (req, res) => {
  const plan = {
    id: generateId("plan"),
    trigger: normalizeActionPlanText(String(req.body.trigger ?? "")),
    response: normalizeActionPlanText(String(req.body.response ?? "")),
    reminderTime: String(req.body.reminderTime ?? "20:00"),
    active: true,
    createdAt: nowIso()
  };

  state.actionPlans.unshift(plan);
  pushTimeline("reminder", "新增行动计划提醒", `${plan.trigger} · ${plan.reminderTime}`);
  persist();
  res.json(plan);
});

app.post("/api/action-plans/:id/toggle", (req, res) => {
  const plan = state.actionPlans.find((entry) => entry.id === req.params.id);
  if (!plan) {
    res.status(404).json({ message: "未找到行动计划" });
    return;
  }

  plan.active = !plan.active;
  pushTimeline("reminder", plan.active ? "重新启用提醒" : "暂停提醒", normalizeActionPlanText(plan.trigger));
  persist();
  res.json(plan);
});

app.get("/api/consultations/overview", (_req, res) => {
  res.json(buildConsultationOverview());
});

app.post("/api/consultations", (req, res) => {
  const thread: ConsultationThread = {
    id: generateId("consult"),
    content: String(req.body.content ?? ""),
    attachment: req.body.attachment ? String(req.body.attachment) : null,
    createdAt: nowIso(),
    replyStatus: "responded",
    replyContent: "已收到你的咨询，建议继续补液并观察腹泻次数变化，如再次加重请尽快联系医护团队。",
    replyAt: nowIso()
  };

  state.consultations.unshift(thread);
  pushTimeline("consultation", "新的咨询已发送", truncate(thread.content, 80));
  persist();
  res.json(thread);
});

app.get("/api/checkins/latest", (_req, res) => {
  res.json({ latestCheckin: state.checkins[0] ?? null });
});

app.post("/api/checkins", (req, res) => {
  const checkin: CheckinRecord = {
    id: generateId("checkin"),
    createdAt: nowIso(),
    temperature: String(req.body.temperature ?? ""),
    bloodPressure: String(req.body.bloodPressure ?? ""),
    weight: String(req.body.weight ?? ""),
    symptomChange: String(req.body.symptomChange ?? ""),
    diet: String(req.body.diet ?? ""),
    exerciseMinutes: String(req.body.exerciseMinutes ?? ""),
    medication: String(req.body.medication ?? ""),
    mood: String(req.body.mood ?? "")
  };

  state.checkins.unshift(checkin);
  pushTimeline("reminder", "已记录今日打卡", `体温 ${checkin.temperature}，运动 ${checkin.exerciseMinutes} 分钟`);
  persist();
  res.json({ latestCheckin: checkin });
});

app.get("/api/reports/weekly", (_req, res) => {
  res.json(buildWeeklyReport());
});

app.get("/api/plaza/overview", (_req, res) => {
  refreshModerationQueue();
  const recommendedPosts = [...state.plazaPosts]
    .filter((post) => post.status === "approved")
    .sort((left, right) => right.likes + right.favorites - (left.likes + left.favorites))
    .slice(0, 3)
    .map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt
    }));

  res.json({
    recommendedPosts,
    posts: state.plazaPosts
  });
});

app.get("/api/plaza/posts/:id", (req, res) => {
  const post = state.plazaPosts.find((entry) => entry.id === req.params.id);
  if (!post) {
    res.status(404).json({ message: "未找到帖子" });
    return;
  }

  res.json(post);
});

app.post("/api/plaza/posts", (req, res) => {
  const post: PlazaPost = {
    id: generateId("post"),
    title: String(req.body.title ?? ""),
    content: String(req.body.content ?? ""),
    excerpt: truncate(String(req.body.content ?? ""), 56),
    tags: Array.isArray(req.body.tags) ? req.body.tags.map(String) : [],
    authorName: state.patientProfile.name,
    likes: 0,
    favorites: 0,
    likedByMe: false,
    favoritedByMe: false,
    status: "pending",
    statusLabel: "审核中",
    createdAt: nowIso(),
    isOwner: true,
    comments: [],
    moderationDueAt: new Date(Date.now() + 1200).toISOString()
  };

  state.plazaPosts.unshift(post);
  pushTimeline("moderation", "广场内容进入审核", post.title);
  persist();
  res.json(post);
});

app.patch("/api/plaza/posts/:id", (req, res) => {
  const post = state.plazaPosts.find((entry) => entry.id === req.params.id);
  if (!post) {
    res.status(404).json({ message: "未找到帖子" });
    return;
  }

  post.title = String(req.body.title ?? post.title);
  post.content = String(req.body.content ?? post.content);
  post.excerpt = truncate(post.content, 56);
  post.tags = Array.isArray(req.body.tags) ? req.body.tags.map(String) : post.tags;
  post.status = "pending";
  post.statusLabel = "审核中";
  post.moderationDueAt = new Date(Date.now() + 1200).toISOString();
  pushTimeline("moderation", "广场内容重新提交审核", post.title);
  persist();
  res.json(post);
});

app.delete("/api/plaza/posts/:id", (req, res) => {
  state.plazaPosts = state.plazaPosts.filter((entry) => entry.id !== req.params.id);
  persist();
  res.json({ ok: true });
});

app.post("/api/plaza/posts/:id/like", (req, res) => {
  const post = state.plazaPosts.find((entry) => entry.id === req.params.id);
  if (!post) {
    res.status(404).json({ message: "未找到帖子" });
    return;
  }

  post.likedByMe = !post.likedByMe;
  post.likes = Math.max(0, post.likes + (post.likedByMe ? 1 : -1));
  persist();
  res.json(post);
});

app.post("/api/plaza/posts/:id/favorite", (req, res) => {
  const post = state.plazaPosts.find((entry) => entry.id === req.params.id);
  if (!post) {
    res.status(404).json({ message: "未找到帖子" });
    return;
  }

  post.favoritedByMe = !post.favoritedByMe;
  post.favorites = Math.max(0, post.favorites + (post.favoritedByMe ? 1 : -1));
  persist();
  res.json(post);
});

app.post("/api/plaza/posts/:id/comments", (req, res) => {
  const post = state.plazaPosts.find((entry) => entry.id === req.params.id);
  if (!post) {
    res.status(404).json({ message: "未找到帖子" });
    return;
  }

  const comment: PlazaComment = {
    id: generateId("comment"),
    authorName: state.patientProfile.name,
    content: String(req.body.content ?? ""),
    createdAt: nowIso()
  };

  post.comments.push(comment);
  persist();
  res.json(comment);
});

app.get("/api/reminders", (_req, res) => {
  res.json({ reminderSettings: state.reminders });
});

app.put("/api/reminders", (req, res) => {
  state.reminders = Array.isArray(req.body.reminderSettings) ? req.body.reminderSettings : state.reminders;
  pushTimeline("reminder", "提醒设置已更新", `${state.reminders.length} 项提醒已同步`);
  persist();
  res.json({ reminderSettings: state.reminders });
});

app.get("/api/patient/profile", (_req, res) => {
  res.json({
    ...state.patientProfile,
    treatmentStageLabel: stageLabelMap[state.patientProfile.treatmentStage]
  });
});

app.get("/api/records/summary", (_req, res) => {
  res.json(buildRecordsSummary());
});

app.post("/api/exports", (req, res) => {
  const item = {
    id: generateId("export"),
    type: String(req.body.type ?? "records"),
    createdAt: nowIso()
  };

  state.diagnostics.exports.unshift(item);
  persist();
  res.json(item);
});

app.post("/api/emergency-help", (req, res) => {
  const item = {
    id: generateId("emergency"),
    source: String(req.body.source ?? "profile"),
    createdAt: nowIso()
  };

  state.diagnostics.emergencies.unshift(item);
  persist();
  res.json(item);
});

app.get("/api/help/content", (_req, res) => {
  res.json({
    guideSections: [
      {
        id: "guide-1",
        title: "如何开始一天的健康管理",
        body: "建议先完成症状自评，再查看阶段化知识推送，最后进行健康打卡和提醒确认。"
      },
      {
        id: "guide-2",
        title: "出现高风险症状时怎么办",
        body: "若疼痛 NRS 达到 7 分及以上、腹泻每天 3 次及以上或伴发热，请优先点击紧急求助并联系医护团队。"
      },
      {
        id: "guide-3",
        title: "如何更清晰地向医生表达问题",
        body: "按“症状是什么、持续多久、做过哪些处理、结果如何”四段式描述，更便于快速得到指导。"
      }
    ],
    hotline: "医院妇科肿瘤专科热线：021-5555-1200",
    hotlineLabel: "妇科肿瘤专科热线",
    hotlineNumber: "021-5555-1200",
    emergencySteps: [
      "先记录最明显的不适症状、持续时间和当前处理情况。",
      "若疼痛明显加重、腹泻频繁或伴随发热，请优先联系专科热线。",
      "如出现持续恶化或无法等待回复的情况，请立即前往医院或联系紧急联系人。"
    ]
  });
});

app.post("/api/feedback", (req, res) => {
  const item = {
    id: generateId("feedback"),
    content: String(req.body.content ?? ""),
    createdAt: nowIso()
  };

  state.feedbacks.unshift(item);
  pushTimeline("feedback", "收到患者反馈", truncate(item.content, 80));
  persist();
  res.json(item);
});

app.listen(port, host, () => {
  console.log(`[mock-server] listening on http://${host}:${port}`);
});
