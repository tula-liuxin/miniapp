const { request, showError } = require("../../utils/api");
const { formatDate } = require("../../utils/format");

function computeDistress(form) {
  const weighted =
    Number(form.painNrs || 0) * 1.3 +
    Number(form.nausea || 0) * 0.9 +
    Number(form.dermatitis || 0) * 1 +
    Number(form.marrowSuppression || 0) * 1.2 +
    Number(form.fatigue || 0) * 1.1 +
    Math.min(Number(form.diarrheaCount || 0), 10) * 1.4;
  return Math.round((weighted / 6.9) * 10) / 10;
}

function buildPreview(form) {
  const pain = Number(form.painNrs || 0);
  const diarrhea = Number(form.diarrheaCount || 0);
  const marrow = Number(form.marrowSuppression || 0);
  const fatigue = Number(form.fatigue || 0);
  const dermatitis = Number(form.dermatitis || 0);
  const nausea = Number(form.nausea || 0);

  let tone = "soft";
  let title = "当前状态可继续观察";
  let description = "建议按今天的实际情况完成记录，系统会结合历史数据生成更准确的趋势和护理建议。";

  if (pain >= 7 || diarrhea >= 3 || marrow >= 7) {
    tone = "danger";
    title = "已经触发高优先级预警阈值";
    description = "建议尽快联系医护团队，同时完善今日记录，便于系统生成应对建议和后续提醒。";
  } else if (fatigue >= 6 || dermatitis >= 5 || nausea >= 5) {
    tone = "warm";
    title = "症状进入重点关注区间";
    description = "今天适合加强观察和护理管理，系统会在提交后给出更有针对性的建议。";
  }

  return {
    tone,
    title,
    description,
    distressIndex: computeDistress(form)
  };
}

Page({
  data: {
    form: {
      painNrs: 3,
      nausea: 2,
      diarrheaCount: 1,
      dermatitis: 2,
      marrowSuppression: 2,
      fatigue: 4,
      note: ""
    },
    preview: buildPreview({
      painNrs: 3,
      nausea: 2,
      diarrheaCount: 1,
      dermatitis: 2,
      marrowSuppression: 2,
      fatigue: 4,
      note: ""
    }),
    latestAssessment: null,
    trends: [],
    alerts: [],
    guidance: []
  },

  onShow() {
    this.loadOverview();
  },

  updatePreview(nextForm) {
    this.setData({ preview: buildPreview(nextForm) });
  },

  onSliderChange(event) {
    const key = event.currentTarget.dataset.key;
    const nextForm = {
      ...this.data.form,
      [key]: Number(event.detail.value)
    };
    this.setData({ [`form.${key}`]: nextForm[key] });
    this.updatePreview(nextForm);
  },

  onInputChange(event) {
    const key = event.currentTarget.dataset.key;
    const value = key === "note" ? event.detail.value : Number(event.detail.value || 0);
    const nextForm = {
      ...this.data.form,
      [key]: value
    };
    this.setData({ [`form.${key}`]: value });
    this.updatePreview(nextForm);
  },

  async loadOverview() {
    try {
      const payload = await request({ url: "/symptoms/overview" });
      this.setData({
        latestAssessment: payload.latestAssessment,
        trends: payload.trends || [],
        alerts: (payload.alerts || []).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) })),
        guidance: payload.guidance || []
      });
    } catch (error) {
      showError(error);
    }
  },

  async submitAssessment() {
    try {
      wx.showLoading({ title: "提交中" });
      const payload = await request({ url: "/symptoms/assessments", method: "POST", data: this.data.form });
      wx.hideLoading();
      wx.showToast({ title: "已完成自评", icon: "success" });
      this.setData({
        latestAssessment: payload.latestAssessment,
        trends: payload.trends || [],
        alerts: (payload.alerts || []).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) })),
        guidance: payload.guidance || []
      });
    } catch (error) {
      wx.hideLoading();
      showError(error);
    }
  },

  openActionPlan() {
    wx.navigateTo({ url: "/pages/action-plan/index" });
  }
});
