# Complex room modeling and review

Use this guide after the room's layout and dimensions are established, when the requested
fidelity needs area-based organization, detailed objects or performance work. The main workflow
uses the default R3F project; [Three loading and filters](#three-loading-and-filters-optional)
are an optional route.

All paths belong to the user's external Room project. Edit model source, project inputs and
declared assets. The installed SDK, runtime and viewer stay fixed during a model pass.
For module APIs and host responsibilities, use the [room authoring guide](room-authoring.md);
for geometry, materials and lights, use the [modeling reference](modeling.md). Commands below use
the installed `room` CLI shorthand described in the [project guide](project-layout.md).

Start with the first three sections. Continue to the optional sections when the task needs them:

- [Organize areas and objects](#organize-areas-and-objects)
- [Refine one object at a time](#refine-one-object-at-a-time)
- [Review and integrate the room](#review-and-integrate-the-room)
- [Multiple rooms or a whole house](#multiple-rooms-or-a-whole-house-optional)
- [Add and verify physics](#add-and-verify-physics-optional)
- [Measure and optimize model performance](#measure-and-optimize-model-performance)
- [Collaborate on separate areas or objects](#collaborate-on-separate-areas-or-objects-optional)
- [Three loading and filters](#three-loading-and-filters-optional)

## Organize areas and objects

Split a large room by spatial area, then extract objects that need independent editing or detail.
For a workspace, an area component can compose a desk, chair and lamp:

```text
src/
  room.tsx                 Room module and composition
  dimensions.ts            Shared measured dimensions
  parts/workspace.tsx      Workspace assembly
  items/desk.tsx            Desk geometry and materials
  items/chair.tsx           Chair geometry and materials
  items/lamp.tsx            Lamp geometry and lights
```

Import these JSX components from the room or area component. Each independently editable or
simulated object owns a stable `RoomObject` ID; visual-only objects can also be registered.
Keep IDs unique and preserve them when replacing coarse geometry with a detailed version.
See [object registration](room-authoring.md#register-objects-and-organize-parts).

Record coordinates, walls, openings, soffits, reference photos, measured bounds and unresolved
questions in a shared [brief](../assets/BRIEF.example.md). Keep shared measurements in one place.
When extracting an item from an area file, remove its old geometry and leave a pointer to the
new component so the room contains one copy.

**Check before detailing:** the shell and large objects agree with measured layout, every object
has one owner, and uncertain dimensions are recorded.

## Refine one object at a time

Use this loop for each object whose current detail falls short of the requested fidelity.
For the workspace example, refine the chair's construction before adjusting the whole room's
lighting to compensate for missing shape.

1. **Choose evidence and check dimensions.** Inspect all useful photo angles and the scan bounds.
   Use real product dimensions when the product is identifiable and the dimensions can be
   verified. Mark estimates explicitly.
2. **Build the silhouette and construction.** Add the object's layers, thickness, edge profiles,
   hardware, upholstery folds and seams. Use primitives as construction components; use lathe,
   beveled extrusion or tubes along traced curves when those better match the shape.
   Match recognizable toys, accessories and clutter individually when the references permit.
3. **Match materials and graphics.** Use rectified source images for labels, screens and other
   visible graphics. Use suitable PBR maps for surfaces; `fetch_textures` is available through
   `room tool`. Check texture scale from alternate views. Remove baked shadows and seam bands
   from repeating fabric crops, and avoid stretching a whole-object photo across unrelated
   geometry. Compare roughness so metal, plastic, cloth and wood remain distinct; keep surface
   variation subtle.
4. **Compare and correct.** Capture the object at a matched photo camera, identify the largest
   visible discrepancy and revise it. Recheck another useful angle after changing geometry or
   textures. The [comparison commands](project-layout.md#captures-and-photo-comparisons) capture
   evidence; they do not score similarity.

For example, record "chair back is too wide in the side view" or "fabric repeat is too large,"
then compare again after the fix. Continue until significant discrepancies within the requested
scope are resolved; record limitations caused by missing evidence.

**Check before moving on:** the silhouette, construction, material scale and visible graphics
hold up at the intended viewing distance and from the available reference angles.

## Review and integrate the room

After individual objects are refined, inspect them together:

1. Search part and item files for duplicate objects, overlapping shell geometry and repeated IDs.
2. Check placement, scale, shared boundaries and alternate views in the assembled room.
3. Tune lighting against the photographs. Check hemisphere ground color for unintended ceiling
   tint, exposure for the whole room, and bloom so intended emissive faces glow without making
   ordinary lit walls glow. Numeric settings depend on the scene; use the
   [lighting recipes](modeling.md#7-lighting-and-rendering).
4. Run type checking and `room build`, then review captures from the current successful build.
   Follow the [delivery checks](project-layout.md#build-and-deploy) for the production site.

**Record the result:** keep comparison paths, remaining discrepancies, build identity and which
details are measured, modeled or approximate in the brief. A successful build alone does not
establish reconstruction accuracy.

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

## Collaborate on separate areas or objects (optional)

Split work only when collaboration helps the requested scope and delegation is authorized.
The organization and review steps above also apply when one author does all the work.

- Prepare a shared [brief](../assets/BRIEF.example.md) with coordinates, walls and soffits,
  references, file ownership, render commands, performance targets, the approved visual benchmark
  and a clear completion criterion.
- Assign each collaborator an area or object group with separate files. Keep changes to shared
  dimensions and the room shell with the integrator; report shared-file problems for integration.
- Give captures separate `CAP_SESSION` filename prefixes and `CAP_OUT` directories. Each capture
  command opens a fresh page; see [capture isolation](project-layout.md#build-identity-services-and-page-isolation).
- Review actual renders against representative photos. Split broad assignments further when
  objects need more attention, and continue refinement while significant scoped discrepancies remain.
- Collect comparison paths, changes and unresolved issues from each collaborator, then run the
  [whole-room review](#review-and-integrate-the-room).

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
