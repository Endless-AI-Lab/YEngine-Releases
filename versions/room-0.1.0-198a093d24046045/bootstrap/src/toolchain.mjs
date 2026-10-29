import { randomUUID } from "node:crypto";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { assertInitProjectDirectory } from "./init.mjs";
import {
  installDependencies,
  validatePackageManager,
} from "./package-manager.mjs";
import {
  hashFile,
  payloadFiles,
  readRelease,
  releasePath,
} from "./release-manifest.mjs";

const RECEIPT = "room.toolchain.json";
const FIELDS = ["dependencies", "devDependencies", "optionalDependencies"];
const ROOT_PACKAGES = [
  "@yweb/room-cli",
  "@yweb/room",
  "@yweb/room-react",
  "@yweb/engine-react",
  "@yweb/engine-physics-jolt",
];
const portable = (value) => value.replaceAll(sep, "/");
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

function inside(root, target) {
  const part = relative(root, target);
  return (
    !part ||
    (part !== ".." && !part.startsWith(`..${sep}`) && !isAbsolute(part))
  );
}

async function info(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

/** Managed writes never follow a project-local symlink/junction. */
async function projectPath(root, file) {
  const target = releasePath(root, file);
  const segments = relative(root, target).split(sep);
  let current = root;
  const rootInfo = await info(root);
  if (rootInfo && (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()))
    throw new Error(`Project root must be a real directory: ${root}`);
  for (const [index, segment] of segments.entries()) {
    current = resolve(current, segment);
    const entry = await info(current);
    if (entry?.isSymbolicLink())
      throw new Error(`Managed project path cannot be a link: ${file}`);
    if (entry && index < segments.length - 1 && !entry.isDirectory())
      throw new Error(`Managed project parent must be a directory: ${file}`);
  }
  return target;
}

async function readReceipt(root) {
  const path = await projectPath(root, RECEIPT);
  if (!existsSync(path)) return undefined;
  const receipt = JSON.parse(await readFile(path, "utf8"));
  const vendor = receipt.vendor ?? receipt.vendorRoot;
  if (
    receipt.schemaVersion !== 1 ||
    receipt.distribution !== "local" ||
    typeof receipt.releaseId !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(receipt.releaseId) ||
    vendor !== `vendor/yweb/${receipt.releaseId}` ||
    !Array.isArray(receipt.packages) ||
    !Array.isArray(receipt.skills)
  )
    throw new Error(
      "Invalid room.toolchain.json; repair its local release record before installing",
    );
  await projectPath(root, vendor);
  for (const skill of receipt.skills) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(skill.name ?? "") ||
      !Array.isArray(skill.files)
    )
      throw new Error("Invalid managed skill record in room.toolchain.json");
    for (const file of skill.files) {
      if (
        !file.path?.startsWith(`.agents/skills/${skill.name}/`) ||
        !/^[a-f0-9]{64}$/.test(file.sha256 ?? "")
      )
        throw new Error("Invalid managed skill file in room.toolchain.json");
      await projectPath(root, file.path);
    }
  }
  return { ...receipt, vendor };
}

/** Explicit releases win; an existing local context is never silently ignored. */
export async function resolveReleaseContext({
  release,
  projectRoot = process.cwd(),
} = {}) {
  if (release !== undefined) return resolve(release);
  const context = await findReceipt(projectRoot);
  if (!context) return undefined;
  const { root, receipt } = context;
  const vendor = await projectPath(root, receipt.vendor);
  let manifest;
  try {
    manifest = await readRelease(vendor);
  } catch (cause) {
    throw new Error(
      `The recorded local release is missing or invalid: ${receipt.vendor}. Supply --release <directory> to repair the project.`,
      { cause },
    );
  }
  if (manifest.releaseId !== receipt.releaseId)
    throw new Error(
      "The recorded local release identity does not match its vendor directory",
    );
  return vendor;
}

async function findReceipt(projectRoot) {
  let root = resolve(projectRoot);
  for (;;) {
    const receipt = await readReceipt(root);
    if (receipt) return { root, receipt };
    // A registry-managed project is its own context boundary.
    if (existsSync(await projectPath(root, "room.project.json")))
      return undefined;
    const parent = dirname(root);
    if (parent === root) return undefined;
    root = parent;
  }
}

function releaseSkills(manifest) {
  return (manifest.skills ?? []).map((skill) => ({
    name: skill.name,
    files: skill.files.map((file) => ({
      path: `.agents/${file.path}`,
      sha256: file.sha256,
      source: file.path,
    })),
  }));
}

async function planSkills(root, manifest, previous, replaceSkills) {
  const skills = releaseSkills(manifest);
  const managedNames = new Set(
    (previous?.skills ?? []).map((skill) => skill.name),
  );
  const oldHashes = new Map(
    (previous?.skills ?? []).flatMap((skill) =>
      skill.files.map((file) => [file.path, file.sha256]),
    ),
  );
  const conflicts = new Set();
  const backups = new Set();
  async function collectBackupFiles(path) {
    const target = await projectPath(root, path);
    const entry = await info(target);
    if (entry?.isDirectory()) {
      for (const name of await readdir(target))
        await collectBackupFiles(`${path}/${name}`);
    } else if (entry?.isFile()) backups.add(path);
    else
      throw new Error(
        `Skill backup requires regular files and directories: ${path}`,
      );
  }
  for (const skill of skills) {
    const path = `.agents/skills/${skill.name}`;
    const target = await projectPath(root, path);
    const entry = await info(target);
    if (entry && !entry.isDirectory())
      throw new Error(`Skill destination must be a directory: ${path}`);
    if (
      entry &&
      !managedNames.has(skill.name) &&
      (await readdir(target)).length
    ) {
      conflicts.add(`${path}/`);
      if (replaceSkills) await collectBackupFiles(path);
    }
  }
  for (const file of skills.flatMap((skill) => skill.files)) {
    const target = await projectPath(root, file.path);
    const entry = await info(target);
    if (!entry) {
      if (oldHashes.has(file.path)) conflicts.add(file.path);
      continue;
    }
    if (!entry.isFile())
      throw new Error(
        `Managed skill destination must be a regular file: ${file.path}`,
      );
    const current = await hashFile(target);
    if (
      current !==
      (oldHashes.has(file.path) ? oldHashes.get(file.path) : file.sha256)
    ) {
      conflicts.add(file.path);
      backups.add(file.path);
    }
  }
  if (conflicts.size && !replaceSkills)
    throw new Error(
      `Local skill files conflict: ${[...conflicts].join(", ")}. Use --replace-skills to back them up and replace them.`,
    );
  return { skills, conflicts: [...conflicts], backups: [...backups] };
}

async function copyRelease(source, destination, manifest, files) {
  if (existsSync(destination)) {
    const existing = await readRelease(destination);
    if (
      existing.releaseId !== manifest.releaseId ||
      existing.contentDigest !== manifest.contentDigest
    )
      throw new Error(
        `Vendor release directory contains different content: ${destination}`,
      );
    return;
  }
  await mkdir(dirname(destination), { recursive: true });
  const staging = resolve(
    dirname(destination),
    `.${basename(destination)}-${randomUUID()}`,
  );
  if (!inside(dirname(destination), staging))
    throw new Error("Invalid vendor staging directory");
  try {
    await mkdir(staging);
    for (const file of [...files.map((entry) => entry.path), "release.json"]) {
      const target = releasePath(staging, file);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(releasePath(source, file), target);
    }
    await readRelease(staging);
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function configurePackages(manifest, release, vendor, previous, manager) {
  const specifications = new Map(
    release.packages.map((item) => [item.name, `file:${vendor}/${item.file}`]),
  );
  for (const old of previous?.packages ?? []) {
    if (specifications.has(old.name)) continue;
    for (const field of FIELDS)
      if (manifest[field]?.[old.name] === `file:${old.file}`)
        delete manifest[field][old.name];
    if (manifest.overrides?.[old.name] === `file:${old.file}`)
      delete manifest.overrides[old.name];
    if (manifest.pnpm?.overrides?.[old.name] === `file:${old.file}`)
      delete manifest.pnpm.overrides[old.name];
  }
  for (const [name, specification] of specifications) {
    const existing = FIELDS.filter(
      (field) => manifest[field]?.[name] !== undefined,
    );
    if (!existing.length && !ROOT_PACKAGES.includes(name)) continue;
    for (const field of existing.length
      ? existing
      : [name === "@yweb/room-cli" ? "devDependencies" : "dependencies"])
      manifest[field] = { ...manifest[field], [name]: specification };
  }
  const overrides = Object.fromEntries(specifications);
  // Retain user overrides while synchronizing any previously-used package manager.
  if (manager === "npm" || manifest.overrides)
    manifest.overrides = { ...manifest.overrides, ...overrides };
  if (manager === "pnpm" || manifest.pnpm?.overrides)
    manifest.pnpm = {
      ...manifest.pnpm,
      overrides: { ...manifest.pnpm?.overrides, ...overrides },
    };
  return manifest;
}

export async function installRelease(
  releaseDirectory,
  targetDirectory,
  {
    manager = "npm",
    template,
    id,
    install = true,
    installOnly = false,
    configureOnly = false,
    replaceSkills = false,
  } = {},
) {
  validatePackageManager(manager);
  if (
    template !== undefined &&
    !["r3f", "three", "mechanisms", "mechanism-controls"].includes(template)
  )
    throw new Error(
      "template must be r3f, three, mechanisms or mechanism-controls",
    );
  if (id !== undefined && !/^[a-zA-Z0-9_-]+$/.test(id))
    throw new Error(
      "Project id must contain only letters, digits, underscore and hyphen",
    );
  const source = await realpath(resolve(releaseDirectory));
  const release = await readRelease(source);
  if (!/^[A-Za-z0-9][A-Za-z0-9.+_-]*$/.test(release.releaseId))
    throw new Error("Invalid local release identifier");
  const root = resolve(targetDirectory);
  if (inside(source, root))
    throw new Error(
      "Install the model project outside the generated release directory",
    );
  const previous = await readReceipt(root);
  const hasCli = release.packages.some(
    (item) => item.name === "@yweb/room-cli",
  );
  const existingProject = existsSync(
    await projectPath(root, "room.project.json"),
  );
  const create = hasCli && !installOnly && !configureOnly && !existingProject;
  if (existingProject && (template !== undefined || id !== undefined))
    throw new Error(
      "--template and --id apply only to new projects; existing model files are preserved",
    );
  if (create) await assertInitProjectDirectory(root);
  const vendor = `vendor/yweb/${release.releaseId}`;
  const destination = await projectPath(root, vendor);
  const packagePath = await projectPath(root, "package.json");
  const packageInfo = await info(packagePath);
  if (packageInfo && !packageInfo.isFile())
    throw new Error("Project package.json must be a regular file");
  let packageManifest = packageInfo
    ? JSON.parse(await readFile(packagePath, "utf8"))
    : undefined;
  if (existsSync(destination)) {
    const existing = await readRelease(destination);
    if (
      existing.releaseId !== release.releaseId ||
      existing.contentDigest !== release.contentDigest
    )
      throw new Error("Existing vendor release has a different identity");
  }
  const files =
    release.schemaVersion === 2 ? release.files : await payloadFiles(source);
  const { skills, backups } = await planSkills(
    root,
    release,
    previous,
    replaceSkills,
  );
  const backup = backups.length
    ? `.room-toolchain-backups/${Date.now()}-${randomUUID()}`
    : undefined;
  if (backup) {
    await projectPath(root, backup);
    for (const file of backups) await projectPath(root, `${backup}/${file}`);
  }

  // Every release checksum, destination and skill conflict has been checked above.
  let created;
  if (create) {
    const { initProject } = await import(
      pathToFileURL(releasePath(source, "bootstrap/src/init.mjs"))
    );
    created = await initProject(root, { template: template ?? "r3f", id });
  }
  await mkdir(root, { recursive: true });
  await copyRelease(source, destination, release, files);
  if (backup) await mkdir(releasePath(root, backup), { recursive: true });
  for (const file of backups) {
    const target = releasePath(root, `${backup}/${file}`);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(releasePath(root, file), target);
  }
  for (const file of skills.flatMap((skill) => skill.files)) {
    const target = releasePath(root, file.path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(releasePath(destination, file.source), target);
  }
  packageManifest = created
    ? JSON.parse(await readFile(packagePath, "utf8"))
    : (packageManifest ?? {
        name: basename(root)
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-"),
        private: true,
        type: "module",
      });
  configurePackages(packageManifest, release, vendor, previous, manager);
  await writeFile(packagePath, json(packageManifest));
  const receipt = {
    schemaVersion: 1,
    distribution: "local",
    releaseId: release.releaseId,
    sdkVersion: release.sdkVersion,
    protocol: release.protocol,
    vendor,
    manager,
    packages: release.packages.map((item) => ({
      name: item.name,
      version: item.version,
      file: `${vendor}/${item.file}`,
      sha256: item.sha256,
    })),
    skills: skills.map((skill) => ({
      name: skill.name,
      files: skill.files.map(({ path, sha256 }) => ({ path, sha256 })),
    })),
    status: "configured",
  };
  const receiptPath = releasePath(root, RECEIPT);
  await writeFile(receiptPath, json(receipt));
  const shouldInstall = install && !configureOnly;
  if (shouldInstall) {
    await installDependencies(root, { manager });
    receipt.status = "installed";
    await writeFile(receiptPath, json(receipt));
  }
  return {
    root,
    projectId: created?.projectId,
    template: created?.template,
    manager,
    installed: shouldInstall,
    created: Boolean(created),
    releaseId: release.releaseId,
    vendor,
    receipt: RECEIPT,
    ...(backup ? { skillBackup: backup } : {}),
  };
}

async function installedPackageInfo(root, packages) {
  const expected = new Map(
    packages.map((entry) => [entry.name, entry.version]),
  );
  const located = new Map(),
    visited = new Set(),
    errors = new Map();
  let initial;
  try {
    initial = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  } catch {
    initial = {};
  }
  const queue = [{ root, manifest: initial }];
  while (queue.length) {
    const current = queue.shift();
    const require = createRequire(resolve(current.root, "package.json"));
    const dependencies = {
      ...current.manifest.dependencies,
      ...current.manifest.devDependencies,
      ...current.manifest.optionalDependencies,
      ...current.manifest.peerDependencies,
    };
    for (const name of Object.keys(dependencies).filter((name) =>
      expected.has(name),
    )) {
      try {
        const resolved = await realpath(require.resolve(name));
        let owner = dirname(resolved),
          manifest;
        for (;;) {
          try {
            const value = JSON.parse(
              await readFile(resolve(owner, "package.json"), "utf8"),
            );
            if (value.name === name) {
              manifest = value;
              break;
            }
          } catch {
            /* Continue to the resolved package root. */
          }
          const parent = dirname(owner);
          if (owner === parent) break;
          owner = parent;
        }
        if (!manifest)
          throw new Error(`Cannot find package metadata for ${name}`);
        const key = `${name}:${owner}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const withinProject = inside(root, resolved);
        const entry = {
          resolved,
          withinProject,
          installedVersion: manifest.version,
          versionMatches: manifest.version === expected.get(name),
        };
        if (!located.has(name)) located.set(name, []);
        located.get(name).push(entry);
        if (withinProject) queue.push({ root: owner, manifest });
      } catch (error) {
        errors.set(name, error.message);
      }
    }
  }
  return packages.map((entry) => {
    const copies = located.get(entry.name) ?? [];
    const installed =
      copies.length > 0 && copies.every((copy) => copy.withinProject);
    const versionMatches =
      installed && copies.every((copy) => copy.versionMatches);
    return {
      ...entry,
      installed,
      installedVersion: copies[0]?.installedVersion ?? null,
      versionMatches,
      status: !copies.length
        ? "missing"
        : !installed
          ? "outside-project"
          : versionMatches
            ? "ok"
            : "version-mismatch",
      ...(copies.length
        ? {
            resolved: copies[0].resolved,
            ...(copies.length > 1 ? { copies } : {}),
          }
        : {
            error:
              errors.get(entry.name) ??
              "Package is not reachable from this project's dependencies",
          }),
    };
  });
}

export async function toolchainInfo(projectRoot = process.cwd()) {
  let context;
  try {
    context = await findReceipt(projectRoot);
  } catch (error) {
    return { status: "invalid", error: error.message };
  }
  if (!context) return { status: "unmanaged" };
  const { root, receipt } = context;
  const result = { ...receipt };
  try {
    const release = await readRelease(await projectPath(root, receipt.vendor));
    if (release.releaseId !== receipt.releaseId)
      throw new Error("Vendor release identity mismatch");
    result.vendorValid = true;
  } catch (error) {
    result.vendorValid = false;
    result.status = "invalid";
    result.error = error.message;
  }
  result.packages = await installedPackageInfo(root, receipt.packages);
  result.packageVersionsMatch = result.packages.every(
    (entry) => entry.versionMatches,
  );
  if (receipt.status === "installed" && !result.packageVersionsMatch) {
    result.status = "invalid";
    result.error ??=
      "Installed Room packages do not match the recorded release";
  }
  result.skills = await Promise.all(
    receipt.skills.map(async (skill) => ({
      name: skill.name,
      files: await Promise.all(
        skill.files.map(async (file) => {
          const target = await projectPath(root, file.path);
          const entry = await info(target);
          return {
            path: file.path,
            status: !entry
              ? "missing"
              : !entry.isFile()
                ? "modified"
                : (await hashFile(target)) === file.sha256
                  ? "ok"
                  : "modified",
          };
        }),
      ),
    })),
  );
  return result;
}
