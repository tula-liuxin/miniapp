const { request, showError } = require("../../utils/api");
const { formatDate, pick } = require("../../utils/format");

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
      this.setData({
        loading: false,
        summary: payload.summary,
        educationFeed: pick(payload.educationFeed),
        actionPlanHighlights: pick(payload.actionPlanHighlights),
        mindfulnessCourses: pick(payload.mindfulnessCourses),
        recommendedPosts: pick(payload.recommendedPosts),
        alerts: pick(payload.alerts).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) }))
      });
    } catch (error) {
      this.setData({ loading: false });
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
