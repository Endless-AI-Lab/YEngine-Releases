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
