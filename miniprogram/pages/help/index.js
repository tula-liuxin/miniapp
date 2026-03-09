const { request, showError } = require("../../utils/api");

Page({
  data: {
    guideSections: [],
    hotline: "",
    hotlineLabel: "专科热线",
    hotlineNumber: "",
    hotlineDisplayText: "",
    emergencySteps: [],
    feedback: ""
  },

  onShow() {
    this.loadData();
  },

  onFeedbackChange(event) {
    this.setData({ feedback: event.detail.value });
  },

  async loadData() {
    try {
      const payload = await request({ url: "/help/content" });
      this.setData({
        guideSections: payload.guideSections || [],
        hotline: payload.hotline || "",
        hotlineLabel: payload.hotlineLabel || "专科热线",
        hotlineNumber: payload.hotlineNumber || "",
        hotlineDisplayText: payload.hotline || payload.hotlineNumber || "",
        emergencySteps: payload.emergencySteps || []
      });
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
      fail: () => wx.showToast({ title: "当前环境无法直接拨号", icon: "none" })
    });
  },

  async submitFeedback() {
    if (!this.data.feedback.trim()) {
      wx.showToast({ title: "请先填写反馈内容", icon: "none" });
      return;
    }
    try {
      await request({ url: "/feedback", method: "POST", data: { content: this.data.feedback } });
      wx.showToast({ title: "感谢反馈", icon: "success" });
      this.setData({ feedback: "" });
    } catch (error) {
      showError(error);
    }
  }
});
