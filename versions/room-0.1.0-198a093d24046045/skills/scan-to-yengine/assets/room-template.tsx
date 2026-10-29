import { RoomObject, type R3FRoomModule } from "@yweb/room-react";

// Replace fictional measurements, assets and stable IDs with inspected evidence.
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
