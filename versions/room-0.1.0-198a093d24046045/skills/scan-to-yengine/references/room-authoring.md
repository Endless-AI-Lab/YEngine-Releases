# Room authoring guide

Use this guide when writing model code in an external Room project. For installation, the
manifest, development commands, deployment and captures, read the
[project guide](project-layout.md). Geometry recipes are in the [modeling reference](modeling.md).

Choose the [R3F](#r3f-model-default) or [Three](#three-model-optional) section for your module.
Both routes use the [lighting design](#lighting-and-rendering), [shared configuration](#shared-configuration),
[loading rules](#loading-readiness-and-resource-disposal) and
[rebuild boundaries](#interaction-and-rebuild-boundaries) below.

## Model and host responsibilities

The model supplies geometry, materials, lights, stable object IDs and optional presentation,
physics and navigation data. The host supplies the canvas, camera, controls, rendering loop and
optional EngineSession. R3F models mount inside the host's single Fiber root; create no Canvas,
renderer or animation loop inside a model.
Model authors choose scene lighting and supported presentation settings; techniques needing new
rendering passes must integrate with the host pipeline.

Room Viewer uses its existing renderer, scene and camera with `@yweb/room/rendering`. It waits for
rendering readiness and calls `render/setCamera/resize/dispose` within the same capture lifecycle.
Presentation settings remain outside headless simulation data. Walk, Layout, Knolling,
model-overlay UI and interactive throwing are separate viewer work.

## R3F model (default)

### Minimal module

`room init` generates `src/room.tsx`. The [R3F reference template](../assets/room-template.tsx)
is an additional modeling example using the same public SDK; its sample dimensions and
parameters need not match the CLI starter.
This example follows that template; replace the fictional measurements and IDs with evidence.

The example lights are for an initial preview. Design the finished scene's lighting from room
scale, openings, fixtures, materials and reference photos; see [lighting design](#lighting-and-rendering).

```tsx
import { RoomObject, type R3FRoomModule } from "@yweb/room-react";

// Preview lights only. Design final lighting from room scale, openings, fixtures,
// materials and reference photos; measure performance after visual validation.
const room = {
  kind: "r3f",
  id: "my-room",
  label: "My room",
  camera: { orbit: [5, 4, 5], target: [0, 0.8, 0] },
  render: { exposure: 1.1 },
  Component: function Room({ parameters }) {
    const color =
      typeof parameters.floorColor === "string"
        ? parameters.floorColor
        : "#c7b799";
    return (
      <>
        <hemisphereLight args={["#ffffff", "#888888", 1]} />
        <directionalLight position={[3, 5, 2]} intensity={2} castShadow />
        <RoomObject
          id="floor"
          position={[0, -0.05, 0]}
          navigation="support"
          body={{
            motion: "static",
            shape: { kind: "box", halfExtents: [2, 0.05, 1.5] },
          }}
        >
          <mesh receiveShadow>
            <boxGeometry args={[4, 0.1, 3]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
        </RoomObject>
      </>
    );
  },
} satisfies R3FRoomModule;

export default room;
```

Default-export an `R3FRoomModule` with `kind: "r3f"`, `id`, `label`, `camera` and `Component`.
The camera supplies `orbit` and `target` triples. Optional presentation fields are `render`,
`environment`, `photos` and `loadReference`. Declare this module's ID, kind and entry in the
[project manifest](project-layout.md#project-manifest).

### Component inputs and room context

The component receives `{ parameters, state }` as JSON inputs. `useRoom()` provides the same
inputs plus loading helpers:

| Member                      | Purpose                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `parameters`                | Model inputs such as dimensions or floor color.                                      |
| `state`                     | Declared scene state supplied by the project.                                        |
| `signal`                    | Abort signal; pass it to custom fetches so replacement or disposal cancels the work. |
| `asset(name)`               | Resolve a declared asset name to its URL.                                            |
| `waitFor(promise, commit?)` | Track custom asynchronous work before model readiness.                               |

Loading rules and component-state limitations are described below.

### Register objects and organize parts

Wrap each independently editable or simulated motion root in `RoomObject`. For example,
`<RoomObject id="desk" body={...} navigation="blocker">` groups the desk's meshes under one
registered object. Ordinary JSX groups, meshes, materials and lights remain editable inside it.
`body` and `navigation` are optional; a visual-only root can also be registered.

IDs must be unique and remain stable across detail passes. Registered roots can be nested;
children retain local transforms, and the SDK records final world positions and orientations
after mounting and loading. Use separate JSX components under `src/parts/` and `src/items/` for
larger models, keeping each independently movable object's registration boundary intact.

## Three model (optional)

### Minimal module and build result

Select `--template three` during creation, or start from the
[Three template](../assets/room-template.ts). Default-export the module and declare
`kind: "three"` with its entry in the project manifest.

Its lights also provide an initial preview; use the shared [lighting design](#lighting-and-rendering)
guidance for the finished scene.

```ts
import { DirectionalLight, HemisphereLight, MeshStandardMaterial } from "three";
import { box, buildAuthoredRoom, type RoomModule } from "@yweb/room/authoring";

// Replace these fictional dimensions and IDs with the inspected room's measurements.
// Preview lights only. Design final lighting from room scale, openings, fixtures,
// materials and reference photos; measure performance after visual validation.
export const myRoom: RoomModule = {
  kind: "three",
  id: "my-room",
  label: "My room",
  build(options) {
    return buildAuthoredRoom(
      {
        id: "my-room",
        revision: "measured-layout-1",
        camera: { orbit: [5, 4, 5], target: [0, 0.8, 0] },
        build(ctx) {
          const material = ctx.resources.track(
            new MeshStandardMaterial({ color: "#c7b799" }),
          );
          ctx.register("floor", box([4, 0.1, 3], [0, -0.05, 0], material));
          ctx.lights.add(new HemisphereLight(0xffffff, 0x888888, 1));
          const key = new DirectionalLight(0xffffff, 2);
          key.position.set(3, 5, 2);
          ctx.lights.add(key);
          return {
            render: { exposure: 1.1 },
            environment: { center: [0, 1, 0], intensity: 0.3 },
          };
        },
      },
      options,
    );
  },
};
export default myRoom;
```

`buildAuthoredRoom` resolves to a `BuiltRoom` with `definition`, `view`, `lights`, `camera`,
`dispose()`, and optional `render`, `environment`, `photos` and `loadReference()`. The host passes
project `parameters`, `state`, `asset(name)` and `signal` in `RoomBuildOptions`; the compiled
project's successful build revision identifies the loaded result. Room Viewer uses the same result
for viewing and captures. Repository data-first `definition/buildView` fixtures remain available.

### Register objects

Call `ctx.register(id, object, { body?, navigation? })` once per independently editable motion
root. Keep IDs unique and stable across detail passes; do not register the same root twice.
Child meshes retain local transforms, and registered roots can be nested. The returned pure
`RoomDefinition` holds IDs, poses and optional body/navigation data; Three objects and materials
remain in `view`.

### Materials and owned resources

The following helpers are for the Three `build(ctx)` callback. Register independently created
geometry, materials and textures with `ctx.resources` before an operation that can fail.
For example, `ctx.resources.track(new MeshStandardMaterial(...))` gives the build ownership.

Declare the following texture names in the manifest's `assets` mapping, then load the palette
inside the build callback:

```ts
import { createRoomMaterials } from "@yweb/room/authoring";

const palette = createRoomMaterials(ctx.resources, {
  textures: {
    fabric: {
      color: ctx.options.asset!("fabric-color"),
      normal: ctx.options.asset!("fabric-normal"),
      roughness: ctx.options.asset!("fabric-roughness"),
    },
  },
});
await palette.load();
const fabric = palette.textured({ set: "fabric", repeat: 3, color: "#c8bda8" });
```

Color maps use sRGB; normal and roughness maps remain linear data. Repeat is per meter.
`palette.solid(parameters)` creates a room-owned material. Procedural patterns are available as
`plaidTexture`, `stripeTexture`, `paintingTexture` and `kilimTexture`; supply this room's colors
and track the result. Three's `buildAuthoredRoom` configuration also accepts
`assets: { baseUrl, resolve? }` for room-specific resource routing. It supplies no default office
texture set.

### Parts and detail passes

A Three part exports `build(ctx: PartContext)` and returns an Object3D. Create its context with
`ctx.createPartContext({ walls, materials, ceiling, insideRoom })`; each wall supplies its
definition and geometry group. With that `partContext`, load selected modules:

```ts
import { buildRoomParts } from "@yweb/room/authoring";

await buildRoomParts(
  partContext,
  {
    parts: { desk: () => import("./parts/desk") },
    items: { chair: () => import("./items/chair") },
  },
  ctx.options,
);
```

For larger rooms, derive name-to-loader maps from `import.meta.glob` in the room module.
Omit helper files beginning with `_` and pass the incoming options through to the loader.
`parts=desk`, `items=chair` and `hideItems=chair` select both the built and registered objects.
Returned roots use `part:desk` or `item:chair` unless the builder already registered that root;
register independently movable subobjects explicitly. A named part failure stops the build and
releases partial resources. Read [advanced modeling](advanced-modeling.md) for detailed objects,
area-based work and performance.

### Adding Three lights

Add lights to `ctx.lights` or use the part context's `addLight`. Use
`addLight(light, { optional: true })` for optional lights; `alllights=1` enables them for comparison.
For a light that moves with an editable lamp, use `addLight(light, { owner: lamp })` with
owner-local coordinates. Attach a spot/directional light's target to that owner too when its aim
must follow the object. Scene lighting choices are covered in the shared
[lighting design](#lighting-and-rendering) guidance.

## Shared configuration

### Asset names and URLs

Declare publishable files in the [project manifest](project-layout.md#project-manifest), for
example `"assets": { "fabric": "assets/fabric.jpg" }`. Resolve them through the host:

| Model | Asset resolver                                                                          |
| ----- | --------------------------------------------------------------------------------------- |
| R3F   | `useRoom().asset("fabric")`                                                             |
| Three | `options.asset("fabric")`, or `ctx.options.asset!("fabric")` inside the build callback. |

The resolver keeps development and deployed URLs consistent, including deployment under
`/models/my-room/`. The model bundler also supports module-relative imports and URLs such as
`new URL("./fabric_diff.jpg", import.meta.url).href`. Avoid hard-coded SDK installation paths
and absolute machine paths. Keep private captures ignored; only explicitly publish chosen assets.

### Lighting and rendering

Template lighting provides an initial preview. Design a finished scene's lighting from its scale,
openings, real fixtures, materials and reference photos. Choose light types, counts, positions,
colors, intensities and shadows for that scene; treat numeric examples as scene-specific starting
points. Match the requested visual fidelity, then measure performance and compare full-quality
images before accepting an optimization.

#### Light types and fixture composition

R3F can declare the available Three light classes as JSX; the following examples are a starting
point, not a whitelist. Three models add the corresponding light objects to `ctx.lights` or
fixture roots as described above.

| Purpose                                 | R3F examples                                              |
| --------------------------------------- | --------------------------------------------------------- |
| Local or directional illumination       | `<pointLight />`, `<spotLight />`, `<directionalLight />` |
| Rectangular emitters, panels and strips | `<rectAreaLight />`                                       |
| Ambient or sky/ground fill              | `<ambientLight />`, `<hemisphereLight />`                 |

Compose fixtures from visible geometry, emissive surfaces and one or more illumination sources.
An emissive material controls the visible light face; bloom adds a glow around bright pixels.
Use actual lights or an explicitly integrated lighting bake to illuminate surrounding surfaces.
`AreaEmitter`, `LinearEmitter` and `CurveEmitter` are exported by `@yweb/room-react`.
Three uses `createAreaEmitter`, `createLinearEmitter` and `createCurveEmitter` from
`@yweb/room/authoring`. Each group combines PBR emissive geometry and directed area lights;
`surfaceVisible/lightEnabled` and `intensity/emissiveIntensity` independently control appearance
and illumination. Callers register each independently moving fixture with one `RoomObject` or
`ctx.register`.

Linear/curve emitters support ribbons and tubes. Curves use `emissionNormal`, `closed`,
`geometrySegments` and `lightSegments`, with 3D transport and closed-loop seam correction.
Grilles and grids remain model compositions of these units and measured housings. SDK READMEs
document full options/defaults; the recipes below keep calls short.

#### Area-light requirements

`RectAreaLight` is suitable for panels and strips with `MeshStandardMaterial` or
`MeshPhysicalMaterial`. Its emitting direction is local -Z; align it with the visible light
face and the surfaces it must illuminate. The standard Room rendering pipeline initializes the
required LTC tables once. Keep the template's `render` settings in the standard viewer so this
pipeline runs. A custom host that bypasses that pipeline must provide equivalent
initialization; see the [Three area-light reference](https://threejs.org/docs/pages/RectAreaLight.html).

Area lights do not cast shadow maps. If a grille or cove must block light or cast a particular
pattern, plan a compatible bake or validated shadow-casting light arrangement. Room's
CubeCamera/PMREM environment capture approximates environmental lighting and reflections; it
does not compute spatially resolved indirect lighting and occlusion around each fixture.

For examples, read the [area fixture and straight strip](modeling.md#fixtures-and-straight-strips),
[grille/grid](modeling.md#grille-lights-and-regular-grids) and
[curved strip](modeling.md#curved-strips) recipes. For measured optimization of many sources, read
[dense light arrays](advanced-modeling.md#dense-light-arrays).

#### Presentation settings

R3F modules supply presentation fields on the exported object; Three build callbacks return
them. `render` configures exposure, tone mapping, shadows, AO and bloom.
`environment: { center, intensity, mirror?, mirrorAt? }` configures baked reflections, with
resolution/bounces set by `render.envSize/envBounces`.

### Reference layers and photos

Optional `loadReference()` returns a scan root already in the model's coordinate frame.
Room Viewer owns and releases that root separately; do not share model-owned geometry or resources
with it. Missing reference data reports `reference-unavailable`. `photos` can retain upright
image URLs, positions, forward/up vectors, vertical FOV and aspect.

### Physics and navigation

R3F supplies `body` and `navigation` on `RoomObject`; Three passes them to `ctx.register`.
A body has `{ motion: 'static' | 'dynamic', shape, mass?, friction?, restitution? }`.
Primitive shapes include box (`halfExtents`), sphere (`radius`) and capsule (`radius/halfHeight`);
geometry recipes are `hull`, `compound` and `decompose`.

Preparation converts geometry recipes to serializable hull/compound data before Jolt simulation.
A preparation failure is explicit and never replaced with a large box. Use shared measurements
for visual and collision dimensions, and rebuild after edits with an updated revision.
Navigation tags such as `support` and `blocker` record intent; they do not create navigation
services by themselves. For collision overlays and fixed-step checks, use the
[project guide](project-layout.md#optional-physics-checks).

## Loading readiness and resource disposal

### What ready means

Model readiness means assets are loaded, registered objects have their final world poses, and
the model is assembled. The host can then prepare requested physics and finish rendering setup
before captures. This prevents a capture or collision build from missing asynchronously loaded
objects.

For R3F, the room session's `ready` waits for the mounted subtree and its tracked resources.
For Three, await `build(options)`: `buildAuthoredRoom` completes after its tracked assets are ready
and returns the final `BuiltRoom`.

### R3F: recommended asynchronous pattern

For textures, prefer Suspense loaders such as Fiber's `useLoader`. Track custom asynchronous
work with `waitFor` during render or a layout effect. If the data creates JSX, pass a synchronous
commit callback:

```tsx
import { useLayoutEffect, useState } from "react";
import { RoomObject, useRoom } from "@yweb/room-react";

type ItemData = { id: string; position: [number, number, number] };

// The caller keeps the same promise for this load across renders.
function Items({ dataPromise }: { dataPromise: Promise<ItemData[]> }) {
  const { waitFor } = useRoom();
  const [items, setItems] = useState<ItemData[]>([]);

  useLayoutEffect(() => {
    void waitFor(dataPromise, (data) => setItems(data));
  }, [dataPromise, waitFor]);

  return (
    <group>
      {items.map((item) => (
        <RoomObject key={item.id} id={item.id} position={item.position}>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial />
          </mesh>
        </RoomObject>
      ))}
    </group>
  );
}
```

Keep these constraints:

- Reuse a stable Promise for each load; creating another Promise every render keeps changing
  the work being tracked.
- Register readiness-critical work during render/layout effects. An untracked passive
  `useEffect` runs too late to define model readiness.
- Pass updates such as `setItems` in the second `waitFor` argument. Do not hide them inside
  `dataPromise.then(setItems)`.
- Keep the commit callback synchronous: return no Promise and start no transition. Use Suspense
  for further asynchronous JSX; register additional asynchronous work separately.
- Report rejected loads as failures. Honor `useRoom().signal` in custom fetches.

A Promise resolving does not guarantee that React has committed the corresponding JSX.
`waitFor(dataPromise, commit)` runs the synchronous callback through Fiber's commit barrier,
including the layout effects that register newly mounted objects, before releasing the readiness
barrier. This is why merely waiting for `dataPromise.then(setItems)` is insufficient.

### Three: track loads within the build

Await custom construction inside `build(ctx)` and register asynchronous resource loads promptly
with `ctx.resources.load(promise)` so failures and late completions remain owned.
`ctx.resources.texture(path)` and the material palette already track their loads.
`buildAuthoredRoom` waits for the resource scope and rejects failed loads. Honor `options.signal`;
the scope also checks cancellation. Register independent resources before an operation can fail.

### Resource ownership

For R3F, Fiber disposes JSX-created geometry, materials and textures. The Room SDK only unbinds
its records and does not dispose React-owned resources. Hand-created objects mounted through
`<primitive>` retain Three's manual ownership rules; release owned resources in model cleanup.

For Three, `ctx.resources` owns tracked geometry, materials, textures and pending loads.
The room's disposer releases them once, including resources from partial builds or late
completions. Reference roots remain separately owned by Room Viewer as described above.

## Interaction and rebuild boundaries

### Temporary state and saved defaults

- React event handlers and component state can update appearance, such as material colors or labels.
- Project `parameters` and `state` are declared inputs. Component `useState` changes are temporary and are not automatically saved to `room.project.json`.
- To change saved defaults, edit the source or project inputs. The Viewer does not convert runtime interactions back into JSX or save them to the project.

### Which changes require a rebuild?

After R3F readiness, distinguish changes to runtime state from changes to the room's structure:

| Change                                                                                                           | How to apply it                                                               | Rebuild required? |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------- |
| Change a material color or label                                                                                 | Update React state                                                            | No                |
| Move a purely visual node that is not runtime-managed and does not affect registered body or navigation geometry | Update the node's pose                                                        | No                |
| Open an existing door or move an existing drawer                                                                 | Submit a joint-position or motor-target command through the mechanism runtime | No                |
| Add/remove a registered root, change `body/navigation`, or load new scene resources                              | Edit the source/project inputs and rebuild the room                           | Yes               |

For a rebuild, let `room dev` reload the page after editing the inputs. Temporary React state resets.

### Load mechanism capabilities as needed

For constrained relative motion, use the independent yengine-mechanisms skill:

| Required behavior                                       | Declaration or entry point                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Constrain motion with a hinge or slider                 | `RoomJoint` registers joint declarations with stable IDs                    |
| Drag a door or drawer directly                          | Optional `@yweb/room-react/direct-interaction` entry                        |
| Use a physical button or knob to control a target joint | `RoomControl` and `RoomControlBinding` from `@yweb/room-react/interactions` |

Ordinary doors and drawers do not require button/knob controls or control bindings. They can still have rigid bodies, joints and physics simulation.

### Pose ownership and mode switches

For managed motion roots, such as a door leaf or drawer, the Viewer applies poses from one source at a time:

- **Pose-preview mode:** forward kinematics (FK) computes the pose from joint positions.
- **Physics mode:** the physics simulation computes the pose.

Model code submits joint positions or motor targets through the mechanism runtime. Do not also write managed roots' transforms through React props, refs or `useFrame`: competing writes overwrite each other's poses and may separate visuals from collision geometry.

Switching modes restores the authored initial state. The current opening angle or drawer travel is not carried over.

### Test a sequence in one session

Use `room test --scenario` for a dependent sequence such as:

1. Press a button.
2. Step the simulation.
3. Check the actual joint position.
4. Capture an image.

These operations run in one page and share a simulation session. Separate CLI invocations each start a new page and do not continue the previous invocation's simulation.

### Model code permissions

Model JavaScript runs with the page's browser capabilities. The model loader is not a security sandbox.
