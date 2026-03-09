import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const projectConfigPath = path.join(rootDir, "project.config.json");
const miniConfigPath = path.join(rootDir, "miniprogram", "config.js");

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`Missing required argument --${name}`);
  }
  return value;
}

function escapeForJs(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appid = requireValue("appid", args.appid);
  const apiBase = requireValue("api-base", args["api-base"]);
  const appName = args["app-name"] || "宫颈癌患者关护";
  const projectName = args["project-name"] || "cervical-care";

  const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, "utf8"));
  projectConfig.appid = appid;
  projectConfig.projectname = projectName;
  projectConfig.description = appName;
  fs.writeFileSync(projectConfigPath, `${JSON.stringify(projectConfig, null, 2)}\n`, "utf8");

  const configSource = `module.exports = {
  appName: '${escapeForJs(appName)}',
  apiBaseUrl: '${escapeForJs(apiBase)}'
};
`;
  fs.writeFileSync(miniConfigPath, configSource, "utf8");

  console.log(`[configure-miniapp] Updated project.config.json appid=${appid}`);
  console.log(`[configure-miniapp] Updated miniprogram/config.js apiBaseUrl=${apiBase}`);
}

main();
