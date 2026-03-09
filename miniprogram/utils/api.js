const { request } = require("./request");

function showError(error) {
  const fallback = "服务请求失败，请稍后再试";
  const source =
    (error && (error.message || error.msg || error.error || error.errMsg)) || fallback;
  const message = String(source).slice(0, 20);

  wx.showToast({
    title: message || fallback,
    icon: "none",
    duration: 2200
  });
}

module.exports = {
  request,
  showError
};
