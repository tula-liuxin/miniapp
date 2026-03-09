const { request, showError } = require("../../utils/api");

const PRESET_TIMES = ["08:00", "12:00", "19:30", "21:00"];

Page({
  data: {
    reminderSettings: [],
    presetTimes: PRESET_TIMES
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

  onTimePick(event) {
    const { index } = event.currentTarget.dataset;
    this.setData({ [`reminderSettings[${index}].time`]: event.detail.value });
  },

  applyPresetTime(event) {
    const { index, time } = event.currentTarget.dataset;
    this.setData({ [`reminderSettings[${index}].time`]: time });
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
