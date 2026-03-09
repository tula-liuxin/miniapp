const config = require("./config");

App({
  globalData: {
    backendMode: config.backendMode,
    apiBase: config.apiBaseUrl,
    apiBaseUrl: config.apiBaseUrl,
    cloudEnvId: config.cloudEnvId,
    cloudFunctionName: config.cloudFunctionName,
    appName: config.appName,
    patientId: "patient-001"
  },
  onLaunch() {
    if (config.backendMode === "cloud" && wx.cloud) {
      wx.cloud.init({
        env: config.cloudEnvId || wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      });
    }

    const savedApiBaseUrl = wx.getStorageSync("apiBaseUrl");
    if (config.backendMode === "local" && savedApiBaseUrl) {
      this.globalData.apiBase = savedApiBaseUrl;
      this.globalData.apiBaseUrl = savedApiBaseUrl;
    }
    const history = wx.getStorageSync("recent-pages") || [];
    wx.setStorageSync("recent-pages", history);
    wx.setStorageSync("appName", config.appName);
  }
});
