---
name: yengine-mechanisms
description: Create, edit, and validate articulated objects and mechanical assemblies in YEngine using TSX/R3F. Use for constrained relative motion such as doors, drawers, hinged lids, linkages, and transmissions from text, photos, scans, or existing models.
---

# YEngine mechanisms

Build editable named parts and real joint declarations in a standalone Room project. Use the installed Room SDK, CLI and Viewer; model-specific geometry and behavior belong in the project's source. The Viewer owns the Canvas, optional physics Session and simulation clock.

## Route by requested behavior

- Parts always move together: use an ordinary RoomObject. Moving the whole object does not require this workflow.
- Parts require constrained relative motion: use this skill.
- Freely removable parts: use separate objects; do not invent a hinge.
- Deformation: identify the missing capability or an explicitly accepted rigid approximation.
- Doors, cabinet doors, drawers and hinged lids require this workflow when the task asks for their constrained motion. Appearance or ordinary collision alone does not require a joint.

Recheck these behaviors at the start of every refinement round, including parts revealed by new photos. A newly identified hinge within the user's requested interaction scope must be built or corrected with this skill; do not leave it as a static detail or substitute an independent rotation animation. A room-wide interaction request covers newly discovered relevant parts in that room; a request naming one object does not extend to others. Carry earlier interaction requirements into later feedback: an appearance-only refinement does not remove an existing mechanism or revoke previously requested interaction. Record uncertain motion and clarify it only when construction depends on the answer.

Keep one owner for each object's appearance and mechanism. Preserve existing body/joint IDs and pass scan evidence, transforms and clearance constraints through the [refinement handoff](references/authoring.md#refining-an-existing-object).

Ordinary Hinge/Slider objects need only [authoring](references/authoring.md) and [validation](references/validation.md).
Read [direct interaction](references/direct-interaction.md) only for dragging or manual operation.
Read [control bindings](references/control-bindings.md) only for a physical button/knob controlling another joint.
Read [advanced mechanisms](references/advanced-mechanisms.md) for transmission, Pulley or SixDOF constraints.
Do not load or register controls merely to make a drawer draggable. For physical button/knob input, use `useRoomButton` / `useRoomKnob` from the optional interactions entry and attach their handlers to the source mesh; the SDK manages the gesture lifecycle.

## Execution tools and prerequisites

- Use a standalone Room project with Node.js 22.13+ and matching Room SDK, CLI and fixed Viewer packages (protocol 3). Create a project with the selected complete release's `install.mjs`; see [authoring](references/authoring.md). The installer copies the matching skills into the project and records its vendored toolchain in `room.toolchain.json`. Copying this skill alone does not install the runtime packages.
- The Agent needs file editing, terminal execution, JSON/log reading and image viewing. Model declarations use SDK APIs; executable build, inspection and scenario tools ship in the CLI, not in this skill directory.
- Run commands from the model project root. Below, `room` means the installed CLI: use `npx --no-install room` in npm projects or `pnpm exec room` in pnpm projects. Run `room doctor`; install the automation browser with `room setup browser` if missing. Basic mechanism authoring and testing do not require Python.

Read the [tool reference](references/tools.md) before execution for command inputs, outputs, session scope and failure handling. Ordinary mechanisms use the same tools without loading control bindings or advanced-mechanism references.

## Working loop

1. **Establish evidence and behavior — read files and view reference images.** Record measured dimensions separately from assumptions. Identify rigid parts, base support, freedoms, limits, initial pose, collision space and the behavior that demonstrates success. A short note is enough for a simple door.
2. **Author the assembly — edit project files.** For a new project, use the selected release installer with `--template mechanisms` as shown in [authoring](references/authoring.md). From an existing local-release project, `room init ../my-mechanism --template mechanisms` reuses that project's recorded release. Edit TSX and scenario JSON with stable body/joint IDs. Keep shapes that move together in one body; construct real openings, cavities, supports and clearances.
3. **Build and inspect — run `npm run typecheck`, `room build`, then `room inspect --project . --mode preview --output output/inspect`.** Read diagnostics and the resulting JSON. Resolve missing references, invalid frames and collision preparation errors before tuning motion. For advanced or unsupported preview topology, inspect in `--mode physics` and report the preview limitation.
4. **Sample poses — run `room test --project . --scenario scenario.json --output output/mechanism`.** Use preview `mode`, `pose` and `capture` actions for initial, intermediate and endpoint poses; inspect the actual PNGs with an image tool. Include support/interior close-ups and selected combined poses when joints can interfere. Use physics sampling for mechanisms without FK support.
5. **Verify dynamics when required — extend the scenario and run the same test command.** Use `physics`, optional `input`, `step`, `sample` and `assert` actions to test finite forces, limits, obstacles and release. Optional controls need actual-source-to-target checks. See [validation](references/validation.md) for assertions and evidence criteria.
6. **Diagnose and revise — read `report.json`, `trace.ndjson` and captures, then edit the affected files.** Reapply the behavior routing above before each pass. Localize concrete discrepancies to geometry, frames, physics, ownership or input. Follow the [refinement handoff](references/authoring.md#refining-an-existing-object) to update affected frames/colliders and choose checks; material-only edits need visual review, not an automatic repeat of unrelated dynamics. Do not weaken acceptance criteria or delete functional geometry just to pass; do not blindly retry timed-out mutations.
7. **Deliver current evidence — verify the report and images.** Require successful commands and passing relevant scenarios for the final build. Record visual, mechanism and requested physics results separately using the [completion criteria](references/validation.md#completion); a passing functional report does not clear visual findings. Deliver the model, scenarios, corrected comparisons and remaining evidence limitations.

## Project and delivery boundaries

Use the installed CLI (examples use `room`; in npm projects use `npx --no-install room`). Start with the mechanisms template for a runnable door/drawer, or mechanism-controls for a physical button opening a cabinet door and a knob adjusting a separate drawer. See [authoring](references/authoring.md) for setup.

Stable authoring IDs resolve to current EntityHandles at runtime. Do not save handles across reset/rebuild. Body-local frames use meters, radians and +Z as the hinge/slider axis; Room remains +Y up. Physics and FK are alternative writers of the same motion roots. Do not also animate those roots in useFrame.

View and pose preview use no physics Worker. Basic tree FK covers Fixed/Hinge/Slider. Advanced or multiply anchored components explicitly require physics. Mode changes restore the authored initial state and clear velocities, input and latch memory while preserving the camera.

When integrating back into a scanned room, retain measured placements and test walls, nearby furniture and full opening travel again. A mechanism passing alone does not establish that it works in its room.
