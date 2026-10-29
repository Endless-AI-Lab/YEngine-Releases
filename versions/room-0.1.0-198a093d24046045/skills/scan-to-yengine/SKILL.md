---
name: scan-to-yengine
description: Rebuild editable YEngine rooms from iPhone House Capture exports, RoomPlan JSON, or GLB/glTF scans. Use for scan-based reconstruction and photo-guided refinement in standalone Room projects.
---

# Scan to YEngine

Use captured geometry as measurement evidence and posed photos as visual evidence. Conversion
produces a measured baseline, not a finished reconstruction. By default, reproduce the main visible
objects' count, placement, orientation, silhouette, construction, material scale and characteristic
graphics at the intended viewing distance. Use a coarse target when the user asks for one; record
missing evidence without inventing details or silently treating significant errors as acceptable.

## Inputs and project

Read [house-capture.md](references/house-capture.md) for iPhone exports. Preserve serialized
`house-project/*` and `house-capture/*` identifiers and file layouts.

- `house.json`: use `room tool house_to_rooms -- <house> -o <new-output>` to select active scans
  and resolve placement. Separate sessions do not necessarily share a world frame.
- A session/shared-room bundle with `manifest.json`: use `room tool bundle_to_room -- <bundle> -o <room.json>`. Preserve original room indices; a single-room export need not be index zero.
- GLB/glTF: use `room tool measure_scan -- <scan.glb> --out <measurements>`. Preserve originals
  and texture coordinates. Raw RoomPlan JSON supplies bounds, not necessarily photos or depth.

Use meters, +Y up and floor zero. Retain session-to-room and room-to-house transforms and apply
them consistently to geometry, photo poses, lights and reference layers. Room names do not prove
session alignment.

Follow the [project guide](references/project-layout.md) to create an independent project with
the selected complete release's `install.mjs`. Keep its vendored toolchain and matching skills.
Edit model source, project inputs and declared assets; the SDK, CLI and viewer remain fixed.
R3F is the default; the guide also covers Three. Here `room` means the installed CLI (`npx --no-install room` for npm, `pnpm exec room` for pnpm), run from the project or with `--project`.

Keep personal captures and generated comparisons in ignored `output/room/`. Use `room doctor`
and the guide's browser/Python setup for the tools needed. Consult the relevant [tool entry](references/tools.md)
before conversion, measurement, photo selection, reconstruction, light placement or texture work.
Production tools ship in the CLI; model projects must not depend on YWeb source paths.

## Reconstruction loop

1. **Establish evidence and inventory.** Measure the shell, openings, ceiling changes and major
   objects. Use orthographic scan views and multiple photos. Start a project-specific
   [brief](assets/BRIEF.example.md) with stable IDs, measurements versus assumptions, interaction
   scope and representative cameras. RoomPlan boxes are bounds, not finished furniture.
2. **Delegate independent areas.** For complex reconstruction with multiple independently
   editable areas or object groups, spawn subagents and assign separate files when the tools are
   available and the user has not requested single-agent work. The lead owns shared measurements,
   shell, integration and visual review. Use the [division and review workflow](references/advanced-modeling.md#delegate-independent-areas).
   Simple objects, unavailable delegation tools and user-requested single-agent work use the same
   refinement and acceptance loop without delegation.
3. **Model and refine each object.** Read the relevant [authoring contract](references/room-authoring.md)
   before code, [modeling recipes](references/modeling.md) for the needed shapes/materials/lights,
   and the [per-object loop](references/advanced-modeling.md#refine-one-object-at-a-time).
   Reuse construction helpers while verifying each real object's dimensions, pose and accessories.
   Implement custom geometry under the model project's `src/` when needed. Visual meshes and
   simplified colliders share measurements, not necessarily topology.
4. **Compare and return specific corrections.** Inspect matched-camera images, record the largest
   discrepancies, correct them and recapture. The lead reviews subagents' actual images and requests
   further refinement when significant errors remain; a completion message is not visual evidence.
   Recheck behavior below at the start of every feedback pass.
5. **Integrate and accept.** Check the assembled room and alternate views, then complete the
   independent visual and requested mechanism/physics checks below on the final successful build.

## Recheck behavior on every refinement

Classify parts before modeling and whenever feedback or new photos reveal a moving part:

| Evidence and requested behavior | Action |
| --- | --- |
| Parts always move together, or only appearance/ordinary collision is requested with no prior mechanism requirement | Use ordinary RoomObject authoring; a visible hinge alone does not request opening interaction. |
| A hinged part is within the user's requested articulated-interaction scope | Invoke **yengine-mechanisms** to create or refine a real joint and its bodies. Apply the same routing to requested sliders and other constrained motion. |
| An existing mechanism's moving parts or surroundings change | Keep stable IDs and use yengine-mechanisms to check affected frames, colliders, motion and clearance. |
| Parts are freely separable | Create separate objects; do not invent a joint. |
| Motion type or essential deformation is uncertain | Record uncertainty; clarify when that choice is needed, rather than inventing a mechanism or unaccepted rigid approximation. |

An appearance-only refinement preserves previously authorized mechanisms and interactions;
recheck only the results affected by the edit.

A room-wide request for hinge interaction covers newly discovered hinged parts within that
reconstruction scope. A request naming one object does not authorize adding interaction elsewhere.
One owner handles an object's appearance and mechanism; do not give concurrent agents the same
assembly files. Provide measured dimensions and assumptions, reference photos, stable object/part
IDs, local-to-room transforms, support and moving parts, intended freedoms, initial pose, limits
and surrounding clearance to the mechanism workflow. Keep room placement and scan evidence here.

Ordinary Hinge/Slider work loads that skill's authoring and validation references; manual dragging
also loads direct-interaction. Load control bindings only for physical button/knob linkage.
Changing thickness, pivots, body origins, placement or nearby geometry requires checking affected
joint frames and collisions, rebuilding under the existing contract, and retesting full travel in
the room. Pure material changes need the relevant visual comparison, not an unrelated dynamics run.
Independent rotation animation is not a substitute for a requested mechanism.

## Comparison and completion

Prepare upright photos in converted-array order with `prepare_photos`; preserve poses and intrinsics.

```sh
room capture --room my-room --view top --output output/room/my-room/top
room compare --room my-room --view n --output output/room/my-room/north
room compare-photo --room my-room --converted-room output/room/my-room/room.json --photos 0,13,26 --photo-dir output/room/my-room/photos --output output/room/my-room/photos-compare
```

These tools capture evidence; they do not score similarity. Preserve full images and framing,
including empty scan regions. Orthographic measurements use the captured camera matrices and
viewport. Record concrete discrepancies and before/after evidence in the brief. Significant,
evidence-backed omissions, misplacements or construction errors block visual acceptance. Distinguish
unresolved work, insufficient evidence and approximations actually accepted by the user; merely
calling an error "approximate" does not resolve it.

Record visual, mechanism and physics results separately using the existing reports and brief.
For requested mechanisms, inspect closed/initial, intermediate and open/endpoint views, including
interiors and support; validate requested physical reachability, collision and dragging in the room.
Functional assertions and "images inspected" do not by themselves establish visual accuracy.
Preserve visual quality during batching/instancing within registered object boundaries and compare
before/after full-quality images.

Default-export an R3F module (or Three `build()` module), declare its entry in `room.project.json`,
and follow the authoring guide's registration, readiness and rebuild contracts. Run type checking
and `room build`; inspect the static site over HTTP, its intended deployment subpath and browser
errors. Use evidence from the current successful build, never stale captures after a compile failure.
Keep optional reference layers and poses; missing references report `reference-unavailable`.
Explain measured, modeled and uncertain details. House assembly uses validated placements.

Retain the [upstream MIT notice](UPSTREAM-LICENSE). Released skill documents and CLI tools carry
their respective provenance; upstream notices do not assign a blanket license to first-party
additions. Upstream sources and the optional office example are not model-project dependencies.
