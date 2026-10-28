# YEngine Room Toolchain

This complete release includes the Room SDK, CLI, prebuilt Viewer, project templates
and matching authoring skills. Node.js 22.13 or newer and npm or pnpm are required.

## Create an editable project

From the directory where you keep your projects, replace `/path/to/room-release`
with this release directory and run:

```sh
node /path/to/room-release/install.mjs ./my-room
cd my-room
npm run typecheck
npm run dev
```

Choose a project location outside the release directory. The installer verifies
the package and skill checksums, generates the project, copies this release into
`vendor/yweb/<releaseId>/` and installs dependencies and both skills in one pass.
`room.toolchain.json` records the selected release and managed skill files.

Templates are `r3f` (default), `three`, `mechanisms`, and `mechanism-controls`.
For example:

```sh
node /path/to/room-release/install.mjs ./my-door --template mechanisms --manager pnpm
```

Use `--no-install` to create/configure without installing dependencies,
`--install-only` to add the toolchain to an existing application without generating
a model, or `--configure-only` to prepare local dependency configuration. If package
installation fails, generated files remain and the error provides a retry command.

## Work in the project

Stop the development server before building the static site:

```sh
npm run build
npx --no-install room doctor
```

Serve `dist/` over HTTP. Edit the project's model source, manifest, scenarios and
declared assets. The installed CLI supplies the Viewer and production tools;
model changes do not require rebuilding the toolchain.

Run `npx --no-install room setup browser` for browser captures and scenarios.
Python tools require `uv` and `npx --no-install room setup python`; use
`npx --no-install room setup reconstruction` for tools needing Open3D. Third-party packages and
shared browser/Python caches may require network access. Viewing and building do
not require Python.

## Move or update a project

Keep `vendor/yweb/`, `room.toolchain.json`, the package manifest and lockfile with
the project. Local package references point inside that vendor directory, allowing
the project to be moved and reinstalled without its original release directory.
From an installed project, `npx --no-install room init ../another-room` creates a
new independent project from the same recorded release.

To update an existing project, run the new release's `install.mjs` against it.
Models, assets, custom scripts, unrelated dependencies and additional skill files
are retained. Modified or deleted managed skill files and unmanaged same-name
skills cause a conflict before writes. Explicit `--replace-skills` backs up
conflicting content to `.room-toolchain-backups/` before replacing managed files.
`room init` is for creating projects and refuses an existing model.

## Distribution and notices

The complete archive contains all YEngine package archives. A Git checkout of the
release manifests alone does not; missing toolchain files must be obtained from
the matching complete archive. YEngine packages are installed from the included
archives; third-party packages still use the configured registry or cache.

Keep the included license notices and provenance with their components. Existing
upstream notices do not add a blanket license to first-party code or user assets.
Room modules run as JavaScript; use projects you trust.
