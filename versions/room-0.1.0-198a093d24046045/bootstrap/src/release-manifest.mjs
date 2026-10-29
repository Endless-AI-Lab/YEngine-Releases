import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";

export const PAYLOAD_ENTRIES = Object.freeze([
  "README.md",
  "package.json",
  "install.mjs",
  "bootstrap",
  "packages",
  "skills",
]);

export function canonicalJSON(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalJSON(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function digest(value) {
  return createHash("sha256").update(canonicalJSON(value)).digest("hex");
}

export async function hashFile(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return (
    !relative ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

export function releasePath(root, file) {
  if (
    typeof file !== "string" ||
    !file ||
    file.includes("\\") ||
    file.includes("\0") ||
    file.includes(":") ||
    path.posix.isAbsolute(file) ||
    path.win32.isAbsolute(file) ||
    path.posix.normalize(file) !== file ||
    file.split("/").some((part) => !part || part === "." || part === "..")
  )
    throw new Error(`Invalid release path: ${String(file)}`);
  const target = path.resolve(root, ...file.split("/"));
  if (!inside(path.resolve(root), target))
    throw new Error(`Release path escapes its root: ${file}`);
  return target;
}

async function checkedFile(root, file) {
  const target = releasePath(root, file);
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error(`Release entry must be a regular file: ${file}`);
  if (!inside(await realpath(root), await realpath(target)))
    throw new Error(`Release link escapes its root: ${file}`);
  return { target, info };
}

export async function payloadFiles(root) {
  const files = [];
  async function visit(file) {
    const target = releasePath(root, file);
    let info;
    try {
      info = await lstat(target);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    if (info.isSymbolicLink())
      throw new Error(`Release payload cannot contain links: ${file}`);
    if (info.isDirectory()) {
      for (const name of (await readdir(target)).sort())
        await visit(`${file}/${name}`);
    } else if (info.isFile()) {
      await checkedFile(root, file);
      files.push({
        path: file,
        sha256: await hashFile(target),
        size: info.size,
      });
    } else throw new Error(`Unsupported release entry: ${file}`);
  }
  for (const file of PAYLOAD_ENTRIES) await visit(file);
  return files.sort((a, b) => a.path.localeCompare(b.path, "en"));
}

function baseManifest(manifest) {
  const { releaseId: _id, contentDigest: _digest, ...base } = manifest;
  return base;
}

function identityManifest(manifest) {
  const base = baseManifest(manifest);
  if (base.identityVersion === 2) {
    const { source: _source, ...payload } = base;
    return payload;
  }
  return base;
}

export const releaseContentDigest = (manifest) =>
  digest(identityManifest(manifest));

export function releaseId(manifest) {
  const version = manifest.sdkVersion;
  if (typeof version !== "string" || !/^[0-9][0-9A-Za-z.+-]*$/.test(version))
    throw new Error("Invalid release SDK version");
  return `room-${version}-${releaseContentDigest(manifest).slice(0, 16)}`;
}

export async function createReleaseManifest(root, fields) {
  const base = {
    schemaVersion: 2,
    identityVersion: 2,
    kind: fields.kind ?? "full",
    protocol: 3,
    sdkVersion: fields.sdkVersion,
    source: fields.source,
    packages: [...fields.packages].sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    ),
    skills: [...(fields.skills ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name, "en"),
    ),
    files: await payloadFiles(root),
  };
  return {
    ...base,
    releaseId: releaseId(base),
    contentDigest: releaseContentDigest(base),
  };
}

export async function readRelease(root, { verify = true } = {}) {
  root = path.resolve(root);
  const raw = JSON.parse(
    await readFile(path.join(root, "release.json"), "utf8"),
  );
  const schema = raw.schemaVersion ?? 1;
  if (
    ![1, 2].includes(schema) ||
    !Array.isArray(raw.packages) ||
    !raw.packages.length
  )
    throw new Error("Unsupported or empty Room release manifest");
  if (raw.protocol !== undefined && raw.protocol !== 3)
    throw new Error("Unsupported Room release protocol");
  const names = new Set();
  const checkHash = async (file, sha256, size) => {
    if (!/^[a-f0-9]{64}$/.test(sha256 ?? ""))
      throw new Error(`Invalid release checksum: ${file}`);
    const { target, info } = await checkedFile(root, file);
    if (
      size !== undefined &&
      (!Number.isSafeInteger(size) || size < 0 || info.size !== size)
    )
      throw new Error(`Release size mismatch: ${file}`);
    if (verify && (await hashFile(target)) !== sha256)
      throw new Error(`Checksum mismatch: ${file}`);
  };
  for (const artifact of raw.packages) {
    if (
      typeof artifact.name !== "string" ||
      !artifact.name.startsWith("@yweb/") ||
      names.has(artifact.name)
    )
      throw new Error(
        `Invalid or duplicate release package: ${String(artifact.name)}`,
      );
    names.add(artifact.name);
    await checkHash(artifact.file, artifact.sha256);
  }
  if (schema === 1)
    return {
      ...raw,
      schemaVersion: 1,
      protocol: raw.protocol ?? 3,
      releaseId: `room-${raw.sdkVersion ?? "0.1.0"}-legacy-${digest(raw.packages).slice(0, 16)}`,
      skills: [],
    };
  if (raw.identityVersion !== undefined && raw.identityVersion !== 2)
    throw new Error("Unsupported Room release identity version");
  if (
    raw.releaseId !== releaseId(raw) ||
    raw.contentDigest !== releaseContentDigest(raw)
  )
    throw new Error("Release identity does not match its content manifest");
  if (
    !Array.isArray(raw.files) ||
    !Array.isArray(raw.skills) ||
    !["full", "sdk"].includes(raw.kind)
  )
    throw new Error("Incomplete Room release inventory");
  const inventory = new Map();
  for (const entry of raw.files) {
    if (!PAYLOAD_ENTRIES.includes(String(entry.path).split("/")[0]))
      throw new Error(`Unexpected release payload path: ${entry.path}`);
    const key = String(entry.path).toLowerCase();
    if (inventory.has(key) || entry.path === "release.json")
      throw new Error(`Duplicate release inventory path: ${entry.path}`);
    await checkHash(entry.path, entry.sha256, entry.size);
    inventory.set(key, entry);
  }
  for (const artifact of raw.packages)
    if (inventory.get(artifact.file.toLowerCase())?.sha256 !== artifact.sha256)
      throw new Error(
        `Package missing from release inventory: ${artifact.name}`,
      );
  const skillNames = new Set();
  for (const skill of raw.skills) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(skill.name ?? "") ||
      skillNames.has(skill.name) ||
      skill.protocol !== raw.protocol ||
      !Array.isArray(skill.files)
    )
      throw new Error(`Invalid release skill: ${String(skill.name)}`);
    skillNames.add(skill.name);
    const files = new Set();
    for (const entry of skill.files) {
      if (
        !entry.path.startsWith(`skills/${skill.name}/`) ||
        files.has(entry.path.toLowerCase()) ||
        inventory.get(entry.path.toLowerCase())?.sha256 !== entry.sha256
      )
        throw new Error(`Invalid skill inventory entry: ${entry.path}`);
      files.add(entry.path.toLowerCase());
    }
    if (!files.has(`skills/${skill.name}/skill.md`))
      throw new Error(`Missing SKILL.md: ${skill.name}`);
  }
  if (raw.kind === "full") {
    for (const file of [
      "package.json",
      "install.mjs",
      "bootstrap/package.json",
      "bootstrap/src/init.mjs",
      "bootstrap/src/package-manager.mjs",
      "bootstrap/src/toolchain.mjs",
      "bootstrap/src/release-manifest.mjs",
    ])
      if (!inventory.has(file.toLowerCase()))
        throw new Error(`Incomplete bootstrap: ${file}`);
    if (
      !names.has("@yweb/room-cli") ||
      !["scan-to-yengine", "yengine-mechanisms"].every((name) =>
        skillNames.has(name),
      )
    )
      throw new Error(
        "A complete release requires the CLI, Viewer and both skills",
      );
  }
  return raw;
}
