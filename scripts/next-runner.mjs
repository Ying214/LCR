import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const command = process.argv[2] ?? "dev";
const extraArgs = process.argv.slice(3);

const ENV_FILES_BY_COMMAND = {
  dev: [".env", ".env.local", ".env.development", ".env.development.local"],
  start: [".env", ".env.local", ".env.production", ".env.production.local"],
  build: [".env", ".env.local", ".env.production", ".env.production.local"],
};

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function applyEnvFile(filepath) {
  if (!existsSync(filepath)) {
    return;
  }

  const content = readFileSync(filepath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    process.env[key] = stripQuotes(rawValue);
  }
}

const envFiles = ENV_FILES_BY_COMMAND[command] ?? [];
for (const envFile of envFiles) {
  applyEnvFile(resolve(process.cwd(), envFile));
}

const port = process.env.LCR_PORT ?? process.env.PORT ?? "3000";
const host = process.env.LCR_HOST ?? process.env.HOSTNAME ?? "127.0.0.1";
const useTurbopack = (process.env.LCR_TURBOPACK ?? "true").toLowerCase() !== "false";

const nextBin = resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const nextArgs = [nextBin, command];

if (command === "dev" || command === "start") {
  nextArgs.push("-p", port, "-H", host);
}

if (command === "dev" && useTurbopack) {
  nextArgs.push("--turbopack");
}

nextArgs.push(...extraArgs);

const prettyCommand = `node ${nextArgs
  .map((arg) => (arg.includes(" ") ? `"${arg}"` : arg))
  .join(" ")}`;
console.log(`[next-runner] command: ${prettyCommand}`);
console.log(`[next-runner] settings: port=${port}, host=${host}, turbopack=${useTurbopack}`);

const child = spawn(process.execPath, nextArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
