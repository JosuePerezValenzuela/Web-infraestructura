const path = require("path");
const { spawn } = require("child_process");

// Carga variables de entorno desde archivos conocidos
try {
  const dotenv = require("dotenv");
  [".env.production.local", ".env.production", ".env.local", ".env"].forEach((file) => {
    dotenv.config({ path: path.resolve(process.cwd(), file) });
  });
} catch {
  // Si dotenv no está, seguimos con process.env tal cual.
}

const rawPort = process.env.PORT || process.env.NEXT_PUBLIC_FRONTEND_PORT;
const resolvedPort = rawPort && rawPort.trim() ? rawPort.trim() : "3000";

const rawHost = process.env.HOST;
let resolvedHost = "0.0.0.0";
if (rawHost && rawHost.trim()) {
  resolvedHost = rawHost.trim();
} else if (process.env.NEXT_PUBLIC_FRONTEND_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_FRONTEND_URL.trim());
      resolvedHost = url.hostname || resolvedHost;
    } catch {
      // usar fallback
    }
}

const child = spawn("next", ["start"], {
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
