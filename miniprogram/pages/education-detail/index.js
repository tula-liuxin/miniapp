const { request, showError } = require("../../utils/api");

Page({
  data: {
    item: null
  },

  onLoad(options) {
    this.educationId = options.id;
    this.loadData();
  },

  async loadData() {
    try {
      const item = await request({ url: `/education/${this.educationId}` });
      wx.setNavigationBarTitle({ title: item.title });
      this.setData({ item });
    } catch (error) {
      showError(error);
    }
  },

  async toggleFavorite() {
    try {
      await request({ url: `/education/${this.educationId}/favorite`, method: "POST" });
      this.loadData();
    } catch (error) {
      showError(error);
    }
  },

  openPage(event) {
    const { url } = event.currentTarget.dataset;
    wx.navigateTo({ url });
  }
});
