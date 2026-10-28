---
name: scan-to-yengine
description: Rebuild editable YEngine rooms from iPhone House Capture exports, RoomPlan JSON, or GLB/glTF scans. Use for scan-based reconstruction and photo-guided refinement in standalone Room projects.
---

# Scan to YEngine

Use captured geometry as measurement evidence and posed photos as visual evidence. Build editable geometry, then compare it against those inputs. Conversion produces a measured baseline; detailed reconstruction requires modeling and visual review.

## Inputs and coordinates

Read [house-capture.md](references/house-capture.md) for iPhone exports. Keep the serialized `house-project/*` and `house-capture/*` format identifiers and file layouts unchanged.

- For `house.json`, use `room tool house_to_rooms -- <house> -o <new-output>` to select active scans and resolve placement. Separate sessions do not necessarily share a world frame.
- For a session or shared-room bundle containing `manifest.json`, use `room tool bundle_to_room -- <bundle> -o <room.json>`. Preserve original room indices; a single-room export need not use index zero.
- For GLB/glTF, use `room tool measure_scan -- <scan.glb> --out <measurements>`. Preserve original files and texture coordinates.
- Raw RoomPlan JSON supplies walls/openings and object bounds; it does not imply that photos or depth are present.

Use meters, +Y up and floor zero. Retain session-to-room and room-to-house transforms. Apply the same transformations to geometry, photo poses, lights and reference layers. Never infer session alignment from matching room names.

## Project setup

Read the [project guide](references/project-layout.md) to create an independent model project from a selected complete release, then configure, run, build and inspect it. Start a new project with that version's `install.mjs`; it vendors the complete release and installs matching project-level skills. Keep `vendor/yweb/` and `room.toolchain.json` with the editable project. R3F is the default; `--template three` selects Three, `--manager pnpm` selects pnpm, and `--no-install` skips dependency installation. Use the [brief](assets/BRIEF.example.md) with the room's own measurements, assets and requested fidelity. Commands below use `room` as shorthand for the installed CLI; in an npm project run `npx --no-install room`, or use `pnpm exec room` in a pnpm project.

Run commands from the external project, or pass `--project <path>`. Agent edits belong in `src/`, `room.project.json` (parameters and declared state), and explicitly declared assets. SDK, CLI, shared dependencies and viewer are fixed release components; new geometry does not require editing or rebuilding them. The model executes ordinary JavaScript, not a security sandbox.

Keep personal captures, converted measurements and comparison images in ignored `output/room/`. Production tools ship inside `@yweb/room-cli`; invoke `room tool`, rather than resolving skill or YWeb source paths. Run `room doctor`, `room setup browser` before captures, and `room setup python` before Python/photo comparison tools; use `room setup reconstruction` only for reconstruction/probing. Browser and locked Python 3.12 environments live in a writable cache. Viewing and building do not require Python. Public room modules do not make their private source captures public.

Before conversion, measurement, photo selection, light placement, reconstruction or texture work, consult the [tool reference](references/tools.md). Choose by purpose and read the relevant entry for inputs, outputs and a complete command example.

## Classify objects before modeling

Classify the requested behavior independently of whether physics will be enabled:

| Object behavior                        | Workflow                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| Parts always move together             | Continue with ordinary RoomObject authoring                                    |
| Parts need constrained relative motion | Load the independent yengine-mechanisms skill                                  |
| Freely separable parts                 | Create separate objects; do not invent a joint                                 |
| Deformation is essential               | Identify the required capability or an explicitly accepted rigid approximation |

When doors, cabinet doors, or drawers are identified in a scan, reconstruct their appearance by default. Use the mechanism authoring workflow when the task requires these parts to open, close, slide, or participate in physical interaction. When routing to yengine-mechanisms, pass measured dimensions and assumptions, reference photos, stable object IDs, local-to-room transforms, desired freedoms and surrounding clearance constraints. Keep room placement and scan evidence in this workflow.

The mechanism skill's basic authoring and validation cover ordinary doors/drawers. Load its direct-interaction reference only for manual dragging; load its control-bindings reference only for physical button/knob linkage. Mechanical constraints do not require a control binding. After integration, revalidate travel against walls and nearby objects.

## Measure, model, compare

Establish the floor, wall planes, openings, ceiling steps and object dimensions before adding detail. Use orthographic scan renders and multiple photos to resolve ambiguous shapes. Record uncertainty rather than inventing measurements.

Before writing model code, read the [room authoring guide](references/room-authoring.md) for R3F/Three modules, object registration, asynchronous readiness, resource ownership and rebuild boundaries. Read [modeling.md](references/modeling.md) for geometry, materials and lighting; read [advanced-modeling.md](references/advanced-modeling.md) for area-based work, detailed objects and performance. Match the user's requested fidelity. For a detailed reconstruction, compare silhouettes, construction, material scale, surface graphics and lighting at the intended viewing distance. RoomPlan boxes are bounds, not finished furniture.

Choose and combine direct R3F/Three modeling, the geometry helpers and recipes in the modeling reference, and custom geometry as the object requires. When existing helpers or recipes cannot express the required shape or detail, implement the needed geometry algorithms or helper functions in the user's external project under `src/` (for example, `src/geometry/`), then call them from the model code.

Prepare upright photos in the converted room's array order with `prepare_photos`. Preserve camera pose and intrinsics; see the format reference for sensor orientation. Use the matched-camera tools:

```sh
room capture --room my-room --view top --output output/room/my-room/top
room compare --room my-room --view n --output output/room/my-room/north
room compare-photo --room my-room --converted-room output/room/my-room/room.json --photos 0,13,26 --photo-dir output/room/my-room/photos --output output/room/my-room/photos-compare
```

These tools capture and stitch comparisons; they do not evaluate similarity. Inspect the results, identify concrete discrepancies, fix the largest, and repeat. Preserve the full image: empty scan regions are evidence and cropping changes framing. Orthographic measurements use the capture's JSON camera matrices and viewport.

Preserve visual quality while optimizing: favor batching and instancing within registered object boundaries. Compare before/after full-quality images. Independently verify functionality and appearance; a build passing does not establish visual accuracy.

## Delivery

Default-export an R3F module (or Three `build()` module) and declare its entry in `room.project.json`. Keep independently editable objects under stable IDs and follow the loading/rebuild contracts in the [room authoring guide](references/room-authoring.md). Use captures from the current successful build; compile failures must not be accepted as old successful captures.

Preserve optional reference layers and photo poses; absent references must report `reference-unavailable`. Run type checking and `room build`; the resulting `dist/` is a static site, including model modules, declared assets, viewer, Worker and WASM. Check it over HTTP, including the intended deployment subpath, useful viewing angles and browser errors. Include matched-camera evidence and explain which details are measured, modeled or approximate. When physics is requested, also inspect prepared collision shapes and test the intended contact or opening with fixed steps. House assembly uses validated placements, not an example floor plan.

Retain the accompanying [upstream MIT notice](UPSTREAM-LICENSE). The released skill includes provenance for the delivered adapted documents; executable-tool provenance ships with the CLI release. These existing upstream notices do not assign a blanket license to first-party additions. Upstream sources and the optional office example are not dependencies of a user's model.
