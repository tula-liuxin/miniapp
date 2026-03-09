import { type AppState, riskLabelMap } from "../../shared/domain";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderDashboard(state: AppState) {
  const latestAssessment = state.symptomAssessments[0];
  const pendingPosts = state.plazaPosts.filter((post) => post.status === "pending");
  const cards = [
    { label: "告警事件", value: String(state.diagnostics.alertEvents.length) },
    { label: "提醒事件", value: String(state.diagnostics.timeline.filter((item) => item.type === "reminder").length) },
    { label: "导出记录", value: String(state.diagnostics.exports.length) },
    { label: "紧急求助", value: String(state.diagnostics.emergencies.length) }
  ];

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>宫颈关护诊断看板</title>
    <style>
      body { margin: 0; padding: 24px; background: linear-gradient(180deg, #f8f5ef, #fffdf9); color: #2e2622; font-family: "Segoe UI", "PingFang SC", sans-serif; }
      .hero, .card, .event { background: rgba(255,253,248,0.96); border: 1px solid rgba(181,82,61,0.12); border-radius: 18px; box-shadow: 0 12px 36px rgba(93,56,43,0.08); }
      .hero { padding: 24px; background: linear-gradient(135deg, rgba(186,93,70,0.96), rgba(233,174,127,0.92)); color: #fffaf5; }
      .hero h1 { margin: 0; font-size: 28px; }
      .hero p { margin: 10px 0 0; line-height: 1.6; opacity: 0.92; }
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
      .card { padding: 18px; }
      .card .value { margin-top: 12px; font-size: 28px; font-weight: 700; color: #b5523d; }
      section { margin-top: 22px; }
      h2 { margin: 0 0 12px; font-size: 20px; }
      .event { padding: 16px; margin-bottom: 12px; }
      .meta { display: flex; justify-content: space-between; gap: 12px; color: #7d6f67; font-size: 14px; }
      .title { margin-top: 8px; font-weight: 600; }
      .detail { margin-top: 8px; line-height: 1.65; color: #5f554e; }
      table { width: 100%; border-collapse: collapse; background: rgba(255,253,248,0.96); border-radius: 18px; overflow: hidden; }
      th, td { padding: 14px 16px; border-bottom: 1px solid rgba(181,82,61,0.1); text-align: left; }
      th { background: rgba(245,237,230,0.8); }
      .pill { display: inline-flex; padding: 4px 10px; border-radius: 999px; background: rgba(181,82,61,0.12); color: #a24c37; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="hero">
      <h1 data-testid="dashboard-title">宫颈关护诊断看板</h1>
      <p>用于 Playwright 与端到端 smoke 观察真实副作用。最近一次症状风险：<strong data-testid="latest-risk">${latestAssessment ? riskLabelMap[latestAssessment.riskLevel] : "暂无"}</strong></p>
    </div>

    <div class="grid">
      ${cards
        .map(
          (card) => `
        <div class="card" data-testid="card-${card.label.toLowerCase().replaceAll(" ", "-")}">
          <div>${escapeHtml(card.label)}</div>
          <div class="value">${escapeHtml(card.value)}</div>
        </div>`
        )
        .join("")}
    </div>

    <section>
      <h2>提醒与告警事件</h2>
      <div data-testid="timeline-list">
        ${state.diagnostics.timeline
          .slice(0, 8)
          .map(
            (event) => `
          <div class="event">
            <div class="meta"><span class="pill">${escapeHtml(event.type)}</span><span>${escapeHtml(event.createdAt)}</span></div>
            <div class="title">${escapeHtml(event.title)}</div>
            <div class="detail">${escapeHtml(event.detail)}</div>
          </div>`
          )
          .join("")}
      </div>
    </section>

    <section>
      <h2>审核队列</h2>
      <table data-testid="moderation-table">
        <thead><tr><th>标题</th><th>状态</th><th>作者</th></tr></thead>
        <tbody>
          ${
            pendingPosts.length
              ? pendingPosts
                  .map(
                    (post) => `<tr><td>${escapeHtml(post.title)}</td><td>${escapeHtml(post.statusLabel)}</td><td>${escapeHtml(post.authorName)}</td></tr>`
                  )
                  .join("")
              : "<tr><td colspan='3'>当前没有待审核内容</td></tr>"
          }
        </tbody>
      </table>
    </section>
  </body>
</html>`;
}
