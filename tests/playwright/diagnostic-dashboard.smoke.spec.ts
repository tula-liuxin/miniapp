import { expect, test } from "@playwright/test";
import { createApiContext, fetchDiagnostics, resetServer } from "./helpers/api";
import { smokeConfig } from "./helpers/config";

test.describe("diagnostic dashboard smoke", () => {
  test.beforeEach(async () => {
    const api = await createApiContext();
    try {
      await resetServer(api);
    } finally {
      await api.dispose();
    }
  });

  test("renders dashboard shell and required sections", async ({ page }) => {
    await page.goto(smokeConfig.dashboardPath);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.title);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.alerts);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.reminders);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.exports);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.emergencies);
    await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.audits);
  });

  test("captures alert, reminder, export, emergency and audit side effects", async ({ page }) => {
    const api = await createApiContext();
    try {
      await resetServer(api);
      await api.post("/api/symptoms/assessments", {
        data: {
          painNrs: 8,
          nausea: 6,
          diarrheaCount: 3,
          dermatitis: 5,
          marrowSuppression: 6,
          fatigue: 7,
          note: "playwright high risk smoke"
        }
      });
      await api.post("/api/action-plans", {
        data: {
          trigger: "When fatigue reaches 5",
          response: "Take a 15 minute interval walk and hydrate",
          reminderTime: "20:00"
        }
      });
      await api.post("/api/consultations", {
        data: {
          content: "I had diarrhea three times today and feel significantly fatigued.",
          attachment: "sample-rash-photo.png"
        }
      });
      await api.post("/api/plaza/posts", {
        data: {
          title: "Playwright moderation post",
          content: "A short experience note for moderation queue validation.",
          tags: ["smoke", "recovery"]
        }
      });
      await api.post("/api/exports", { data: { type: "weekly-report" } });
      await api.post("/api/emergency-help", { data: { source: "playwright" } });

      const diagnostics = await fetchDiagnostics(api);
      expect(diagnostics.alerts.length).toBeGreaterThan(0);
      expect(diagnostics.reminders.length).toBeGreaterThan(0);
      expect(diagnostics.exports.length).toBeGreaterThan(0);
      expect(diagnostics.emergencies.length).toBeGreaterThan(0);
      expect(diagnostics.audits.length).toBeGreaterThan(1);

      await page.goto(smokeConfig.dashboardPath);
      await expect(page.locator("body")).toContainText(smokeConfig.dashboardLabels.title);
      await expect(page.locator("body")).toContainText("Playwright moderation post");
      await expect(page.locator("body")).toContainText("I had diarrhea three times today");
    } finally {
      await api.dispose();
    }
  });
});
