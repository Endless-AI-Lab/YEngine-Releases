# Independent Room project guide

Use this guide to create, run, build and inspect an external Room project. The model workspace
uses installed release packages and the fixed Room Viewer; it needs no YWeb checkout or
upstream source. For model code, read the [room authoring guide](room-authoring.md).

## Project layout and edit boundaries

- `room.project.json`: versioned project/room IDs, source entries, parameters, declared state and asset references.
- `src/room.tsx`: default R3F module; optional `src/room.ts` is the Three `build()` module.
- `src/parts/`, `src/items/`, `src/dimensions.ts`: agent-editable measured geometry and helpers.
- `assets/`: publishable files explicitly referenced by the manifest or imported by the module.
- `node_modules/@yweb/room`, `room-react`, `room-cli`: installed release SDK, React adapter and CLI with fixed viewer/tools.
- `vendor/yweb/<releaseId>/`: the project's verified local toolchain release, including package archives, bootstrap and matching skills.
- `room.toolchain.json`: the selected local release and managed skill-file receipt; keep it with the project.
- `.agents/skills/scan-to-yengine/` and `yengine-mechanisms/`: installed matching instructions, references and templates.
- `.room/`: disposable local compilation output; `dist/`: deployable static output.
- `output/room/`: ignored personal inputs, converted data and evidence.

Edit model source, project inputs and explicitly declared assets. SDK, CLI, shared dependencies
and viewer stay fixed; new geometry does not require rebuilding them. Keep private captures and
comparison evidence ignored, and copy assets into publishable output only when appropriate.

Production tools ship in the installed CLI's `tools/` and run through `room tool`.
Project commands use the model's own manifest, parameters and declared assets.
Use the supplied project templates as starting points and replace their sample dimensions
with the room's measurements; the Viewer does not supply default room geometry.

## Create a project with dependencies installed

Creation generates the model source and configuration, then installs runtime and development
dependencies, including TypeScript. Use the Node.js version supported by the chosen Room
release and have npm (the default) or pnpm available. Select a complete release and use its
version-specific installer below.

### From a local Room release

Keep the supplied tool release and your model in separate directories. In this example,
`./room-release` contains `install.mjs`, `release.json` and `packages/*.tgz`, and `./my-room`
is a new model directory. Run this single creation command from their parent directory:

```sh
node ./room-release/install.mjs ./my-room
```

The command verifies and copies the complete release into the project's own
`vendor/yweb/<releaseId>/`, creates the model files, configures local `@yweb/*` packages,
installs dependencies and copies its two matching skills into `.agents/skills/` in one pass.
No separate `room init` or second install is needed. The installer checks archive and skill
file checksums and handles indirect local dependencies through package-manager `overrides`
automatically. Third-party packages may still need registry access.

Keep the model outside the supplied release directory. Keep `vendor/yweb/`,
`room.toolchain.json`, the package manifest and lockfile with the editable project. Local
package references use the project-owned archives, so moving the project or removing the
original release does not require a YWeb checkout for dependency reinstallation.

An installed CLI can select a local release with
`room init my-room --release /path/to/room-release`. Run `room init ../next-room` from
an existing local-release project to reuse its recorded release; each created project
receives its own vendor copy.

### Creation options and existing projects

The installer accepts `--template three` for a Three module (R3F is the default),
`--manager pnpm` for pnpm, and `--no-install` to generate/configure without installing.
If installation fails, generated files are kept and the error gives a command to retry.

The local installer updates dependencies in an existing Room project without overwriting model
source or custom scripts. For an existing non-Room application, `--install-only` adds the toolchain
without scaffolding; `--configure-only` prepares local dependency configuration without running the package manager.
`room init` refuses to overwrite an already initialized model.

Local skill upgrades update unchanged managed files and preserve extra custom files. An edited
official file or an unmanaged same-name skill fails preflight before project changes. Resolve
the reported conflict, or use explicit `--replace-skills` to back up conflicting content before
replacement. The installer prints the backup location. Do not edit installed SDK/CLI/Viewer
files to work around a version mismatch. Check the selected release and skill state with
`room doctor`.

The local toolchain carries English skills and their existing notices. Keep the upstream
notices and provenance with delivered content; they apply to their respective components
and do not assign a blanket license to first-party additions. Local vendoring does
not imply fully offline installation: third-party packages and explicit browser/Python setup
can still download dependencies.

## Project manifest

`room.project.json` declares the project identity, room entries, JSON inputs and publishable
asset names. For example:

```json
{
  "schemaVersion": 1,
  "id": "my-project",
  "defaultRoom": "my-room",
  "rooms": [
    {
      "id": "my-room",
      "kind": "r3f",
      "entry": "src/room.tsx",
      "parameters": { "floorColor": "#c7b799" },
      "state": {}
    }
  ],
  "assets": { "fabric": "assets/fabric.jpg" }
}
```

- `schemaVersion` is `1`. The top-level `id` identifies the whole project.
- Each `rooms[].id` identifies one room and corresponds to the model module's `id`. A project
  can contain multiple rooms; `defaultRoom` selects a room ID.
- `kind` selects `"r3f"` or `"three"`. `entry` points to that room's default-exported module.
- `parameters` and `state` are JSON inputs passed to the R3F component or Three build options.
- `assets` maps names such as `fabric` to files. Entry and asset paths are relative to the project.

For component code, asset resolution and the distinction between declared state and React
component state, continue with the [room authoring guide](room-authoring.md).

## Development preview and tool environments

Run from the generated model directory:

```sh
cd my-room
npm run dev
# After stopping the development server:
npm run typecheck
npm run build
```

With pnpm, use `pnpm dev`, `pnpm typecheck` and `pnpm build`. In these guides, `room` abbreviates
the installed CLI: use `npx --no-install room` in an npm project or `pnpm exec room` in a pnpm
project. `--project <path>` selects a project when calling the CLI from another directory.

`room dev` normally serves `http://127.0.0.1:5189`. It builds only user modules and reuses the
fixed viewer graph. Every successful build produces a revision and triggers a full-page reload,
restoring project parameters and declared state; temporary React state resets. Compilation
failure is visible and causes automation to fail instead of capturing an older build.

Use `room doctor` to inspect installation, project and cache paths. Install additional tool
environments only for the work that needs them:

| Command                     | Used for                                  |
| --------------------------- | ----------------------------------------- |
| `room setup browser`        | Automated captures and browser commands.  |
| `room setup python`         | Python tools and photo comparisons.       |
| `room setup reconstruction` | Reconstruction/probing, including Open3D. |
| `room setup all`            | The browser and all Python extras.        |

The browser and locked Python 3.12 environments live in a writable cache; `ROOM_CACHE_DIR`
overrides its location. Ordinary viewing and building do not require Python or these extra
tool installations.

Modeling tools run through `room tool <name> -- <arguments>`. The [tool reference](tools.md)
provides purposes, inputs, outputs and command examples for all production tools.
`measure_scan` and `photo-camera` use Node.js; the other modeling tools use Python.
Open3D is needed only for `reconstruct_bundle` and `mesh_probe`.

## Build and deploy

`room build` writes the fixed viewer, shared import map, user modules, declared assets, Worker
and WASM to `dist/`. Model changes do not rebuild fixed viewer files.

Serve `dist/` over HTTP; `file://` is not supported. Assets and imports use relative paths, so
deployment under `/models/my-room/` works as well as deployment at the domain root. The generated
entry page discovers its manifest automatically; `?project=./room.project.json` selects it
explicitly. Verify the intended deployment subpath and check browser errors.

## Inspection and automation

### Captures and photo comparisons

```sh
room inspect --room my-room
room capture --room my-room --view top --output output/room/top
room capture --room my-room --view up --output output/room/ceiling
room capture --room my-room --query "parts=seating&items=lamp" --output output/room/seating
room compare --room my-room --view n --output output/room/north
room compare-photo --room my-room --converted-room output/room/converted/my-room.json --photos 0,5,13 --photo-dir output/room/photos/my-room --output output/room/photo-comparison
room tool ortho -- px output/room/top.png --metadata output/room/top.json 300 200
room tool ortho -- sample output/room/top.png --metadata output/room/top.json fabric=-1,0,-1,0
```

The `parts/items/hideItems` filters use the Three part loader described in the
[room authoring guide](room-authoring.md); they are not automatic R3F component selectors.

Capture options include `--view perspective|top|up|n|s|e|w`, `--width/--height`, `--ppm`,
`--cam/--look/--up`, `--fov`, `--src model|scan` and `--cut`. The upward view starts inside the
room at Y=1 m; `--cut` selects another starting height and removes geometry below it.
Other views retain geometry below the specified horizontal cut.

`--output` is a basename: the PNG and JSON record exact camera matrices, viewport, bounds,
project ID, build revision and simulation tick. `compare --reference before.png --camera before.json`
reproduces a saved calibrated camera. Single-photo comparison accepts `--reference upright.jpg
--camera camera.json`; use `room tool photo-camera` to derive that camera from converted photo
metadata. `--synthetic` labels test imagery explicitly. Neither comparison tool scores accuracy.

### Build identity, services and page isolation

Use `--revision <revision>` when an automated operation must target an exact build. Capture
commands reuse a service only after checking project identity; a different service/project on
the chosen port is an error. They stop only a service they started.

`CAP_URL` selects an existing server; `--no-start` requires one. `CAP_OUT`, `CAP_QUERY` and
`CAP_SESSION` provide output directory, query and filename-prefix defaults. `PHOTO_DIR` supplies
the upright image directory for photo comparisons. Windows automation selects ANGLE D3D11;
`ROOM_ANGLE` can override it for diagnostics.

Every command opens a fresh page. `step` and `reset` act on that page; `--capture` saves its
final state. These commands do not modify another editor tab.

## Optional physics checks

For body shapes and navigation declarations, read the [room authoring guide](room-authoring.md).
When physics is requested, inspect the prepared collision shapes and test the intended contact
or opening with fixed steps:

```sh
room inspect --room my-room --mode simulation --query "colliders=1"
room step --room my-room --query "colliders=1" --count 120 --capture --output output/room/contact
room reset --room my-room --capture --output output/room/reset
```

Finish model edits with type checking and `room build` as shown above. A successful build or
synthetic capture does not establish reconstruction accuracy; inspect the visual evidence too.
