import { expect, request, type APIRequestContext } from '@playwright/test';
import { smokeConfig, type DiagnosticsCollections } from './config';

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  return values.find((value) => value !== undefined);
}

function pickRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: smokeConfig.baseURL,
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  });
}

export async function waitForServer(api: APIRequestContext): Promise<void> {
  const deadline = Date.now() + smokeConfig.startupTimeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await api.get(smokeConfig.healthPath);
      if (response.ok()) {
        return;
      }

      lastError = new Error(`Health endpoint responded with ${response.status()}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(
    `Mock server did not become ready at ${smokeConfig.baseURL}${smokeConfig.healthPath} within ${smokeConfig.startupTimeout}ms. Last error: ${String(lastError)}`,
  );
}

export async function resetServer(api: APIRequestContext): Promise<void> {
  const methods: Array<'post' | 'delete' | 'put'> = ['post', 'delete', 'put'];
  let lastStatus: number | undefined;

  for (const method of methods) {
    const response = await api[method](smokeConfig.resetPath, {
      failOnStatusCode: false,
    });

    if (response.ok()) {
      return;
    }

    lastStatus = response.status();

    if (response.status() === 404 || response.status() === 405) {
      continue;
    }

    throw new Error(
      `Reset endpoint ${smokeConfig.resetPath} responded with ${response.status()} using ${method.toUpperCase()}`,
    );
  }

  throw new Error(
    `Unable to reset server state via ${smokeConfig.resetPath}. Last HTTP status: ${lastStatus ?? 'unknown'}`,
  );
}

export async function fetchDiagnostics(api: APIRequestContext): Promise<DiagnosticsCollections> {
  const response = await api.get(smokeConfig.diagnosticsPath, {
    failOnStatusCode: false,
  });

  expect(
    response.ok(),
    `Diagnostics endpoint ${smokeConfig.diagnosticsPath} should respond successfully`,
  ).toBeTruthy();

  const payload = await response.json();
  const root = pickRecord(payload);
  const data = pickRecord(firstDefined(root.data, root.payload));
  const collections = pickRecord(firstDefined(root.collections, root.events, data.collections, data.events));
  const source = Object.keys(collections).length > 0 ? collections : Object.keys(data).length > 0 ? data : root;

  return {
    alerts: asArray(firstDefined(source.alerts, source.alertEvents, source.symptomAlerts)),
    reminders: asArray(firstDefined(source.reminders, source.reminderEvents)),
    exports: asArray(firstDefined(source.exports, source.exportJobs, source.exportEvents)),
    emergencies: asArray(firstDefined(source.emergencies, source.emergencyCalls, source.emergencyEvents)),
    audits: asArray(firstDefined(source.audits, source.auditEvents, source.reviewQueue, source.postsPendingReview)),
    raw: payload,
  };
}
