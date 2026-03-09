const { request, showError } = require("../../utils/api");
const { formatDate, pick } = require("../../utils/format");

function buildFallbackTasks(summary) {
  return [
    {
      id: "task-checkin",
      icon: "打",
      title: "完成今日打卡",
      description: "记录体温、饮食和运动情况，让周复盘更完整。",
      statusLabel: "建议今天完成",
      url: "/pages/checkin/index"
    },
    {
      id: "task-symptom",
      icon: "症",
      title: "更新症状自评",
      description: `当前困扰指数 ${summary.symptomDistressIndex || 0}，继续保持连续记录。`,
      statusLabel: summary.activeAlerts ? "有提醒需关注" : "记录越连续越准确",
      url: "/pages/symptoms/index"
    },
    {
      id: "task-reminder",
      icon: "提",
      title: "确认提醒设置",
      description: "检查复查、自评和课程提醒，避免漏掉关键节点。",
      statusLabel: `下次复查 ${summary.nextFollowUpDate || "--"}`,
      url: "/pages/reminders/index"
    }
  ];
}

function buildFallbackPriority(summary) {
  if (summary.activeAlerts) {
    return {
      icon: "警",
      title: "优先查看预警与护理建议",
      description: `当前有 ${summary.activeAlerts} 条活跃提醒，建议先完成症状自评并查看行动计划。`,
      actionText: "去看症状页",
      url: "/pages/symptoms/index"
    };
  }

  return {
    icon: "今",
    title: "先完成一项今天最重要的事情",
    description: "建议先打卡或更新症状自评，再继续学习和咨询。",
    actionText: "去打卡",
    url: "/pages/checkin/index"
  };
}

function normalizeEducationFeed(feed) {
  return pick(feed).map((item) => ({
    ...item,
    favoriteLabel: item.isFavorite ? "已收藏" : "收藏"
  }));
}

function normalizeTasks(tasks) {
  return pick(tasks).map((task) => ({
    ...task,
    iconText: task.icon || task.iconKey || "任",
    statusText: task.statusLabel || task.status || "待处理"
  }));
}

function normalizePriorityAction(action, summary) {
  const fallback = buildFallbackPriority(summary);
  const source = action || fallback;
  return {
    ...source,
    iconText: source.icon || source.iconKey || "今",
    descriptionText: source.description || source.body,
    actionTextLabel: source.actionText || source.ctaLabel || "立即查看"
  };
}

Page({
  data: {
    loading: true,
    summary: {
      patientName: "王女士",
      treatmentStageLabel: "放化疗期",
      greeting: "今天也在认真照顾自己",
      symptomDistressIndex: 0,
      learningProgress: 0,
      nextFollowUpDate: "--",
      activeAlerts: 0
    },
    todayTasks: [],
    priorityAction: null,
    educationFeed: [],
    actionPlanHighlights: [],
    mindfulnessCourses: [],
    recommendedPosts: [],
    alerts: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const payload = await request({ url: "/patient/summary" });
      const summary = payload.summary || this.data.summary;
      this.setData({
        loading: false,
        summary,
        todayTasks: normalizeTasks(pick(payload.todayTasks).length ? pick(payload.todayTasks) : buildFallbackTasks(summary)),
        priorityAction: normalizePriorityAction(payload.priorityAction, summary),
        educationFeed: normalizeEducationFeed(payload.educationFeed),
        actionPlanHighlights: pick(payload.actionPlanHighlights).map((item) => ({
          ...item,
          reminderLabel: item.reminderTime || "已开启提醒"
        })),
        mindfulnessCourses: pick(payload.mindfulnessCourses).map((item) => ({
          ...item,
          durationText: item.durationLabel || `${item.durationMinutes} 分钟`
        })),
        recommendedPosts: pick(payload.recommendedPosts),
        alerts: pick(payload.alerts).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) }))
      });
    } catch (error) {
      this.setData({
        loading: false,
        todayTasks: normalizeTasks(buildFallbackTasks(this.data.summary)),
        priorityAction: normalizePriorityAction(buildFallbackPriority(this.data.summary), this.data.summary)
      });
      showError(error);
    }
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/education-detail/index?id=${id}` });
  },

  async toggleFavorite(event) {
    const { id } = event.currentTarget.dataset;
    try {
      await request({ url: `/education/${id}/favorite`, method: "POST" });
      this.loadData();
    } catch (error) {
      showError(error);
    }
  },

  openPage(event) {
    const { url } = event.currentTarget.dataset;
    wx.navigateTo({ url });
  }
});
