import { existsSync } from "node:fs";

const defaultCliPath =
  "C:\\Program Files (x86)\\Tencent\\\u5fae\u4fe1web\u5f00\u53d1\u8005\u5de5\u5177\\cli.bat";
const cliPath = process.env.WECHAT_CLI_PATH ?? defaultCliPath;

if (existsSync(cliPath)) {
  console.log(`[miniprogram-smoke] WeChat DevTools CLI detected at ${cliPath}`);
  process.exit(0);
}

console.error(`[miniprogram-smoke] WeChat DevTools CLI not found at ${cliPath}`);
process.exit(1);
