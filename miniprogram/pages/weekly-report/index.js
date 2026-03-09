const { request, showError } = require("../../utils/api");

Page({
  data: {
    report: null
  },

  onShow() {
    this.loadReport();
  },

  async loadReport() {
    try {
      const report = await request({ url: "/reports/weekly" });
      this.setData({ report });
    } catch (error) {
      showError(error);
    }
  },

  async exportReport() {
    try {
      await request({ url: "/exports", method: "POST", data: { type: "weekly-report" } });
      wx.showToast({ title: "已生成导出任务", icon: "success" });
    } catch (error) {
      showError(error);
    }
  }
});
