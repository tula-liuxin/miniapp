const { request, showError } = require("../../utils/api");

Page({
  data: {
    profile: null,
    summary: null
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const [profile, summary] = await Promise.all([
        request({ url: "/patient/profile" }),
        request({ url: "/records/summary" })
      ]);
      this.setData({ profile, summary });
    } catch (error) {
      showError(error);
    }
  },

  openPage(event) {
    const { url } = event.currentTarget.dataset;
    wx.navigateTo({ url });
  },

  async exportRecords() {
    try {
      await request({ url: "/exports", method: "POST", data: { type: "records-summary" } });
      wx.showToast({ title: "导出任务已生成", icon: "success" });
    } catch (error) {
      showError(error);
    }
  },

  async triggerEmergency() {
    try {
      await request({ url: "/emergency-help", method: "POST", data: { source: "profile" } });
      wx.showToast({ title: "已发出紧急求助", icon: "success" });
    } catch (error) {
      showError(error);
    }
  }
});
