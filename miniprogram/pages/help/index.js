const { request, showError } = require("../../utils/api");

Page({
  data: {
    guideSections: [],
    hotline: "",
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
        hotline: payload.hotline || ""
      });
    } catch (error) {
      showError(error);
    }
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
