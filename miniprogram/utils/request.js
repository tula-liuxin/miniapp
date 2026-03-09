const config = require("../config");

function getGlobalData() {
  try {
    const app = getApp();
    return (app && app.globalData) || {};
  } catch (_error) {
    return {};
  }
}

function getBackendMode() {
  return getGlobalData().backendMode || config.backendMode || "local";
}

function getBaseUrl() {
  const globalData = getGlobalData();
  return globalData.apiBaseUrl || config.apiBaseUrl;
}

function getCloudFunctionName() {
  const globalData = getGlobalData();
  return globalData.cloudFunctionName || config.cloudFunctionName || "api";
}

function requestViaHttp(options) {
  const { url, method = "GET", data, timeout = 15000 } = options;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${url}`,
      method,
      data,
      timeout,
      header: {
        "content-type": "application/json"
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(res.data || new Error(`Request failed with status ${res.statusCode}`));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function requestViaCloud(options) {
  const { url, method = "GET", data } = options;

  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error("Cloud API is not available in the current runtime"));
      return;
    }

    wx.cloud.callFunction({
      name: getCloudFunctionName(),
      data: {
        path: url,
        method,
        data
      },
      success(res) {
        const payload = res.result || {};
        const statusCode = Number(payload.statusCode || 500);
        if (statusCode >= 200 && statusCode < 300) {
          resolve(payload.data);
          return;
        }
        reject(payload.data || new Error(payload.message || `Cloud request failed with status ${statusCode}`));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function request(options) {
  if (getBackendMode() === "cloud") {
    return requestViaCloud(options);
  }
  return requestViaHttp(options);
}

module.exports = {
  request,
  getBaseUrl,
  getBackendMode
};
