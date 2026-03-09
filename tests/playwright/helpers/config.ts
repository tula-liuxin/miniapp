export const smokeConfig = {
  baseURL: process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100",
  healthPath: process.env.SMOKE_HEALTH_PATH ?? "/health",
  resetPath: process.env.SMOKE_RESET_PATH ?? "/api/test/reset",
  diagnosticsPath: process.env.SMOKE_DIAGNOSTICS_PATH ?? "/api/test/diagnostics",
  dashboardPath: process.env.SMOKE_DASHBOARD_PATH ?? "/dashboard",
  startupTimeout: Number.parseInt(process.env.SMOKE_STARTUP_TIMEOUT ?? "60000", 10),
  dashboardLabels: {
    title: process.env.SMOKE_DASHBOARD_TITLE ?? "系统诊断看板",
    alerts: process.env.SMOKE_ALERTS_SECTION ?? "告警事件",
    reminders: process.env.SMOKE_REMINDERS_SECTION ?? "提醒事件",
    exports: process.env.SMOKE_EXPORTS_SECTION ?? "导出记录",
    emergencies: process.env.SMOKE_EMERGENCIES_SECTION ?? "紧急求助",
    audits: process.env.SMOKE_AUDITS_SECTION ?? "审核队列"
  }
};

export type DiagnosticsCollections = {
  alerts: unknown[];
  reminders: unknown[];
  exports: unknown[];
  emergencies: unknown[];
  audits: unknown[];
  raw: unknown;
};
