# Modeling reference

How the shared runtime and room modules are organized, the conventions it relies
on, and the mistakes that cost time the first time around. Read the section you need.

Release boundary: use an external `room init` project (R3F by default), installed `@yweb/room`
helpers and `room tool` commands. See the [project guide](project-layout.md) for setup and configuration. Geometry recipes
below apply to both JSX components and the optional Three `build()` template. Names such as
`dimensions.ts` and `shell.ts` refer to the user's `src/`, not SDK implementation files.
Runtime, viewer and iPhone capture app are context and fixed tooling, not agent-editable model code.

## Contents

1. Room coordinates
2. Walls as data (`WallDef`)
3. Profile sweeps (moldings, casings, crown, tray ceilings)
4. Wall-mounted things (`onWall`)
5. Furniture recipes
6. Materials and textures
7. [Lighting and rendering](#7-lighting-and-rendering)
   - [Fixtures and straight strips](#fixtures-and-straight-strips)
   - [Grille lights and regular grids](#grille-lights-and-regular-grids)
   - [Curved strips](#curved-strips)
8. Inspection views
9. Pitfalls

## 1. Room coordinates

Floor at y = 0, meters, +y up; centering on x/z is convenient but optional; −z is whatever wall you call "north".
The scan is moved into this frame with `SCAN_OFFSET` in `dimensions.ts` (negated center and
floor height from `measure_scan.mjs`). If the wall azimuth isn't ~0°, rotate the scan by the
negative angle (`rotY`) when that simplifies measurements. Wall-local helpers also support non-axis-aligned walls. Apply the same transform to model, reference and camera poses.

## 2. Walls as data

`shell.ts` holds one `WallDef` per wall: `origin` (interior face, left end, at the floor),
`u` (along the wall, left → right _as seen from inside the room_), `n` (normal into the room),
`length`, measured `height`, `thickness`, `openings`, `panels`, `baseboardGaps`. Keep `u × up = n`. For an
axis-aligned room:

| wall  | origin          | u   | n   | u coordinate |
| ----- | --------------- | --- | --- | ------------ |
| north | (−W/2, 0, −D/2) | +x  | +z  | x + W/2      |
| east  | (+W/2, 0, −D/2) | +z  | −x  | z + D/2      |
| south | (+W/2, 0, +D/2) | −x  | −z  | W/2 − x      |
| west  | (−W/2, 0, +D/2) | −z  | +x  | D/2 − z      |

Measure in world coordinates from the elevations, then convert to u with this table. Openings:

- `rect` with `v0 = 0` (doorways, fireboxes) becomes a **notch in the outline**. Holes that touch
  the shape's edge break triangulation.
- `rect` above the floor and `arch` (semicircular head, radius = half width, `spring` = where the
  arc starts) become holes.
- Floor-level openings remove the baseboard across their span automatically. `casing: true` adds door casing and extends that gap around its trim; `baseboardGaps` supplies additional explicit gaps.

The slab is an `ExtrudeGeometry` with material array `[wall, trim]`. Group 1 (sides) covers the
jambs/reveals, so openings get trim-colored returns for free. Extend the slab 0.3 m past both ends
so corners overlap.

Crown and baseboard are straight runs per wall that overlap in the corners. Two inside-corner
extrusions that cross read as a proper miter, and it keeps each wall's trim in that wall's group.

## 3. Profile sweeps

`sweep(profile, path, planeNormal, { closed, caps })` extrudes a 2D profile along a polyline
with mitered corners. Profile points are `[s, t]`: **s** = offset to the _left_ of travel
(`planeNormal × direction`), **t** = offset along `planeNormal`. So:

- **Panel molding on a wall**: path = rectangle BL → BR → TR → TL in wall coordinates, plane
  normal = `n`. The left side is inward, so the profile grows into the panel.
- **Casing**: path up the left jamb, across the head, down the right jamb; the left side is away
  from the opening.
- **Crown / baseboard**: path along the wall toward −u with plane normal = up, so the left side is
  into the room. Crown `t` is negative (hangs down from the ceiling).
- **Tray ceiling**: closed rectangle at the perimeter-ceiling height, ordered so the left side
  points to the tray center, with the profile rising to the tray height.
- Repeat a profile point to make a hard edge (split normals). Use a DoubleSide trim material:
  sweep winding isn't guaranteed and DoubleSide shades back faces correctly.
- A **cove** (hollow curve) has its arc center _away_ from the corner, at (r, −r) for a crown
  profile. With the center at the corner you get a quarter-round bulge instead.

## 4. Wall-mounted things

`onWall(obj, wall, u, v, out)` orients an object so local +x runs along the wall, +y is up and
+z points into the room. Build fixtures (TV, sconces, mirror, painting, fireplace surround) in
that local frame and add them to the wall's group so editing and visibility stay together. Register a separate motion root for independently editable or movable objects.
`frame(width, height, profile)` sweeps a picture/mirror frame around a rectangle.

## 5. Furniture recipes

Choose and combine these modeling methods to match the measured dimensions, reference photos
and requested fidelity:

- **Direct modeling**: compose R3F/Three primitives, extrusions, curves and transforms directly
  in the model code.
- **Helpers and recipes**: call geometry helpers exported by `@yweb/room/authoring`, or adapt
  the procedural recipes below. Choose dimensions, profiles, materials and placement from the
  current object.
- **Custom geometry**: when the shape or detail needs custom construction, implement the
  geometry algorithms or helper functions in the user's external project under `src/`, for
  example `src/geometry/<name>.ts`, and use them from R3F components or Three modules.

The recipes are starting points rather than an exhaustive catalog. A procedural description
below does not necessarily imply an exported SDK function.

- **Upholstery**: `cushion(size, center, radius, material)` (RoundedBoxGeometry + box UVs in meters).
  Sectionals = base + arms + seat cushions with 6 mm gaps + back cushions tilted ~0.12 rad.
- **Pillows**: `pillow([w, h, thickness], material)`, an ellipsoid mapped onto a square with pinched
  sides. Lean against backs: rotation.x ≈ −0.3, and face the camera's likely view, since an
  edge-on pillow reads as a sheet.
- **Throws/blankets**: a PlaneGeometry laid along a CatmullRom curve that follows the cushion
  surfaces (seat → cushion front → top → behind), plus a few low-frequency sine folds.
- **Turned things** (bowls, lamp shades, stools, pedestals): `lathe([[r, y], …], material)`.
- **Bent things** (sconce arms, chair frames): `tube(points, radius, material)`.
- **Organic tops** (live-edge tables): CylinderGeometry with radius wobble from summed sines.
- **Clutter** (toy piles, books): seeded `mulberry32` scatter of primitives in a region, denser
  toward the corner. Don't hand-place 60 objects.
- Place free-standing pieces by footprint from the top view: `place(group, [x, 0, z], rotY)`,
  where rotY turns local +z (the front) to face where the piece faces (`atan2(dx, dz)`).

## 6. Materials and textures

For CC0 sources and complete search, preview and download commands, read [texture tools](tools.md#fetch_textures).

- The scan's colors are darker than the real albedo because the capture lighting is baked in.
  Sample with `room tool ortho -- sample capture.png --metadata capture.json name=h0,h1,v0,v1`. A 1.3–1.4× lift was useful in the example capture; compare against this room's photos rather than applying it as a universal correction.
- Fabrics, carpet and leather: CC0 normal + roughness maps with a _neutralized_ grayscale color
  map (`room tool fetch_textures -- get … :neutral`), tinted by `material.color`. Wood/stone keep their
  color maps. Patterns (plaid, stripes, paintings, rugs) are canvas textures drawn in code.
- UVs: `boxUV(geometry)` projects in meters, so a `repeat` of 3 means 3 tiles per meter on
  every object regardless of size.
- **Preload** every texture before creating materials (`await palette.load()`). Cloning textures whose
  image hasn't loaded spams "Texture marked for update but no image data found".

## 7. Lighting and rendering

For the supported light types, fixture composition and area-light constraints, read the
[authoring contract](room-authoring.md#light-types-and-fixture-composition). The following recipes
cover [straight strips](#fixtures-and-straight-strips), [grilles/grids](#grille-lights-and-regular-grids)
and [curved strips](#curved-strips). Dimensions are in meters; example light strengths and dimensions
illustrate assembly and must be calibrated against the actual room.

### Lighting from the reference

- Put lights where the real fixtures are: SpotLights under pot lights, PointLights inside lamp
  shades and sconces, and a weak HemisphereLight where fill is useful. Make shades emissive.
  Choose intensity, color, cone angle and penumbra from the fixture, room scale and reference photos.
- Set the room's `environment: {center, intensity, mirror?, mirrorAt?}`: after the room is built, capture a CubeCamera at room center → PMREM →
  `scene.environment` (warm bounce light from the room itself), plus a second capture at the
  mirror for its envMap. It works far better than a generic studio environment.
- For a static reconstruction, render shadows once: `shadowMap.autoUpdate = false; needsUpdate = true`.
  Choose shadow-casting lights and their count for the scene, then measure their cost. Use `PCFShadowMap`
  (`PCFSoftShadowMap` was removed in recent three.js).
- `@yweb/room/rendering`: EffectComposer → RenderPass → GTAOPass (radius ~0.35) → OutputPass, with AgX tone mapping.
- Scan materials: `MeshBasicMaterial({ map, toneMapped: false })`. The texture already is the
  final photographed color, and Polycam GLBs have no normals.

### Fixtures and straight strips

- **Panel**: `AreaEmitter` combines a luminous rectangle and area light; add measured housings
  as children and register the entire fixture with one `RoomObject`.
- **Straight strip**: `LinearEmitter` uses `length/width` for a ribbon, or `surface="tube"`
  and `radius` for a tube. Local X follows the strip; local -Z is its emitting direction.
- **Custom appearance**: `surfaceVisible={false}` accepts custom visible meshes;
  `lightEnabled={false}` keeps only the emissive appearance.

```tsx
<RoomObject
  id="cove-strip"
  position={[0, 2.6, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
>
  <LinearEmitter length={2} width={0.03} intensity={8} emissiveIntensity={3} />
</RoomObject>
```

Import these components from `@yweb/room-react`. Three uses
`createAreaEmitter(ctx.resources, options)` / `createLinearEmitter(ctx.resources, options)`,
then attaches and registers the returned group. Full parameters and ownership are in installed
SDK READMEs.

### Grille lights and regular grids

- **Grille**: add measured frame/slat geometry around `AreaEmitter`. Native area lights cast no
  grille shadows; required occlusion follows the [area-light constraints](room-authoring.md#area-light-requirements).
- **Grid**: repeat fixtures at measured centers with stable IDs, one motion root per independently
  movable lamp. Choose dimensions and brightness from this room's references.
- Measure large arrays using [dense-array guidance](advanced-modeling.md#dense-light-arrays).

### Curved strips

- **Path**: pass an immutable `Curve<Vector3>` to `CurveEmitter`; choose ribbon `width` or tube
  `radius`. The SDK supports 3D paths and seam-corrected closed loops.
- **Illumination**: `emissionNormal` sets the initial emitting face; transported frames follow
  the path. `geometrySegments` and `lightSegments` independently control shape and illumination.
  Check nearby surfaces, reflections and corners before reducing light samples.
- **Closed loop**: pass a closed curve and `closed`; endpoint positions/tangents must meet.
  Tube appearance does not imply automatic all-direction illumination.

```tsx
<CurveEmitter
  curve={curve}
  closed
  surface="tube"
  radius={0.015}
  emissionNormal={[0, -1, 0]}
  geometrySegments={64}
  lightSegments={16}
  intensity={8}
  emissiveIntensity={3}
/>
```

Here `curve` comes from measured points; select a suitable initial normal. Values illustrate a
call, not a quality preset. Three uses `createCurveEmitter(ctx.resources, options)`.
Custom fixtures can reuse `sampleEmitterPath`. Async inputs follow the
[readiness rules](room-authoring.md#loading-readiness-and-resource-disposal); structure and collision
edits use the existing rebuild flow.

## 8. Inspection views

Capture perspective, top, up and the four elevations with `room capture`. Use `--cut <height>`
to inspect an interior below its ceiling; capture JSON records the cut plane. `room compare`
loads the model and aligned scan from one camera; `room compare-photo` uses posed source photos.
Inspect alternate views after changing silhouettes, openings or texture scale.

Keep wall-mounted geometry with its wall. A future dollhouse view can hide a wall when
`dot(camera - wallMidpoint, n) < 0`, and the ceiling above wall height. The fixed Room Viewer
uses explicit views and clipping; these checks do not require a walking or overlay interface.

## 9. Pitfalls

- `gltf-transform optimize` **simplifies by default**. Pass `--simplify false` for scans.
- Poly Haven returns 403 to Python's urllib; use curl.
- Vite serves an HTML error page for a module with a broken import. The capture page then never
  resolves `__ROOM_LAB__.ready()`: check the reported build/browser error.
- Floors straddle histogram bins; use the area-weighted mean (the script does).
- Asset names lie: look at a contact sheet (`room tool fetch_textures -- sheet …`).
- Neighbor rooms need a saddle/threshold inside the wall thickness, or you see a black strip in
  every doorway.
- **Outside corners** (L-shaped rooms): extending a slab past its end pokes into the room. Use
  per-end `ext` (0 where the probe point just past the end is inside the floor polygon), and paint
  slab end caps with the wall material (handled by `buildWall`), or they show as white trim columns.
- Don't create materials at module import time (e.g. inside a top-level `WALLS = ...map()`): the
  texture preload has not happened yet. Create the room's palette inside `build()`. Assign materials inside `build()`.
- Furniture attached to a wall (built-ins, shelving with a back panel) must go in that wall's group,
  or its back shows as a phantom wall when the cutaway hides the real one.
- Soffits/bulkheads from RoomPlan: walls under a soffit report the lower height. Model the soffit
  as boxes following those walls (depth from photos, ~0.45 m typical), stepping with wall jogs.

## Authoring helpers

Import geometry and wall helpers from `@yweb/room/authoring`:
`box, boxSpan, mesh, place, cushion, pillow, sweep, frame, lathe, tube, cylinder, sphere,
arc, boxUV, onWall, wallPoint, wallMatrix, buildWall, stabilizeWallOverlaps, mulberry32`.
`sweep` and `frame` return geometry; `cushion/pillow/lathe/tube` take the surface material
and return meshes. Positions, profile dimensions and UV projections use meters.

`buildWall(def, {wall, trim, glass})` uses explicit room materials. Supply measured height;
choose `crown: false` for walls without crown molding, and `ext: [0, 0]` where overlaps
would intrude. The normal and along-wall vectors must be unit, perpendicular vectors.

Build with `buildAuthoredRoom`, then use `ctx.register(id, object)` for each stable object.
Registration preserves nested transforms. Use `createRoomMaterials(ctx.resources)` for
room-owned textures/materials; it has no default office palette or asset downloads.
Read the [room authoring guide](room-authoring.md) for complete module and material examples.
The host calls `createRoomRendering` after the room's resources are ready, and releases its
environment/postprocessing before disposing the room's geometry and textures.
