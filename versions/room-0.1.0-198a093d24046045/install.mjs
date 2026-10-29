#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from "node:url";
import { basename, dirname, resolve, sep } from "node:path";
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";

const ownRoot = dirname(fileURLToPath(import.meta.url));
const repositoryWrapper = resolve(
  ownRoot,
  "../../packages/room-cli/src/toolchain.mjs",
);
const bootstrap = new URL("./bootstrap/src/toolchain.mjs", import.meta.url);
// Exported installers always load their adjacent bootstrap; the source entry
// remains usable by repository tooling without borrowing source in a release.
const sourceWrapper =
  basename(fileURLToPath(import.meta.url)) === "install-release.mjs" &&
  ownRoot.endsWith(`${sep}scripts${sep}room`) &&
  existsSync(resolve(ownRoot, "../../pnpm-workspace.yaml"));
const { installRelease } = await import(
  sourceWrapper ? pathToFileURL(repositoryWrapper) : bootstrap
);
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    manager: { type: "string", default: "npm" },
    template: { type: "string" },
    id: { type: "string" },
    "no-install": { type: "boolean", default: false },
    "install-only": { type: "boolean", default: false },
    "configure-only": { type: "boolean", default: false },
    "replace-skills": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});
const usage =
  "Usage: node install.mjs <project-directory> [--template r3f|three|mechanisms|mechanism-controls] [--manager npm|pnpm] [--id name] [--no-install|--install-only|--configure-only] [--replace-skills]";
if (values.help)
  console.log(
    `${usage}\nInstalls a project-local, movable Room release and its managed skills. Existing model files and scripts are preserved.`,
  );
else {
  if (positionals.length !== 1) throw new Error(usage);
  const result = await installRelease(ownRoot, positionals[0], {
    manager: values.manager,
    template: values.template,
    id: values.id,
    install: !values["no-install"],
    installOnly: values["install-only"],
    configureOnly: values["configure-only"],
    replaceSkills: values["replace-skills"],
  });
  console.log(JSON.stringify(result, null, 2));
}
