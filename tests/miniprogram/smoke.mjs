import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  ensureExecutablePath,
  env,
  expectCollectionLength,
  fetchDiagnostics,
  fixture,
  fillInput,
  pause,
  queryElement,
  resetServer,
  tap
} from "./helpers.mjs";

const require = createRequire(import.meta.url);

async function launchMiniProgram() {
  const automatorModule = require("miniprogram-automator");
  const automator = automatorModule.default ?? automatorModule;
  const port = 9420;

  try {
    const miniProgram = await automator.launch({
      cliPath: env.cliPath,
      projectPath: env.projectPath,
      port,
      trustProject: true
    });
    return { miniProgram };
  } catch (launchError) {
    console.warn("[miniprogram-smoke] automator.launch failed, falling back to CLI auto + connect.");
    console.warn(launchError);

    const cliProcess = spawn(
      "cmd.exe",
      ["/c", env.cliPath, "auto", "--project", env.projectPath, "--auto-port", String(port), "--debug"],
      {
        stdio: "ignore",
        detached: true
      }
    );
    cliProcess.unref();

    let lastError = launchError;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const miniProgram = await automator.connect({
          wsEndpoint: `ws://127.0.0.1:${port}`
        });
        return { miniProgram };
      } catch (connectError) {
        lastError = connectError;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    throw lastError;
  }
}

async function openRoute(miniProgram, route, readySelector) {
  const page = await miniProgram.reLaunch(route);
  await pause(page, 800);
  await queryElement(page, readySelector, `page ready selector for ${route}`);
  return page;
}

async function run() {
  if (!ensureExecutablePath()) {
    return;
  }

  await resetServer();
  const { miniProgram } = await launchMiniProgram();

  try {
    await openRoute(miniProgram, fixture.routes.home, fixture.selectors.homeReady);

    const symptomsPage = await openRoute(miniProgram, fixture.routes.symptoms, fixture.selectors.symptomsReady);
    await fillInput(symptomsPage, fixture.selectors.symptomPainInput, 8, "pain NRS input");
    await fillInput(symptomsPage, fixture.selectors.symptomDiarrheaInput, 3, "diarrhea count input");
    await fillInput(symptomsPage, fixture.selectors.symptomFatigueInput, 6, "fatigue level input");
    await tap(symptomsPage, fixture.selectors.symptomSubmit, "symptom submit button");
    await queryElement(symptomsPage, fixture.selectors.symptomAlertBanner, "threshold alert banner");
    expectCollectionLength(await fetchDiagnostics(), "alerts", 1);

    const actionPlanPage = await openRoute(miniProgram, fixture.routes.actionPlan, fixture.selectors.actionPlanReady);
    await fillInput(actionPlanPage, fixture.selectors.actionPlanTitleInput, "Fatigue management plan", "action plan title");
    await fillInput(
      actionPlanPage,
      fixture.selectors.actionPlanStrategyInput,
      "Walk for 15 minutes in short intervals and drink warm water before reassessing symptoms.",
      "action plan strategy"
    );
    await tap(actionPlanPage, fixture.selectors.actionPlanSubmit, "save action plan button");
    expectCollectionLength(await fetchDiagnostics(), "reminders", 1);

    const consultPage = await openRoute(miniProgram, fixture.routes.consult, fixture.selectors.consultReady);
    await fillInput(
      consultPage,
      fixture.selectors.consultMessageInput,
      "I had diarrhea three times today with noticeable fatigue. Should I advance my follow-up visit?",
      "consult message input"
    );
    await tap(consultPage, fixture.selectors.consultAttachSampleImage, "attach sample image button");
    await tap(consultPage, fixture.selectors.consultSubmit, "submit consult button");
    expectCollectionLength(await fetchDiagnostics(), "audits", 1);

    const checkinPage = await openRoute(miniProgram, fixture.routes.checkin, fixture.selectors.checkinReady);
    await fillInput(checkinPage, fixture.selectors.checkinTemperatureInput, 37.2, "temperature input");
    await fillInput(checkinPage, fixture.selectors.checkinWeightInput, 56.8, "weight input");
    await fillInput(checkinPage, fixture.selectors.checkinExerciseInput, 20, "exercise input");
    await tap(checkinPage, fixture.selectors.checkinSubmit, "checkin submit button");
    expectCollectionLength(await fetchDiagnostics(), "reminders", 1);

    const plazaPage = await openRoute(miniProgram, fixture.routes.plaza, fixture.selectors.plazaReady);
    await tap(plazaPage, fixture.selectors.plazaCreateButton, "open post editor button");

    const postEditorPage = await openRoute(miniProgram, fixture.routes.postEditor, fixture.selectors.postEditorReady);
    await fillInput(postEditorPage, fixture.selectors.plazaPostTitleInput, "Recovery walk notes", "post title");
    await fillInput(
      postEditorPage,
      fixture.selectors.plazaPostContentInput,
      "I followed my action plan and completed a gentle 20 minute indoor walk. Fatigue felt slightly better afterwards.",
      "post content"
    );
    await tap(postEditorPage, fixture.selectors.plazaSubmitPost, "submit post button");
    expectCollectionLength(await fetchDiagnostics(), "audits", 2);

    const profilePage = await openRoute(miniProgram, fixture.routes.profile, fixture.selectors.profileReady);
    await tap(profilePage, fixture.selectors.profileExportButton, "export records button");
    expectCollectionLength(await fetchDiagnostics(), "exports", 1);
    await tap(profilePage, fixture.selectors.profileEmergencyButton, "emergency help button");
    expectCollectionLength(await fetchDiagnostics(), "emergencies", 1);

    console.log("[miniprogram-smoke] Native smoke completed successfully.");
  } finally {
    await miniProgram.close();
  }
}

run().catch((error) => {
  console.error("[miniprogram-smoke] Smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
