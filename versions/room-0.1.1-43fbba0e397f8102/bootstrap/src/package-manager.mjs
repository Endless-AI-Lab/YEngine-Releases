import { spawn } from "node:child_process";

export function validatePackageManager(manager = "npm") {
  if (!["npm", "pnpm"].includes(manager))
    throw new Error("The supported package managers are npm and pnpm");
  return manager;
}

export async function installDependencies(root, { manager = "npm" } = {}) {
  validatePackageManager(manager);
  // Always include development tools, even if the caller uses NODE_ENV=production.
  const args = [
    "install",
    "--ignore-scripts",
    manager === "npm" ? "--include=dev" : "--prod=false",
    ...(manager === "pnpm" ? ["--no-frozen-lockfile"] : []),
  ];
  // Only a fixed, validated command reaches cmd.exe. The project path is cwd,
  // never shell text, including when it contains spaces or shell metacharacters.
  const child =
    process.platform === "win32"
      ? spawn(
          process.env.ComSpec ?? "cmd.exe",
          ["/d", "/s", "/c", `${manager}.cmd ${args.join(" ")}`],
          { cwd: root, windowsHide: true, stdio: "inherit" },
        )
      : spawn(manager, args, { cwd: root, stdio: "inherit" });
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`${manager} exited with ${code}`)),
      );
    });
  } catch (cause) {
    throw new Error(
      `Dependency installation failed in ${root}. Project files were kept. Run '${manager} ${args.join(" ")}' in that directory to retry.`,
      { cause },
    );
  }
}
