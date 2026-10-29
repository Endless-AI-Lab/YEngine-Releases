import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import {
  installDependencies,
  validatePackageManager,
} from "./package-manager.mjs";

export async function createProject(
  path = "my-room",
  {
    manager = "npm",
    install = true,
    release,
    replaceSkills = false,
    ...options
  } = {},
) {
  validatePackageManager(manager);
  if (existsSync(resolve(path, "room.project.json")))
    throw new Error(
      "room init requires an empty directory or an installed Room shell; use the release installer to upgrade an existing Room project",
    );
  const { resolveReleaseContext, installRelease } =
    await import("./toolchain.mjs");
  const localRelease = await resolveReleaseContext({ release });
  if (localRelease)
    return installRelease(localRelease, path, {
      ...options,
      manager,
      install,
      replaceSkills,
    });
  const project = await initProject(path, options);
  if (install) await installDependencies(project.root, { manager });
  return { ...project, manager, installed: install };
}

export async function assertInitProjectDirectory(root) {
  if (!existsSync(root)) return undefined;
  const files = await readdir(root);
  if (!files.length) return undefined;
  const installationFiles = new Set([
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "npm-shrinkwrap.json",
    "node_modules",
    ".npmrc",
    ...(files.includes("room.toolchain.json")
      ? ["room.toolchain.json", "vendor", ".agents"]
      : []),
  ]);
  if (
    files.every((file) => installationFiles.has(file)) &&
    files.includes("package.json")
  ) {
    const installed = JSON.parse(
      await readFile(resolve(root, "package.json"), "utf8"),
    );
    if (
      installed.dependencies?.["@yweb/room-cli"] ||
      installed.devDependencies?.["@yweb/room-cli"]
    )
      return installed;
  }
  throw new Error(
    "room init requires an empty directory or an installed Room shell containing only package/install files",
  );
}

export async function initProject(
  path = "my-room",
  { template = "r3f", id } = {},
) {
  if (!["r3f", "three", "mechanisms", "mechanism-controls"].includes(template))
    throw new Error(
      "template must be r3f, three, mechanisms or mechanism-controls",
    );
  const kind = template === "three" ? "three" : "r3f";
  const mechanism =
    template === "mechanisms" || template === "mechanism-controls";
  const root = resolve(path);
  const installed = await assertInitProjectDirectory(root);
  const roomId =
    id ||
    basename(root)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-") ||
    "my-room";
  if (!/^[a-zA-Z0-9_-]+$/.test(roomId))
    throw new Error(
      "Project id must contain only letters, digits, underscore and hyphen",
    );
  const label = roomId.replace(/[-_]/g, " ");
  const extension = kind === "r3f" ? "tsx" : "ts";
  const cli = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const declaredSdk = cli.dependencies?.["@yweb/room"];
  const sdkVersion =
    declaredSdk && !declaredSdk.includes(":") ? declaredSdk : cli.version;
  await mkdir(resolve(root, "src"), { recursive: true });
  const dependencies = {
    "@yweb/room": sdkVersion,
    three: "0.185.1",
    ...(kind === "r3f"
      ? {
          "@yweb/room-react": sdkVersion,
          "@react-three/fiber": "9.8.1",
          react: "19.3.0",
          "react-dom": "19.3.0",
        }
      : {}),
  };
  const files = {
    "package.json": JSON.stringify(
      {
        name: roomId,
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: "room dev",
          build: "room build",
          typecheck: "tsc --noEmit",
          inspect: "room inspect",
          capture: "room capture",
          ...(mechanism
            ? {
                "test:mechanisms":
                  "room test --scenario scenario.json --output output/mechanisms",
              }
            : {}),
        },
        dependencies,
        devDependencies: {
          "@yweb/room-cli": cli.version,
          "@types/three": "^0.185.0",
          typescript: "^5.8.3",
          ...(kind === "r3f"
            ? { "@types/react": "~19.3.0", "@types/react-dom": "~19.3.0" }
            : {}),
        },
      },
      null,
      2,
    ),
    "room.project.json": JSON.stringify(
      {
        schemaVersion: 1,
        id: roomId,
        label,
        defaultRoom: roomId,
        rooms: [
          {
            id: roomId,
            label,
            kind,
            entry: `src/room.${extension}`,
            parameters: { color: "#b86f45" },
            state: {},
          },
        ],
        assets: {},
      },
      null,
      2,
    ),
    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022", "DOM", "DOM.Iterable"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          allowImportingTsExtensions: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
    ".gitignore":
      "node_modules/\ndist/\n.room/\noutput/\n.room-toolchain-backups/\n",
    "README.md": `# ${label}\n\nProject creation installs dependencies automatically. Start editing with \`npm run dev\` (or \`pnpm dev\`). If creation used \`--no-install\`, install dependencies with your package manager first. Edit \`src/room.${extension}\`; successful builds reload the whole page. Parameters and declared state live in \`room.project.json\`.\n\n\`npm run build\` writes a static site to \`dist/\`. Serve it over HTTP and open \`?project=./room.project.json\`; subpath deployment is supported.\n\nRun \`room setup browser\` before capture, and \`room setup python\` before photo comparisons or Python tools. These install to a writable cache, not this project or the SDK.\n\nDeclare copied assets in \`room.project.json\` and load them through the Room asset resolver. React component state resets on each source reload. Changes to simulation structure require a rebuild.\n`,
    [`src/room.${extension}`]:
      kind === "r3f"
        ? r3fTemplate(roomId, label)
        : threeTemplate(roomId, label),
  };
  if (mechanism) {
    files["src/room.tsx"] = (
      await readFile(
        new URL(`../examples/${template}/room.tsx.template`, import.meta.url),
        "utf8",
      )
    ).replaceAll("mechanism-fixture", roomId);
    files["scenario.json"] = await readFile(
      new URL(`../examples/${template}/scenario.json`, import.meta.url),
      "utf8",
    );
    files["README.md"] +=
      `\nThis mechanism project uses stable body/joint IDs, local frames, meters and radians. Run \`npm run test:mechanisms\` for one-session assertions, traces and captures. Choose Preview for pose inspection and Physics for finite-force interaction; switching modes resets authored state. ${template === "mechanisms" ? "Drag the door or drawer directly. Neither physical controls nor bindings are installed. The yellow stop is moved into the drawer path by the obstruction scenario." : "Press the physical button in Physics mode. Its actual travel triggers the door binding; releasing returns the door."}\n`;
  }
  if (installed) {
    const generated = JSON.parse(files["package.json"]);
    const existingNames = new Set(
      ["dependencies", "devDependencies", "optionalDependencies"].flatMap(
        (field) => Object.keys(installed[field] || {}),
      ),
    );
    const merged = {
      ...generated,
      ...installed,
      type: "module",
      scripts: { ...generated.scripts, ...installed.scripts },
    };
    for (const field of ["dependencies", "devDependencies"])
      merged[field] = {
        ...Object.fromEntries(
          Object.entries(generated[field]).filter(
            ([name]) => !existingNames.has(name),
          ),
        ),
        ...installed[field],
      };
    files["package.json"] = JSON.stringify(merged, null, 2);
  }
  for (const [name, content] of Object.entries(files))
    await writeFile(resolve(root, name), `${content}\n`);
  return { root, projectId: roomId, template };
}

function r3fTemplate(id, label) {
  return `import { useState } from "react";
import { RoomObject, type R3FRoomModule } from "@yweb/room-react";

const room = {
  kind: "r3f",
  id: ${JSON.stringify(id)},
  label: ${JSON.stringify(label)},
  camera: { orbit: [6, 5, 6], target: [0, 0.8, 0] },
  Component: function Room({ parameters }) {
    const [selected, setSelected] = useState(false);
    const color = typeof parameters.color === "string" ? parameters.color : "#b86f45";
    return <>
      <hemisphereLight args={["#ffffff", "#5b6470", 2]} />
      <directionalLight position={[4, 7, 3]} intensity={3} castShadow />
      <RoomObject id="floor" position={[0, -0.1, 0]}
        body={{ motion: "static", shape: { kind: "box", halfExtents: [3, 0.1, 3] } }} navigation="support">
        <mesh receiveShadow><boxGeometry args={[6, 0.2, 6]} /><meshStandardMaterial color="#c3b8a4" /></mesh>
      </RoomObject>
      <RoomObject id="box" position={[0, 1.5, 0]}
        body={{ motion: "dynamic", shape: { kind: "box", halfExtents: [0.5, 0.5, 0.5] } }}>
        <mesh castShadow receiveShadow onClick={() => setSelected(!selected)}>
          <boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={selected ? "#e3ad48" : color} />
        </mesh>
      </RoomObject>
    </>;
  },
} satisfies R3FRoomModule;

export default room;
`;
}

function threeTemplate(id, label) {
  return `import { HemisphereLight, DirectionalLight, MeshStandardMaterial } from "three";
import { box, buildAuthoredRoom, type RoomModule } from "@yweb/room/authoring";

const room = {
  id: ${JSON.stringify(id)},
  label: ${JSON.stringify(label)},
  build(options = {}) {
    return buildAuthoredRoom({
      id: ${JSON.stringify(id)}, revision: "1",
      camera: { orbit: [6, 5, 6], target: [0, 0.8, 0] },
      build(ctx) {
        const color = typeof options.parameters?.color === "string" ? options.parameters.color : "#b86f45";
        const floor = ctx.resources.track(new MeshStandardMaterial({ color: "#c3b8a4" }));
        const wood = ctx.resources.track(new MeshStandardMaterial({ color }));
        ctx.register("floor", box([6, 0.2, 6], [0, -0.1, 0], floor), {
          body: { motion: "static", shape: { kind: "box", halfExtents: [3, 0.1, 3] } }, navigation: "support",
        });
        ctx.register("box", box([1, 1, 1], [0, 1.5, 0], wood), {
          body: { motion: "dynamic", shape: { kind: "box", halfExtents: [0.5, 0.5, 0.5] } },
        });
        ctx.lights.add(new HemisphereLight("#ffffff", "#5b6470", 2));
        const sun = new DirectionalLight("#ffffff", 3); sun.position.set(4, 7, 3); sun.castShadow = true;
        ctx.lights.add(sun);
      },
    }, options);
  },
} satisfies RoomModule;

export default room;
`;
}
