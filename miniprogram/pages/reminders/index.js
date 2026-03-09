const { request, showError } = require("../../utils/api");

Page({
  data: {
    reminderSettings: []
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const payload = await request({ url: "/reminders" });
      this.setData({ reminderSettings: payload.reminderSettings || [] });
    } catch (error) {
      showError(error);
    }
  },

  onSwitchChange(event) {
    const { index } = event.currentTarget.dataset;
    this.setData({ [`reminderSettings[${index}].enabled`]: event.detail.value });
  },

  onTimeChange(event) {
    const { index } = event.currentTarget.dataset;
    this.setData({ [`reminderSettings[${index}].time`]: event.detail.value });
  },

  async saveSettings() {
    try {
      await request({ url: "/reminders", method: "PUT", data: { reminderSettings: this.data.reminderSettings } });
      wx.showToast({ title: "提醒已保存", icon: "success" });
    } catch (error) {
      showError(error);
    }
  }
});
