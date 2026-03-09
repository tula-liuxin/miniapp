import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const selectorFixturePath = path.resolve(rootDir, "tests", "fixtures", "miniprogram-selectors.json");
const defaultCliPath =
  "C:\\Program Files (x86)\\Tencent\\\u5fae\u4fe1web\u5f00\u53d1\u8005\u5de5\u5177\\cli.bat";
const asciiProjectPath = "E:\\miniapp_smoke";

export const env = {
  baseURL: process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100",
  resetPath: process.env.SMOKE_RESET_PATH ?? "/api/test/reset",
  diagnosticsPath: process.env.SMOKE_DIAGNOSTICS_PATH ?? "/api/test/diagnostics",
  cliPath: process.env.WECHAT_CLI_PATH ?? defaultCliPath,
  projectPath:
    process.env.MINIPROGRAM_PROJECT_PATH ??
    (existsSync(asciiProjectPath) ? asciiProjectPath : rootDir),
  strict: process.env.MINIPROGRAM_STRICT === "1"
};

export const fixture = JSON.parse(readFileSync(selectorFixturePath, "utf8"));

export function ensureExecutablePath() {
  if (!env.cliPath || !existsSync(env.cliPath)) {
    const message = `WeChat DevTools CLI not found. Current value: ${env.cliPath || "<empty>"}`;
    if (env.strict) {
      throw new Error(message);
    }

    console.warn(`[miniprogram-smoke] ${message}`);
    console.warn("[miniprogram-smoke] Skipping native smoke because MINIPROGRAM_STRICT is not set.");
    return false;
  }

  return true;
}

export async function resetServer() {
  const methods = ["POST", "DELETE", "PUT"];

  for (const method of methods) {
    const response = await fetch(new URL(env.resetPath, env.baseURL), { method });

    if (response.ok) {
      return;
    }

    if (response.status === 404 || response.status === 405) {
      continue;
    }

    throw new Error(`Reset endpoint returned ${response.status} for ${method} ${env.resetPath}`);
  }

  throw new Error(`Could not reset mock server via ${env.resetPath}`);
}

export async function fetchDiagnostics() {
  const response = await fetch(new URL(env.diagnosticsPath, env.baseURL));
  if (!response.ok) {
    throw new Error(`Diagnostics endpoint returned ${response.status} for GET ${env.diagnosticsPath}`);
  }

  return response.json();
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeDiagnostics(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const data = root.data && typeof root.data === "object" ? root.data : {};
  const collections =
    root.collections && typeof root.collections === "object"
      ? root.collections
      : root.events && typeof root.events === "object"
        ? root.events
        : data.collections && typeof data.collections === "object"
          ? data.collections
          : data.events && typeof data.events === "object"
            ? data.events
            : {};
  const source =
    Object.keys(collections).length > 0
      ? collections
      : Object.keys(data).length > 0
        ? data
        : root;

  return {
    alerts: asArray(firstDefined(source.alerts, source.alertEvents, source.symptomAlerts)),
    reminders: asArray(firstDefined(source.reminders, source.reminderEvents)),
    exports: asArray(firstDefined(source.exports, source.exportJobs, source.exportEvents)),
    emergencies: asArray(firstDefined(source.emergencies, source.emergencyCalls, source.emergencyEvents)),
    audits: asArray(firstDefined(source.audits, source.auditEvents, source.reviewQueue, source.postsPendingReview))
  };
}

export async function pause(page, ms = 350) {
  if (typeof page.waitFor === "function") {
    await page.waitFor(ms);
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function queryElement(page, selector, description = selector) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Could not find ${description} with selector: ${selector}`);
  }

  return element;
}

export async function tap(page, selector, description = selector) {
  const element = await queryElement(page, selector, description);
  await element.tap();
  await pause(page);
}

export async function fillInput(page, selector, value, description = selector) {
  const element = await queryElement(page, selector, description);

  if (typeof element.input === "function") {
    await element.input(String(value));
  } else if (typeof element.trigger === "function") {
    await element.trigger("input", { detail: { value: String(value) } });
    await element.trigger("blur");
  } else {
    throw new Error(`Element ${description} does not support input or trigger`);
  }

  await pause(page);
}

export function expectCollectionLength(payload, key, min) {
  const normalized = normalizeDiagnostics(payload);
  const collection = normalized[key];
  if (!Array.isArray(collection) || collection.length < min) {
    throw new Error(`Expected diagnostics collection "${key}" to have at least ${min} item(s).`);
  }
}
