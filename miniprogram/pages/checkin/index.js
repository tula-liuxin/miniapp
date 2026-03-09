const { request, showError } = require("../../utils/api");

Page({
  data: {
    form: {
      temperature: "36.8",
      bloodPressure: "118/76",
      weight: "58.5",
      symptomChange: "",
      diet: "",
      exerciseMinutes: "20",
      medication: "已按时服药",
      mood: "平稳"
    },
    latestCheckin: null
  },

  onShow() {
    this.loadLatest();
  },

  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  async loadLatest() {
    try {
      const payload = await request({ url: "/checkins/latest" });
      this.setData({ latestCheckin: payload.latestCheckin || null });
    } catch (error) {
      showError(error);
    }
  },

  async submitCheckin() {
    try {
      await request({ url: "/checkins", method: "POST", data: this.data.form });
      wx.showToast({ title: "打卡已保存", icon: "success" });
      this.loadLatest();
    } catch (error) {
      showError(error);
    }
  },

  openWeeklyReport() {
    wx.navigateTo({ url: "/pages/weekly-report/index" });
  }
});
