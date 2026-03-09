const { request, showError } = require("../../utils/api");
const { formatDate } = require("../../utils/format");

function decoratePost(post) {
  return {
    ...post,
    likedByMe: Boolean(post.likedByMe),
    favoritedByMe: Boolean(post.favoritedByMe),
    createdAtLabel: formatDate(post.createdAt),
    comments: (post.comments || []).map((comment) => ({
      ...comment,
      createdAtLabel: formatDate(comment.createdAt)
    }))
  };
}

function showConfirm(options) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      ...options,
      success: resolve,
      fail: reject
    });
  });
}

Page({
  data: {
    recommendedPosts: [],
    posts: [],
    commentDrafts: {},
    busyActions: {}
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const payload = await request({ url: "/plaza/overview" });
      this.setData({
        recommendedPosts: payload.recommendedPosts || [],
        posts: (payload.posts || []).map(decoratePost)
      });
    } catch (error) {
      showError(error);
    }
  },

  openComposer() {
    wx.navigateTo({ url: "/pages/post-editor/index" });
  },

  editPost(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/post-editor/index?id=${id}` });
  },

  setBusy(key, value) {
    this.setData({ [`busyActions.${key}`]: value });
  },

  isBusy(key) {
    return Boolean(this.data.busyActions[key]);
  },

  async deletePost(event) {
    const { id } = event.currentTarget.dataset;
    const key = `delete-${id}`;
    if (this.isBusy(key)) {
      return;
    }

    const { confirm } = await showConfirm({
      title: "删除这条分享？",
      content: "删除后将无法恢复，评论也会一起移除。",
      confirmColor: "#c95f3a"
    });

    if (!confirm) {
      return;
    }

    this.setBusy(key, true);
    try {
      await request({ url: `/plaza/posts/${id}`, method: "DELETE" });
      wx.showToast({ title: "已删除", icon: "success" });
      this.loadData();
    } catch (error) {
      showError(error);
    } finally {
      this.setBusy(key, false);
    }
  },

  async likePost(event) {
    const { id } = event.currentTarget.dataset;
    const key = `like-${id}`;
    if (this.isBusy(key)) {
      return;
    }

    this.setBusy(key, true);
    try {
      const updated = await request({ url: `/plaza/posts/${id}/like`, method: "POST" });
      this.updatePost(updated);
    } catch (error) {
      showError(error);
    } finally {
      this.setBusy(key, false);
    }
  },

  async favoritePost(event) {
    const { id } = event.currentTarget.dataset;
    const key = `favorite-${id}`;
    if (this.isBusy(key)) {
      return;
    }

    this.setBusy(key, true);
    try {
      const updated = await request({ url: `/plaza/posts/${id}/favorite`, method: "POST" });
      this.updatePost(updated);
    } catch (error) {
      showError(error);
    } finally {
      this.setBusy(key, false);
    }
  },

  updatePost(post) {
    const nextPost = decoratePost(post);
    const posts = this.data.posts.map((item) => (item.id === nextPost.id ? nextPost : item));
    const recommendedPosts = this.data.recommendedPosts.map((item) =>
      item.id === nextPost.id ? { ...item, excerpt: nextPost.excerpt, title: nextPost.title } : item
    );
    this.setData({ posts, recommendedPosts });
  },

  onCommentInput(event) {
    const { id } = event.currentTarget.dataset;
    this.setData({ [`commentDrafts.${id}`]: event.detail.value });
  },

  async submitComment(event) {
    const { id } = event.currentTarget.dataset;
    const content = (this.data.commentDrafts[id] || "").trim();
    const key = `comment-${id}`;

    if (!content) {
      wx.showToast({ title: "先写一点内容再发送", icon: "none" });
      return;
    }

    if (this.isBusy(key)) {
      return;
    }

    this.setBusy(key, true);
    try {
      await request({ url: `/plaza/posts/${id}/comments`, method: "POST", data: { content } });
      this.setData({ [`commentDrafts.${id}`]: "" });
      wx.showToast({ title: "评论已发表", icon: "success" });
      this.loadData();
    } catch (error) {
      showError(error);
    } finally {
      this.setBusy(key, false);
    }
  }
});
