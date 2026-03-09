const { request, showError } = require("../../utils/api");
const { formatDate } = require("../../utils/format");

Page({
  data: {
    form: {
      content: ""
    },
    faqItems: [],
    templates: [],
    threads: [],
    proactiveGuidance: [],
    includeSampleImage: false
  },

  onShow() {
    this.loadData();
  },

  onInputChange(event) {
    this.setData({ "form.content": event.detail.value });
  },

  toggleSampleImage() {
    this.setData({ includeSampleImage: !this.data.includeSampleImage });
  },

  async loadData() {
    try {
      const payload = await request({ url: "/consultations/overview" });
      this.setData({
        faqItems: payload.faqItems || [],
        templates: payload.templates || [],
        threads: (payload.threads || []).map((thread) => ({
          ...thread,
          createdAtLabel: formatDate(thread.createdAt),
          replyAtLabel: formatDate(thread.replyAt)
        })),
        proactiveGuidance: payload.proactiveGuidance || []
      });
    } catch (error) {
      showError(error);
    }
  },

  applyTemplate(event) {
    const { content } = event.currentTarget.dataset;
    this.setData({ "form.content": content });
  },

  async submitConsultation() {
    if (!this.data.form.content.trim()) {
      wx.showToast({ title: "请先输入咨询内容", icon: "none" });
      return;
    }
    try {
      await request({
        url: "/consultations",
        method: "POST",
        data: {
          content: this.data.form.content,
          attachment: this.data.includeSampleImage ? "sample-rash-photo.png" : null
        }
      });
      wx.showToast({ title: "咨询已发出", icon: "success" });
      this.setData({
        form: { content: "" },
        includeSampleImage: false
      });
      this.loadData();
    } catch (error) {
      showError(error);
    }
  }
});
