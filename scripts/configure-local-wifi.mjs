import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const configureScript = path.join(rootDir, "scripts", "configure-miniapp.mjs");

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

function getIpv4Candidates() {
  const output = execSync(
    "powershell -NoProfile -Command \"Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress\"",
    { cwd: rootDir, encoding: "utf8" }
  );

  return output
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const appid = args.appid;
  if (!appid) {
    throw new Error("Missing required argument --appid");
  }

  const ip = args.ip || getIpv4Candidates()[0];
  if (!ip) {
    throw new Error("Could not detect a LAN IPv4 address. Pass one explicitly with --ip");
  }

  const apiBase = `http://${ip}:3100/api`;
  execSync(
    `node "${configureScript}" --appid ${appid} --api-base ${apiBase} --app-name 宫颈癌患者关护 --project-name cervical-care-local`,
    {
      cwd: rootDir,
      stdio: "inherit"
    }
  );

  const guidePath = path.join(rootDir, "LOCAL_WIFI_USAGE.txt");
  fs.writeFileSync(
    guidePath,
    `AppID: ${appid}\nLAN IP: ${ip}\nAPI Base: ${apiBase}\nHealth: http://${ip}:3100/health\n`,
    "utf8"
  );

  console.log(`[configure-local-wifi] Local Wi-Fi mode configured with ${apiBase}`);
}

main();
