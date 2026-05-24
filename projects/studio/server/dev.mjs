import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const viteBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite"
);

if (!existsSync(viteBin)) {
  console.error("Missing node_modules. Run npm install inside projects/studio first.");
  process.exit(1);
}

const children = [
  spawn("node", ["server/index.mjs"], {
    stdio: "inherit",
    env: process.env
  }),
  spawn(viteBin, ["--host", "0.0.0.0", "--port", process.env.VITE_PORT ?? "5177"], {
    stdio: "inherit",
    env: process.env
  })
];

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
