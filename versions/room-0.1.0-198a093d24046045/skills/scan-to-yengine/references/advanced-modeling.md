# Complex room modeling and review

Use this workflow for area-based reconstruction and per-object refinement. Paths belong to the
external Room project; the installed SDK and viewer stay fixed. Read the relevant
[authoring contract](room-authoring.md) and [modeling recipe](modeling.md) as needed.

- [Organize evidence and objects](#organize-areas-and-objects)
- [Delegate independent areas](#delegate-independent-areas)
- [Refine one object at a time](#refine-one-object-at-a-time)
- [Review and integrate the room](#review-and-integrate-the-room)
- Optional: [house alignment](#multiple-rooms-or-a-whole-house-optional),
  [physics](#add-and-verify-physics-optional), [performance](#measure-and-optimize-model-performance),
  [Three loading and filters](#three-loading-and-filters-optional).

## Organize areas and objects

Measure the shell and major objects before detailing. In the shared
[brief](../assets/BRIEF.example.md), record the room frame, walls/openings/soffits, evidence paths,
measured bounds versus assumptions, stable object IDs, requested interaction scope and representative
photo cameras. Keep shared measurements in one place. Use objects' actual number and placement,
not repeated equipment layouts inferred from a repeated desk or shelf construction.

Split area components from independently editable objects when that helps refinement:

```text
src/
  room.tsx                 Room module and integration
  dimensions.ts            Shared measured dimensions
  parts/workspace.tsx      Workspace assembly
  items/desk.tsx            Desk geometry and materials
  items/chair.tsx           Chair geometry and materials
```

Each independently editable or simulated object has a stable `RoomObject` ID; visual-only objects
can also be registered. Preserve IDs through refinement. When extracting an object, remove its old
geometry and leave a pointer to the replacement. See [registration](room-authoring.md#register-objects-and-organize-parts).

**Before detailing:** shell and large objects agree with measured layout, each object has one
owner, and uncertain measurements are recorded.

<a id="collaborate-on-separate-areas-or-objects-optional"></a>

## Delegate independent areas

For a complex room with multiple independently editable areas or object groups, spawn subagents
and assign those groups when delegation tools are available and the user has not requested one
agent. This workflow explicitly calls for delegation; do not wait for a second user request.
Keep simple objects or unavailable delegation on one agent with the same review loop. Respect
available concurrency; complete remaining groups in further batches rather than dropping detail.

The lead owns shared dimensions, shell, integration and final review. Give each worker:

- Its objects and stable IDs, owned source/asset files, room transforms, measurements and assumptions.
- Reference photos/scan bounds, representative cameras and capture commands, intended viewing
  distance, quality target and requested interaction scope. Do not cap the assignment at a quick pass.
- Separate capture prefixes/directories (`CAP_SESSION`, `CAP_OUT`); see
  [capture isolation](project-layout.md#build-identity-services-and-page-isolation).
- A return requirement: actual comparison paths/build identity, concrete discrepancies corrected,
  remaining issues with evidence, and separate visual/mechanism/physics results.

One worker owns both the visual and mechanical parts of an object and loads yengine-mechanisms
when required. Do not assign concurrent writers to the same assembly. Workers report shared-file
changes to the lead. The lead inspects the returned images, requests targeted corrections when
significant errors remain, then integrates and checks the room. Reassign ownership explicitly
if a group must be split further; a successful build or worker's completion statement is not a
substitute for review.

## Refine one object at a time

Use this loop until the object meets the evidence-based quality target. Resolve missing shape
and wrong placement before tuning whole-room lighting to compensate.

1. **Recheck evidence and behavior.** Inspect useful photo angles and scan bounds, including new
   feedback. Confirm count, dimensions, pose and distinctive accessories; label estimates. Apply
   [behavior routing](../SKILL.md#recheck-behavior-on-every-refinement) on every pass. Newly discovered
   hinged parts within the user's interaction scope must use yengine-mechanisms, even if the first
   pass treated them as static. Keep object-specific requests object-specific.
2. **Build silhouette and construction.** Add layers, thickness, edge profiles, hardware, upholstery
   folds and seams. Use primitives as construction components; use lathe, beveled extrusion or
   tubes along traced curves when needed. Reuse construction helpers, not unverified symmetrical
   arrangements. Match recognizable accessories and clutter individually when evidence permits.
   Share measured parameters between visual geometry and collision proxies without requiring the
   detailed visible mesh to use the proxy's topology.
3. **Match materials and graphics.** Use rectified source imagery for visible labels/screens and
   appropriate PBR maps for surfaces (`room tool fetch_textures`). Check texture scale from alternate
   views. Remove baked shadows/seam bands from repeating fabric crops and avoid projecting a whole
   object's photo onto unrelated geometry. Keep metal, plastic, cloth and wood distinct in roughness;
   retain subtle surface variation rather than exaggerated noise.
4. **Update affected mechanisms.** The object's owner supplies measured/assumed dimensions, photos,
   stable IDs, transforms, support/moving parts, freedoms, initial pose, limits and clearance to
   yengine-mechanisms. Changes to thickness, pivots, origins, placement or neighboring geometry need
   affected frames/colliders and full travel checked on the rebuilt assembly in the room. Compare
   closed/initial, intermediate and open/endpoint appearance, including interiors and supports.
   Pure material changes require related visual checks, not an unrelated physics rerun.
5. **Compare and correct.** Capture with a matched photo camera, identify the largest visible
   discrepancy and revise. Recapture that camera and another informative angle after geometry or
   texture changes. [Comparison commands](project-layout.md#captures-and-photo-comparisons) produce
   evidence; they do not score similarity. Preserve full framing.

Record specific findings such as "chair back too wide in side view" or "device faces the wrong
way", the change, and before/after image paths. Keep findings as **pending**, **fixed**,
**insufficient evidence**, or **user-accepted approximation** with their reason. Significant
evidence-backed count, placement, silhouette, construction or graphics errors remain pending and
block visual acceptance; labeling them "approximate" does not close them. Missing evidence does
not justify inventing a detail or claiming it was verified.

**Before moving on:** the object holds up at the intended viewing distance and available angles;
requested articulation is a real mechanism, and its affected visual and motion checks pass.

## Review and integrate the room

1. Search part/item files for duplicate objects, shell overlaps and repeated IDs. Verify each
   object's placement, scale and shared boundaries in the assembled room and alternate views.
2. Recheck mechanism travel against walls and neighboring objects. A mechanism working in isolation
   does not prove its room clearance. Inspect closed, intermediate and open construction, then run
   the requested dynamics and direct-interaction checks through yengine-mechanisms.
3. Tune lighting against photos: neutral hemisphere ground color, scene exposure and bloom that
   lights intended emissive faces without making ordinary walls glow. Use the
   [lighting recipes](modeling.md#7-lighting-and-rendering); numerical settings depend on the room.
4. Run type checking and `room build`, then inspect current-build captures and the
   [production site](project-layout.md#build-and-deploy). Never use an earlier successful build's
   images after compilation fails.

In the brief, record **visual**, **mechanism**, and **physics** results separately, using existing
CLI reports for functional evidence and comparison images/findings for visual evidence. Mark
unrequested checks not applicable; do not count them as passes. Report build identity and measured,
modeled or uncertain details. All final evidence must describe the same successful build. A passed
scenario or an "images inspected" flag cannot override pending significant visual faults.

## Multiple rooms or a whole house (optional)

Use this section when rooms must share a house coordinate frame.

1. **Validate alignment first.** One capture session shares a frame; independent sessions need
   the active scans and validated placements produced by `room tool house_to_rooms`.
   Follow the [house capture guide](house-capture.md) and preserve the relevant transforms.
   With separate GLBs, align neighboring rooms through the same doorway and matching jambs
   before modeling.
2. **Keep room modules separate.** Place each room under `src/rooms/<name>/`, export its R3F
   module (or optional Three module), and declare the entry in `room.project.json`.
   Select it in the viewer with `?room=<id>` or in commands with `--room <id>`.
3. **Check shared evidence.** Compare door openings, floor heights and furniture centers after
   applying placement. Multiple scans of the same room can supply missing RoomPlan furniture
   bounds once their alignment is verified. Matching room names do not establish alignment.

**Check the assembly:** shared openings and boundaries coincide in the house frame, and geometry,
photo poses, reference layers and lights use the same transforms.

## Add and verify physics (optional)

Use this section only when the requested behavior needs simulation.

Register each independently movable object with its own body: R3F supplies `body` on
`RoomObject`; Three supplies it to `ctx.register`. Body fields and examples are in the
[physics contract](room-authoring.md#physics-and-navigation). Cables, glows and cloth can remain
visual-only.

Choose a shape that preserves the intended contacts and openings:

| Geometry or behavior                            | Shape to consider            |
| ----------------------------------------------- | ---------------------------- |
| A simple box, sphere or capsule is sufficient   | `box`, `sphere` or `capsule` |
| A solid convex object                           | `hull`                       |
| Separate solid meshes with gaps between them    | `compound`                   |
| A single concave mesh or a mesh with an opening | `decompose`                  |

A single hull closes concave gaps. Inspect the prepared shapes rather than judging collision
from the visible mesh. Preparation produces serializable shapes for Jolt; preparation failures
must remain explicit.

```sh
room inspect --room my-room --mode simulation --query "colliders=1"
room step --room my-room --query "colliders=1" --count 120 --capture --output output/room/contact
```

**Check the behavior:** test the intended contact or opening with fixed steps, and keep registered
motion roots separate during batching. Source edits generate a new successful build revision.
Changes to registered structure, body/navigation data or loaded scene resources require an
explicit rebuild/full reload; repeat the check on that build. See
[rebuild boundaries](room-authoring.md#interaction-and-rebuild-boundaries).

## Measure and optimize model performance

Use this section when the target device shows an interaction or rendering problem.
Keep the requested visual acceptance standard throughout optimization.

1. **Establish a baseline.** Use a fresh browser session, the actual viewport and device pixel
   ratio, and repeatable camera movement. Record median and p95 rAF intervals. A small static
   capture is not a navigation benchmark. Check other GPU users before trusting measurements;
   GPU timer queries alone can be misleading on tile-based devices with overlapping passes.
2. **Change one measured cost.** Instance repeated geometry or batch eligible static meshes.
   In Three authoring, `batchStatic` from `@yweb/room/rendering` runs after registration.
   Preserve registered object roots and wall groups as merge boundaries; never merge independent
   bodies. Instancing geometry does not combine light shading work.
3. **Compare materials and lighting.** Transmission can add a scene-rendering pass. For bottles,
   bins and lids, compare an alpha material (`transparent`, low opacity, `depthWrite: false`)
   only when it can match the required appearance. Keep refraction when fidelity needs it.
   Retain sources needed for illumination, shadows and reflections; decorative glow can use
   emissive material plus bloom when matched-camera comparisons show equivalent appearance.
4. **Verify the result.** Repeat the same navigation measurement and compare full-resolution
   stills before and after. Keep a quality rendering path if a cheaper approximation visibly
   changes the result. A runtime frame target does not set an authoring time budget.

### Dense light arrays

Use this subsection when measurement identifies lighting cost in a large array. Fixture
construction examples are in the [lighting recipes](modeling.md#7-lighting-and-rendering).

- Measure fixture geometry and illumination separately. Batching repeated housings reduces
  geometry draw calls; it does not merge Three light objects or their shading work.
- Compare approximations against the full-quality rig at matched cameras. Fewer area lights can
  change local brightness, specular highlights, reflections and occlusion.
- Choose SDK `CurveEmitter.lightSegments` from curvature, lighting footprint and viewing distance;
  `geometrySegments` independently controls the visible shape. Compare
  continuity on nearby surfaces before reducing segments. There is no fixed light count or
  requirement for one light per LED.

**Check before accepting:** the measured improvement survives the intended viewport and camera
movement, and the lighting still matches the references.

### Recognize work that belongs to the host

The [host](room-authoring.md#model-and-host-responsibilities) owns the renderer, controls and
render loop. Idle rendering, invalidation, adaptive resolution, renderer/composer resizing and
visibility-list maintenance belong in a separate host change. Report the measured bottleneck
and reproduction steps when the installed viewer needs that work.

Baked lightmaps or rendering extensions also need separate integration when the current pipeline
does not support them. Track added assets through
[readiness](room-authoring.md#loading-readiness-and-resource-disposal) and use the host's single
renderer. Rendering guards for clearcoat overflow or anisotropy without tangents belong to the
pipeline's material-local handling; model passes must not patch global shader chunks.

> Historical example, not a device budget: the original M1 Max scene at 1400×900 reported roughly
> 7, 15, 40 and 84 ms with 1, 5, 10 and 21 lights. These scene-specific observations do not predict
> another room's cost or prescribe its light count; remeasure on the target device.

## Three loading and filters (optional)

This section applies to the Three template. Default R3F components are composed through JSX;
the query filters below are not automatic R3F component selectors.

For `build(ctx: PartContext)`, context creation and a loader example, use
[Three parts and detail passes](room-authoring.md#parts-and-detail-passes). For larger models:

- Derive name-to-module or async-loader maps from `import.meta.glob` in the room module.
  Exclude helper files whose names start with `_`, and pass incoming `RoomBuildOptions` unchanged.
- Keep room-specific measurements in the room module. Shared `PartContext` supplies walls,
  materials, ceiling height, asset resources, `onWall`, `attachToWall` and `addLight`.
- Let `buildRoomParts` register selected roots as `part:<name>` or `item:<name>`. A returned root
  already registered by its builder retains that ID; register independent subobjects with their
  own stable IDs and never register the same root twice.
- A named part failure stops the build and releases partial resources.

| Query             | Effect in the Three loader                         |
| ----------------- | -------------------------------------------------- |
| `parts=desk`      | Build and register the selected area.              |
| `items=chair`     | Build and register the selected detail item.       |
| `hideItems=chair` | Exclude that item.                                 |
| `alllights=1`     | Include lights marked optional through `addLight`. |

```sh
room capture --room my-room --query "parts=desk&items=chair" --output output/room/desk
```

Construction and registration use the same selection, so inspection and captures describe the
same objects. For optional lights and lights that move with an editable fixture, follow
[Three light attachment](room-authoring.md#adding-three-lights).
