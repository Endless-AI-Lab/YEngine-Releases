# Room modeling tools

Choose by the evidence or asset you need, then read that tool's entry. Run from the model project through `room tool <name> -- <arguments>`. Here `room` means `npx --no-install room` for npm or `pnpm exec room` for pnpm. The tools ship with the installed CLI; no YWeb checkout is required.

## Choose a tool

| Tool                                      | Use when                                              | Input                                                            | Output                                                  |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| [house_to_rooms](#house_to_rooms)         | Import active scans and house placements              | Folder containing `house.json` and sessions                      | `index.json`, converted room JSONs and placement status |
| [bundle_to_room](#bundle_to_room)         | Establish one room's coordinate frame                 | Unpacked capture bundle, original room index when needed         | Converted room JSON; optional annotated plan            |
| [bundle_plan](#bundle_plan)               | Inspect captured walls, openings and photo coverage   | Unpacked capture bundle                                          | Plan PNG and wall summary                               |
| [measure_scan](#measure_scan)             | Measure a GLB/glTF scan before modeling               | Scan file                                                        | Printed measurements; optional height/wall PNGs         |
| [prepare_photos](#prepare_photos)         | Prepare upright photo references in room-array order  | Bundle and converted room JSON                                   | Numbered JPEGs in a new directory                       |
| [photos_for](#photos_for)                 | Find useful photos of a particular detail             | Converted room JSON and a room-coordinate point                  | Ranked photo indices, distances and image positions     |
| [photo-camera](#photo-camera)             | Reproduce one photo's camera, including roll          | Converted room JSON and photo-array index                        | Calibrated camera JSON                                  |
| [lights_from_photos](#lights_from_photos) | Locate candidate ceiling fixtures from photo evidence | Bundle, converted room JSON and measured ceiling height          | Printed candidate positions and supporting photo counts |
| [reconstruct_bundle](#reconstruct_bundle) | Rebuild from depth or color a saved LiDAR mesh        | Bundle with depth or a session-world triangle mesh; posed photos | Colored meshes, coverage report and photo-source array  |
| [mesh_probe](#mesh_probe)                 | Measure local furniture or surface dimensions         | Room-coordinate triangle PLY and a bounding box                  | Printed extents, percentiles and optional height slices |
| [ortho](#ortho)                           | Measure or sample an orthographic capture             | PNG and its matching camera JSON                                 | World coordinates, sampled colors or a high-pass PNG    |
| [fetch_textures](#fetch_textures)         | Find and prepare CC0 surface textures                 | Search words or provider asset IDs                               | Search results, preview sheet or local PBR maps         |

## Invocation and environments

Use `room setup python` for Python tools. `reconstruct_bundle` and `mesh_probe` need `room setup reconstruction`, which includes Open3D. `measure_scan` and `photo-camera` use the CLI's Node.js dependencies. Captures produced by `room capture` separately require `room setup browser`; see the [project guide](project-layout.md#inspection-and-automation).

`fetch_textures` uses `curl` and network access to Poly Haven and ambientCG. Its downloaded maps become local project assets. The remaining modeling tools work on local inputs. Individual tools have different argument parsers; only some implement `--help`.

Bundle arguments below are unpacked directories. Create parent directories for file outputs, keep derived outputs separate from the captures, and choose new directories for `house_to_rooms` and `prepare_photos`. The paths, room index, points, boxes and heights in the examples must be adapted to the current evidence.

## Conversion and capture coverage

### house_to_rooms

Input is the folder containing `house.json`, not the JSON file itself. Selects each house room's active scan and validates its placement. The new output directory contains `index.json` and ready room files such as `room-000.json`; blocked rooms carry a reason in the index. A partial import exits with code 2, so inspect the index before assembling the house. Optional `--room <stable-id>` selects a house room by ID.

```sh
room tool house_to_rooms -- output/room/inputs/my-house -o output/room/converted/my-house
```

### bundle_to_room

Input is one capture bundle. Output JSON includes the world-to-room transform, floor polygon, walls/openings, object bounds and upright photo poses. `--room` is the original exported room index. For finalized `structure.json`, omit it; use the actual index for `rooms/room-N.json`. `--turn K` adds quarter turns when the measured alignment requires them. House imports already provide this conversion and its placement.

```sh
room tool bundle_to_room -- output/room/inputs/my-room --room 0 -o output/room/converted/room.json --plan output/room/converted/plan.png
```

### bundle_plan

Produces a top-down plan of captured walls, openings, furniture bounds and photo camera directions, plus a printed wall summary. It uses the bundle's capture frame; `bundle_to_room --plan` supplies the converted room-frame plan. Omit `--room` for finalized `structure.json` or select the original room index.

```sh
room tool bundle_plan -- output/room/inputs/my-room --room 0 -o output/room/bundle-plan.png --ppm 120
```

### measure_scan

Reads GLB/glTF geometry and prints floor/ceiling estimates, orientation and wall-plane evidence. `--out` also writes `plan-height.png` and `plan-walls.png`. It measures the scan without changing its coordinate frame; retain those measurements when aligning the model.

```sh
room tool measure_scan -- output/room/inputs/scan.glb --out output/room/measurements
```

## Photo evidence and fixture placement

### prepare_photos

Inputs are the bundle and its converted room JSON. Writes upright `0000.jpg`, `0001.jpg`, etc. in a new directory, following `room.photos` array order. `--max-edge` controls the longest image edge. Preserve the sensor-orientation originals for projection with their intrinsics.

```sh
room tool prepare_photos -- output/room/inputs/my-room output/room/converted/room.json output/room/photos/my-room --max-edge 1280
```

### photos_for

Give a point in the converted room's meter coordinates. Prints photos whose calibrated view contains the point, ranked by distance and framing, with photo-array indices and normalized upright-image positions. This is a framing shortlist; inspect the images for occlusion and useful detail.

```sh
room tool photos_for -- output/room/converted/room.json 0 1 0 --n 8
```

Use a returned index with the numbered upright photos, `photo-camera`, or `room compare-photo --photos`. Original photo filenames may have gaps and are not array indices.

### photo-camera

Takes a converted room JSON and a nonnegative photo-array index. Writes evidence metadata and `captureOptions`, preserving position, forward, up, field of view and aspect. `--width` selects capture width; height follows the upright photo aspect.

```sh
room tool photo-camera -- output/room/converted/room.json 0 --width 720 -o output/room/photo-0-camera.json
```

Use the result with `room compare-photo --reference output/room/photos/my-room/0000.jpg --camera output/room/photo-0-camera.json`.

### lights_from_photos

Uses bright regions in upward-facing sensor photos, camera poses and a measured ceiling plane to propose fixture positions. Input also includes the converted room JSON for the world-to-room transform. Prints room-coordinate positions, the count of supporting photos and positional spread; it does not write a lighting model.

```sh
room tool lights_from_photos -- output/room/inputs/my-room output/room/converted/room.json --ceiling 2.60
```

For a lower soffit plane, add `--soffit 2.20 --soffits="-1,1,-2,0"`. Each rectangle is `x0,x1,z0,z1` in room coordinates; separate multiple rectangles with semicolons. Check candidates against photos and the floor polygon: windows and glare can create bright regions. Model confirmed fixtures in the room source.

## Reconstruction and geometric measurement

### reconstruct_bundle

Choose depth fusion when the bundle has depth frames and poses. When a saved LiDAR mesh already has triangles, pass `--mesh` to skip fusion; that mesh must be in the bundle's session-world frame. Coloring uses the bundle's posed photos.

```sh
room tool reconstruct_bundle -- output/room/inputs/my-room --room output/room/converted/room.json -o output/room/reconstruction-depth
room tool reconstruct_bundle -- output/room/inputs/my-room --mesh output/room/inputs/my-room/mesh/room-0.ply --room output/room/converted/room.json -o output/room/reconstruction
```

These are alternative runs. Both write `scan_world.ply`, `vertex_photo.npy` and `reconstruction.json`. With `--room`, they also write `scan_room.ply` and `scan_room.glb`. The report's colored-vertex fraction measures photo projection coverage, not reconstruction accuracy; inspect the output against the source evidence.

### mesh_probe

Input must be a triangle PLY in the same room frame as the query box. Pass bounds in order `x0 x1 y0 y1 z0 z1`, in meters. Prints vertex count, tight extents, coordinate percentiles and prominent upward-facing surface heights. `--slices` adds 5 cm height bands of x/z extents.

```sh
room tool mesh_probe -- output/room/reconstruction/scan_room.ply -1 1 0 2 -1 1 --slices
```

### ortho

Use an axis-aligned orthographic `room capture` PNG with its exact JSON metadata. `px` maps an image-edge pixel coordinate to the two visible world axes. `sample` takes named rectangles in those world axes as `name=h0,h1,v0,v1` and prints median RGB colors. `highpass` writes a detail image with a world-coordinate grid.

```sh
room tool ortho -- px output/room/top.png --metadata output/room/top.json 300 200
room tool ortho -- sample output/room/top.png --metadata output/room/top.json fabric=-1,0,-1,0
room tool ortho -- highpass output/room/top.png --metadata output/room/top.json -o output/room/top-highpass.png
```

The metadata must match the full PNG and DPR 1 viewport; preserve the capture framing when measuring or sampling. Add 0.5 to integer pixel coordinates when selecting a pixel center.

## Materials

### fetch_textures

For surface materials, search Poly Haven and ambientCG for suitable CC0 PBR assets, inspect a contact sheet, then download the chosen maps into the model project. Search returns provider-specific asset IDs. Choose the IDs from those results; the carpet and oak IDs below illustrate the syntax.

```sh
room tool fetch_textures -- search leather carpet wood
room tool fetch_textures -- sheet output/room/texture-sheet.png ambientcg:Carpet012 polyhaven:oak_veneer_01
room tool fetch_textures -- get assets/textures carpet=ambientcg:Carpet012:neutral:0.85:1.6 oak=polyhaven:oak_veneer_01
```

`sheet` previews color maps. `get` takes an output directory and one or more `name=provider:asset[:neutral[:mean[:contrast]]]` specifications. It writes 1K `<name>_diff.jpg`, `<name>_nor.jpg` (OpenGL normal) and `<name>_rough.jpg` when supplied by the asset.

For fabrics, carpet and leather, `:neutral` converts only the color map to grayscale and re-centers its brightness; `material.color` provides the hue. Default mean is 0.82 and contrast is 1.0. Keep color maps for wood and stone. Draw specific plaid, stripes, paintings and rug graphics in canvas, as described in the [material guidance](modeling.md#6-materials-and-textures).

Declare downloaded maps in `room.project.json` assets or import them from model modules so the build includes them. Compare texture scale and appearance against the room's photos.
