const { request, showError } = require("../../utils/api");

const PLAN_PRESETS = [
  {
    id: "fatigue",
    title: "疲乏加重时",
    trigger: "当疲乏等级达到 5 分时",
    response: "我会进行 15 分钟的间歇性散步，并补充温水。"
  },
  {
    id: "diarrhea",
    title: "腹泻增多时",
    trigger: "当腹泻达到 3 次/天时",
    response: "我会先补液、记录饮食和排便次数，并尽快联系医护团队。"
  },
  {
    id: "sleep",
    title: "睡前焦虑时",
    trigger: "当晚上反复想事情、难以入睡时",
    response: "我会先做 5 分钟呼吸放松，放下手机，再决定是否需要向家人或医生求助。"
  },
  {
    id: "skin",
    title: "皮肤刺痛时",
    trigger: "当放疗区域出现刺痛或明显发红时",
    response: "我会先停止摩擦刺激，按护理指导保湿，并拍照记录变化。"
  }
];

function normalizePlanText(value) {
  const normalized = String(value || "").trim();
  if (normalized === "When fatigue reaches 5") {
    return "当疲乏等级达到 5 分时";
  }
  if (normalized === "Take a 15 minute interval walk and hydrate") {
    return "我会进行 15 分钟的间歇性散步，并补充温水。";
  }
  return normalized;
}

Page({
  data: {
    form: {
      trigger: "",
      response: "",
      reminderTime: "20:00"
    },
    plans: [],
    mindfulnessCourses: [],
    communicationTemplates: [],
    planPresets: PLAN_PRESETS,
    selectedPresetId: "",
    canSave: false,
    saving: false
  },

  onShow() {
    this.loadData();
    this.updateSaveState();
  },

  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData(
      {
        [`form.${key}`]: event.detail.value,
        selectedPresetId: ""
      },
      () => this.updateSaveState()
    );
  },

  onTimeChange(event) {
    this.setData(
      {
        "form.reminderTime": event.detail.value
      },
      () => this.updateSaveState()
    );
  },

  applyPreset(event) {
    const { id } = event.currentTarget.dataset;
    const preset = PLAN_PRESETS.find((item) => item.id === id);
    if (!preset) {
      return;
    }

    this.setData(
      {
        selectedPresetId: preset.id,
        form: {
          trigger: preset.trigger,
          response: preset.response,
          reminderTime: this.data.form.reminderTime || "20:00"
        }
      },
      () => this.updateSaveState()
    );
  },

  copyTemplate(event) {
    const { content } = event.currentTarget.dataset;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({ title: "已复制到剪贴板", icon: "success" });
      }
    });
  },

  updateSaveState() {
    const trigger = String(this.data.form.trigger || "").trim();
    const response = String(this.data.form.response || "").trim();
    this.setData({ canSave: Boolean(trigger && response && this.data.form.reminderTime) });
  },

  normalizePlan(plan) {
    return {
      ...plan,
      trigger: normalizePlanText(plan.trigger),
      response: normalizePlanText(plan.response)
    };
  },

  async loadData() {
    try {
      const payload = await request({ url: "/action-plans/overview" });
      this.setData({
        plans: (payload.plans || []).map((plan) => this.normalizePlan(plan)),
        mindfulnessCourses: payload.mindfulnessCourses || [],
        communicationTemplates: payload.communicationTemplates || []
      });
    } catch (error) {
      showError(error);
    }
  },

  async savePlan() {
    if (!this.data.canSave || this.data.saving) {
      return;
    }

    const payload = {
      trigger: String(this.data.form.trigger || "").trim(),
      response: String(this.data.form.response || "").trim(),
      reminderTime: this.data.form.reminderTime || "20:00"
    };

    if (!payload.trigger || !payload.response) {
      wx.showToast({ title: "先补全触发场景和行动计划", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      await request({ url: "/action-plans", method: "POST", data: payload });
      wx.showToast({ title: "行动计划已保存", icon: "success" });
      this.setData(
        {
          selectedPresetId: "",
          form: {
            trigger: "",
            response: "",
            reminderTime: payload.reminderTime
          }
        },
        () => this.updateSaveState()
      );
      this.loadData();
    } catch (error) {
      showError(error);
    } finally {
      this.setData({ saving: false });
    }
  },

  async togglePlan(event) {
    const { id } = event.currentTarget.dataset;
    try {
      const plan = await request({ url: `/action-plans/${id}/toggle`, method: "POST" });
      const nextPlan = this.normalizePlan(plan);
      this.setData({
        plans: this.data.plans.map((item) => (item.id === nextPlan.id ? nextPlan : item))
      });
    } catch (error) {
      showError(error);
    }
  }
});
