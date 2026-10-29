# Physical controls and bindings

Load only when a button/knob drives another joint. Mechanical constraints alone do not require this layer.

## Declare the source and target

`RoomControl control={...}` references an existing Slider for a button or finite Hinge for a knob. `RoomControlBinding binding={...}` references the source control and logical target with stable IDs. Configure range, drive, optional returnDrive and thresholds on the declarations; pointer hooks do not repeat those settings. Use the installed engine-physics README for complete fields; no native Jolt objects cross the boundary.

## Connect a model surface to pointer input

Use the hooks from the optional interactions entry and spread their handlers onto the source body's mesh. The Agent authors geometry and declarations; the SDK owns pointer capture, input sequencing, cancellation and camera restoration.

```tsx
import {
  RoomControl, RoomControlBinding, useRoomButton, useRoomKnob,
} from "@yweb/room-react/interactions";

// Render each surface inside the RoomObject of its registered source joint.
function ButtonSurface() {
  const press = useRoomButton({ control: "open-button" });
  return <mesh {...press}><boxGeometry args={[0.16, 0.16, 0.04]} /><meshStandardMaterial /></mesh>;
}
function KnobSurface() {
  const turn = useRoomKnob({ control: "drawer-knob" });
  return <mesh {...turn} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.14, 0.14, 0.08, 32]} /><meshStandardMaterial /></mesh>;
}
```

Both hooks accept `{ control, disabled?, onError? }`. They operate only in ready physics mode and do not switch modes or start another Session. The control type must match the hook. The default Viewer supplies control lookup; a custom host needs the optional `getControl` runtime capability for these hooks. Missing capability or invalid control setup is reported through `onError`, or the registry error handler when omitted.

| Interaction | Behavior |
| --- | --- |
| Button press/release | Press submits 1; release or cancellation submits 0 in the same generation, even when the press is waiting for its receipt. |
| Knob drag | Projects the pointer onto the actual joint rotation plane, starts from actual position, accumulates angle increments and clamps the normalized input to the allowed range. |
| Knob end/cancel | Normal release submits the final value. Cancellation discards unsent moves. The last submitted input remains; the source motor is not turned off or reset to zero. |
| Shared lifecycle | One mechanism gesture owns the Canvas at a time, including door/drawer dragging. Capture loss, blur, visibility loss, disabling or unmounting the hook, and mode/generation changes release pointer/camera ownership. |

A side view parallel to the knob's rotation plane may not give a usable pointer projection; choose a useful viewing angle. Old asynchronous cleanup must not affect a replacement generation. Cancelling a button releases its source; it does not undo an already triggered toggle. Rejected or timed-out mutations are not automatically retried.

For custom input devices or UI, `useRoomControl("button")` remains available as an async input function accepting an optional abort signal. Buttons accept 0/1; knobs accept 0..1. Custom callers must pair button press/release and handle their own input lifecycle. Do not drive registered control joints through the ordinary direct-drag hook or write their source motors directly.

## Choose the binding output

| Output | Configuration |
| --- | --- |
| Omitted | Hinge/Slider with range and drive. |
| six-dof-translation | Axis plus scalar range/drive; other axis motors are closed. |
| six-dof-pose | from/to relative poses and drives for every unlocked axis; omit top-level range/drive. |
| mechanism-drive | Logical Gear/Rack/Pulley target plus output.driver identifying the actual base joint. Range uses the driver's units. |

SixDOF poses are frame B relative to frame A, with [x,y,z,w] quaternions. Complete motor replacement and whole-joint ownership apply. Gear/Rack drivers must reference the permitted base joints; Pulley uses a guiding Slider attached to a weight. Constraints maintain the mechanical relationship; bindings only command a driver.

## Runtime behavior and ownership

Inputs target the source motor. Actual source travel controls threshold/edge/value behavior; the target motor updates on the next fixed step. momentary follows actual pressed/released state; toggle reacts to actual press edges; value maps actual source position. Pose output uses linear position and shortest-arc quaternion interpolation. Toggle changes the target preset; it does not guarantee a timed interpolation trajectory.

Logical target and actual driver have exclusive binding ownership. Disable old then enable new in the same operation list. Manual physics writes require an applied disable receipt first. Deletion can invalidate a binding; invalidated/drive-error are failures to diagnose, not successful completion. Do not silently clamp invalid pose paths or retry a toggle after a timeout.

## Validate the complete interaction

The mechanism-controls template includes a button opening a door and a knob adjusting a separate hollow drawer. Their target joints are independent, so their bindings do not compete. Adapt these declarations rather than copying pointer lifecycle code into the model.

Validate source blockage, target blockage, repeat press/release, switching and reset. Inspect actual physics separately from binding.nextTarget/nextPose. Scenario input validates the control/physics path; separately exercise actual pointer press/drag, cancellation, mode changes and camera restoration in the Viewer. Inspect current-build screenshots and reports using the [tool reference](tools.md).
