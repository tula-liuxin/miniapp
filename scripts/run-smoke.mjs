import { spawn } from "node:child_process";
import path from "node:path";

const rootDir = process.cwd();
const serverCommand =
  process.platform === "win32"
    ? path.join(rootDir, "node_modules", ".bin", "tsx.cmd")
    : path.join(rootDir, "node_modules", ".bin", "tsx");

function spawnCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/c", command, ...args], {
      ...options,
      shell: false
    });
  }

  return spawn(command, args, {
    ...options,
    shell: false
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(baseURL) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(new URL("/health", baseURL));
      if (response.ok) {
        return;
      }
    } catch {}
    await wait(1_000);
  }
  throw new Error(`Server did not become ready at ${baseURL}/health within 60000ms`);
}

async function runCommand(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        ...extraEnv
      }
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const baseURL = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3100";
  const server = spawnCommand(serverCommand, ["mock-server/src/index.ts"], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });

  try {
    await waitForServer(baseURL);
    await runCommand("npx", ["playwright", "test", "tests/playwright"], {
      SMOKE_BASE_URL: baseURL,
      MINIPROGRAM_STRICT: "1"
    });
    await runCommand("node", ["tests/miniprogram/smoke.mjs"], {
      SMOKE_BASE_URL: baseURL,
      MINIPROGRAM_STRICT: "1"
    });
  } finally {
    if (!server.killed) {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error("[smoke-runner] Smoke failed.");
  console.error(error);
  process.exitCode = 1;
});
