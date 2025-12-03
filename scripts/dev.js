const path = require("path");
const { spawn } = require("child_process");

try {
  const dotenv = require("dotenv");
  [".env.local", ".env"].forEach((file) => {
    dotenv.config({ path: path.resolve(process.cwd(), file) });
  });
} catch {
  // Si dotenv no está, continuamos con process.env tal cual.
}

const fallbackPort = "3002";
const envPort = process.env.NEXT_PUBLIC_FRONTEND_PORT;
const resolvedPort = envPort && envPort.trim() ? envPort.trim() : fallbackPort;

const envFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
let resolvedHost = process.env.HOST;

if (!resolvedHost) {
  if (envFrontendUrl) {
    try {
      const url = new URL(envFrontendUrl.trim());
      resolvedHost = url.hostname || "localhost";
    } catch {
      resolvedHost = "localhost";
    }
  } else {
    resolvedHost = "localhost";
  }
}

const child = spawn("next", ["dev"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    PORT: resolvedPort,
    HOST: resolvedHost,
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
