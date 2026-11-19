import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";

function run(args) {
  const result = spawnSync(executable, args, {
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(`[vercel-build] Failed to start ${args.join(" ")}:`, result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["prisma", "generate"]);

if (process.env.VERCEL_ENV === "production") {
  console.log("[vercel-build] Applying production database migrations.");
  run(["prisma", "migrate", "deploy"]);
} else {
  console.log(
    `[vercel-build] Skipping database migrations for ${process.env.VERCEL_ENV ?? "local"} build.`,
  );
}

run(["next", "build"]);
