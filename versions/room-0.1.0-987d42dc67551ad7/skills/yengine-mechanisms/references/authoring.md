# Authoring an articulated object

## Start an independent project

With a local release, run its installer:

```sh
node /path/to/room-release/install.mjs ./my-mechanism --template mechanisms
```

The installer verifies and vendors the complete release into `vendor/yweb/<releaseId>/`,
installs its package set and project-level skills, and records `room.toolchain.json`.
Keep the vendor copy, receipt and package lock with the editable project. The original
release folder and YWeb checkout are not needed for later local-package reinstallation;
third-party packages may still require the configured registry.

From an existing project with a recorded local release, its installed CLI can
create a sibling project using the same vendor version:

```sh
room init ../my-mechanism --template mechanisms
cd ../my-mechanism
npm run dev
```

Use `--release /path/to/room-release` to select a local release explicitly. From a
project already using a local release, initialization can reuse its recorded vendor
copy. Skill upgrades preserve extra custom files; modified managed files or an
unmanaged same-name skill require resolving the reported conflict. Explicit
`--replace-skills` backs up those conflicts before replacing official files.
Use `--template mechanism-controls` for a button opening a door and a knob adjusting an independent hollow drawer with SDK-managed pointer hooks. The templates include source and scenario files; adapt their measured dimensions and construction. The SDK, CLI and Viewer remain fixed dependencies. These instructions do not assume the packages have been published to npm.

Edit the project `src/`, declared assets, `room.project.json`, and scenario files. Custom geometry can use ordinary Three/TSX helpers in `src/geometry/`. Keep the model's existing R3F module shape and one Viewer-owned Canvas.

## Declarations

`RoomObject` registers a named body/root. `RoomJoint` registers a named joint owner. JSX parenting is visual hierarchy, not the joint graph. Joint declarations can precede their endpoints; the asynchronous registry resolves everything before ready.

```tsx
import { RoomJoint, RoomCollisionPair } from "@yweb/room-react";

// Body objects "cabinet" and "door" already exist.
// These local frames agree in the initial assembled world pose.
<RoomJoint
  id="door-hinge"
  descriptor={{
    kind: "hinge",
    bodyA: "cabinet",
    bodyB: "door",
    frameA: {
      position: [0, 0.8, 0],
      rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2],
    },
    frameB: {
      position: [-0.4, 0, 0],
      rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2],
    },
    limits: { min: 0, max: 1.4 },
  }}
/>;
```

The frames are relative to rigid body origins, not COMs or surrounding JSX groups. +Z is the motion axis, +X the hinge zero reference; quaternions are [x,y,z,w]. Use the actual body poses to derive consistent frames. Initial joint coordinates may be nonzero; do not correct inconsistent geometry by silently snapping it.

Keep cabinet panels/handle details in their actual rigid groups. A hollow cabinet needs collision shapes preserving its opening, such as compound panel boxes. A single convex hull around it will block the door or drawer. Use explicitly justified collision-pair exclusions only for intended overlapping parts; do not disable room obstacles globally. `RoomCollisionPair` takes direct `bodyA`, `bodyB`, and `enabled` props, for example `<RoomCollisionPair bodyA="cabinet" bodyB="door" enabled={false} />`.

RoomDefinition and the Three authoring context support the same joints, controls, controlBindings and collisionPairs declarations. Three context methods are registerJoint, registerControl, registerControlBinding and registerCollisionPair. Changes to registered structure or physical definitions after readiness require rebuilding.

## Pose preview

Select preview in the Viewer or a scenario mode action. Fixed/Hinge/Slider trees use FK without a Worker. A unique static support anchors the tree. A free assembly requires exactly one `RoomObject previewRoot`; this holds that body's initial world pose for geometric inspection, not in physical simulation.

Shared static supports do not merge unrelated moving islands. Multiple fixed anchors, loops and advanced constraints receive explicit unsupported reasons; they remain at the initial pose until physics mode is selected. Do not count skipped preview checks as passes.

Model initial transforms are the baseline for collision preparation and resets. Mode switches reset motion, source inputs and binding memory. Do not encode transient FK transforms back into source without deliberately revising the model.
