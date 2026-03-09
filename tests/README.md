# Smoke Test Layer

This folder contains the end-to-end smoke automation split into two tracks:

- `tests/playwright/`: browser-side smoke for the diagnostic dashboard and mock API side effects
- `tests/miniprogram/`: native mini program smoke scaffold driven by `miniprogram-automator`

## Environment variables

Common:

- `SMOKE_BASE_URL`: mock server base URL. Default `http://127.0.0.1:3100`
- `SMOKE_HEALTH_PATH`: health endpoint for readiness checks. Default `/health`
- `SMOKE_RESET_PATH`: reset endpoint for test data. Default `/api/test/reset`
- `SMOKE_DIAGNOSTICS_PATH`: diagnostics JSON endpoint. Default `/api/test/diagnostics`
- `SMOKE_DASHBOARD_PATH`: diagnostics dashboard page. Default `/dashboard`
- `SMOKE_STARTUP_TIMEOUT`: readiness timeout in milliseconds. Default `60000`
- `SMOKE_SERVER_COMMAND`: optional command Playwright should run before tests

Dashboard label overrides:

- `SMOKE_DASHBOARD_TITLE`: dashboard heading text. Default `系统诊断看板`
- `SMOKE_ALERTS_SECTION`: default `告警事件`
- `SMOKE_REMINDERS_SECTION`: default `提醒事件`
- `SMOKE_EXPORTS_SECTION`: default `导出记录`
- `SMOKE_EMERGENCIES_SECTION`: default `紧急求助`
- `SMOKE_AUDITS_SECTION`: default `审核队列`

Mini program:

- `WECHAT_CLI_PATH`: absolute path to the WeChat DevTools CLI executable
- `MINIPROGRAM_PROJECT_PATH`: absolute path to the mini program project root. Default current workspace
- `MINIPROGRAM_STRICT`: set to `1` to fail instead of skipping when DevTools CLI is unavailable

## Expected server contract

The Playwright tests assume:

- `POST/DELETE/PUT` on `SMOKE_RESET_PATH` resets the mock server to a known baseline
- `GET` on `SMOKE_DIAGNOSTICS_PATH` returns a JSON document containing alert/reminder/export/emergency/audit collections
- `GET` on `SMOKE_DASHBOARD_PATH` renders a human-readable dashboard backed by the diagnostics data

The diagnostics payload is normalized leniently. Any of the following keys are accepted:

- Alerts: `alerts`, `alertEvents`, `symptomAlerts`
- Reminders: `reminders`, `reminderEvents`
- Exports: `exports`, `exportJobs`, `exportEvents`
- Emergencies: `emergencies`, `emergencyCalls`, `emergencyEvents`
- Audits: `audits`, `auditEvents`, `reviewQueue`, `postsPendingReview`

## Expected mini program selectors

The scaffold uses routes plus stable selectors defined in `tests/fixtures/miniprogram-selectors.json`.
Prefer `id` selectors or other stable selectors that `miniprogram-automator` can query reliably.

## Suggested commands

Once dependencies and the app/server are wired:

```bash
npx playwright test
node tests/miniprogram/smoke.mjs
```
