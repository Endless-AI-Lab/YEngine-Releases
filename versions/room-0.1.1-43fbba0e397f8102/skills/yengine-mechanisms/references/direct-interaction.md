# Direct manipulation

Load this reference only when the user needs direct operation of the mechanism. Ordinary joints do not need control/binding registration.

```tsx
import { useRoomJointDrag } from "@yweb/room-react/direct-interaction";

function DoorHandle() {
  const drag = useRoomJointDrag({
    joint: "door-hinge",
    drive: { maxEffort: 20, frequencyHz: 4, dampingRatio: 1 },
  });
  return <mesh {...drag}><boxGeometry args={[0.03, 0.16, 0.03]} /><meshStandardMaterial /></mesh>;
}
```

The built-in drag hook supports scalar Hinge and Slider joints only. For a transmission, attach it to a permitted Hinge/Slider driver; it does not drag a logical Gear/Pulley constraint or a SixDOF pose directly. Use explicit scenario or physics commands for unsupported direct-manipulation targets, and do not claim a pointer interface has been implemented.

Place the handle inside the appropriate RoomObject. The hook projects pointer motion onto the joint geometry, clamps limits, captures the pointer and suspends orbit controls during the gesture. A view parallel to the manipulation plane/axis may not provide a usable drag direction; choose a useful inspection view.

In preview it sets the FK coordinate. In physics it uses a finite-effort position motor, preserving collisions. Release/cancel closes the temporary motor; it does not freeze the body. Blur, lost capture, unmount and generation changes end gestures.

An active target binding must be disabled and its applied receipt confirmed before manual motor writes. The Viewer performs this handoff; it does not automatically re-enable the binding when dragging ends. For a joint registered as a physical button/knob, use `useRoomButton` / `useRoomKnob` from the optional interactions entry; these preserve source-control motor ownership. Keep `useRoomControl` for custom input. See [control bindings](control-bindings.md).

The optional runtime hook `useRoomMechanisms` from `@yweb/room-react/runtime` exposes mode/readiness, current-ID resolution, services and direct commands. Resolve handles at operation time; never reuse a handle saved before reset. Model code must not create another Session, timer or transform writer.