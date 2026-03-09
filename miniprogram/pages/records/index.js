const { request, showError } = require("../../utils/api");
const { formatDate } = require("../../utils/format");

Page({
  data: {
    summary: null
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const summary = await request({ url: "/records/summary" });
      this.setData({
        summary: {
          ...summary,
          recentAssessments: (summary.recentAssessments || []).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) })),
          recentCheckins: (summary.recentCheckins || []).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) })),
          recentConsultations: (summary.recentConsultations || []).map((item) => ({ ...item, createdAtLabel: formatDate(item.createdAt) })),
          learningRecords: summary.learningRecords || []
        }
      });
    } catch (error) {
      showError(error);
    }
  }
});
