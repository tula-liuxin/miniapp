const { request, showError } = require("../../utils/api");
const { formatDate } = require("../../utils/format");

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
    latestAssessment: null,
    trends: [],
    alerts: [],
    guidance: []
  },

  onShow() {
    this.loadOverview();
  },

  onSliderChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: Number(event.detail.value) });
  },

  onInputChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
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
