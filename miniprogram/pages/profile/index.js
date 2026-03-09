const { request, showError } = require("../../utils/api");

function extractPhone(value) {
  const match = String(value || "").match(/(\d[\d-]{7,}\d)/);
  return match ? match[1].replace(/-/g, "") : "";
}

Page({
  data: {
    profile: null,
    summary: null,
    hotlineLabel: "专科热线",
    hotlineNumber: "",
    hotlineDisplayText: "热线号码将在帮助页显示",
    emergencySteps: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const [profile, summary, help] = await Promise.all([
        request({ url: "/patient/profile" }),
        request({ url: "/records/summary" }),
        request({ url: "/help/content" }).catch(() => ({}))
      ]);
      const hotlineNumber = help.hotlineNumber || extractPhone(help.hotline);
      this.setData({
        profile,
        summary,
        hotlineLabel: help.hotlineLabel || "专科热线",
        hotlineNumber,
        hotlineDisplayText: hotlineNumber || "热线号码将在帮助页显示",
        emergencySteps: help.emergencySteps || []
      });
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
  },

  callHotline() {
    if (!this.data.hotlineNumber) {
      wx.showToast({ title: "暂未配置热线号码", icon: "none" });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: this.data.hotlineNumber,
      fail: () => {
        wx.showToast({ title: "当前环境无法直接拨号", icon: "none" });
      }
    });
  }
});
