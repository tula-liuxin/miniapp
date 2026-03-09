const { request, showError } = require("../../utils/api");

Page({
  data: {
    postId: "",
    form: {
      title: "",
      content: "",
      tags: "康复,经验"
    }
  },

  onLoad(options) {
    if (options.id) {
      this.postId = options.id;
      this.loadPost();
    }
  },

  onFieldChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  async loadPost() {
    try {
      const post = await request({ url: `/plaza/posts/${this.postId}` });
      this.setData({
        postId: this.postId,
        form: {
          title: post.title,
          content: post.content,
          tags: (post.tags || []).join(",")
        }
      });
    } catch (error) {
      showError(error);
    }
  },

  async savePost() {
    const payload = {
      title: this.data.form.title,
      content: this.data.form.content,
      tags: this.data.form.tags.split(",").map((item) => item.trim()).filter(Boolean)
    };
    if (!payload.title || !payload.content) {
      wx.showToast({ title: "标题和正文不能为空", icon: "none" });
      return;
    }
    try {
      if (this.postId) {
        await request({ url: `/plaza/posts/${this.postId}`, method: "PATCH", data: payload });
      } else {
        await request({ url: "/plaza/posts", method: "POST", data: payload });
      }
      wx.showToast({ title: "已提交", icon: "success" });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (error) {
      showError(error);
    }
  }
});
