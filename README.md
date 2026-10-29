# YEngine Room Releases

Versioned tools for creating, viewing and testing editable 3D room projects. Each
release contains the Room SDK, CLI, prebuilt Viewer, project templates and the
`scan-to-yengine` and `yengine-mechanisms` skills.

## Get a release

Select a release from [catalog.json](catalog.json). The catalog records the release
ID, package versions and SHA-256 of its complete archive.

Download the matching complete `.tgz` attachment from the
[GitHub Releases page](https://github.com/Endless-AI-Lab/YEngine-Releases/releases/latest)
and extract it. Do not select GitHub's automatically generated Source code archives. The archive contains a `package/` directory with `install.mjs`, `release.json`,
`packages/`, `bootstrap/` and `skills/`.

This Git repository stores version manifests, installation instructions and skills.
Package archives are distributed separately. A Git clone or automatically generated
source ZIP does not contain a complete toolchain, and the installer does not
download the missing YEngine packages automatically.

## Create a project

Use Node.js 22.13 or newer and npm, or pnpm. From your projects directory, replace
`/path/to/room-release` with the extracted release root:

```sh
node /path/to/room-release/install.mjs ./my-room
cd my-room
npm run typecheck
npm run dev
```

The default template uses React Three Fiber. Choose another template with:

| Template             | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `r3f`                | Editable room written in TSX; default           |
| `three`              | Room module using the Three.js API              |
| `mechanisms`         | Door and drawer with pose and physics scenarios |
| `mechanism-controls` | Button and knob controlling articulated parts   |

For example:

```sh
node /path/to/room-release/install.mjs ./my-door --template mechanisms --manager pnpm
```

The installer copies the complete selected release to the project's
`vendor/yweb/<releaseId>/`, installs its packages and matching project skills, and
records `room.toolchain.json`. Keep the vendor directory, receipt, package manifest
and lockfile with your project so it can be moved and reinstalled independently.
Third-party dependencies still use the configured registry or cache.

## Build and test

Run these commands in the created project. Stop the development server before
exporting the static site:

```sh
npm run build
npx --no-install room doctor
```

Serve `dist/` over HTTP to view or deploy the result. Models and declared assets
belong to the project; its prebuilt SDK and Viewer are shared toolchain components.

For screenshots and browser scenarios, run `npx --no-install room setup browser`.
Python conversion tools additionally require `uv` and
`npx --no-install room setup python`; Open3D tools use
`npx --no-install room setup reconstruction`.
Ordinary viewing and building do not require Python. These environments use shared
system caches and may need network access.

## Update an existing project

Run the new version's `install.mjs` against the existing project directory. Models,
assets, custom scripts, unrelated dependencies and additional skill files are
preserved. Edited or deleted managed skill files and unmanaged same-name skills
cause a conflict before project changes. Explicit `--replace-skills` backs up
conflicting content to `.room-toolchain-backups/` before replacing managed files.

Release IDs identify delivered content. Projects keep their selected release until
explicitly updated. Room modules execute JavaScript; use projects you trust.

## Notices

Included packages and skills retain their existing license notices and provenance.
Those notices apply to their respective components and do not grant a blanket
license to first-party code, user models or private assets. Upstream demonstration
rooms, photographs and scans are not included in the general toolchain.
