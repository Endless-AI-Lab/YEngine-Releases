# Execution tools

## Invocation and prerequisites

Use these commands in the external model project root, where `room.project.json` and `package.json` live. In this reference, `room` is shorthand for `npx --no-install room` in an npm project or `pnpm exec room` in a pnpm project. Relative scenario and explicit output paths resolve from the terminal's working directory; `--project` does not change that directory.

- Use Node.js 22.13+ and matching SDK, CLI and fixed Viewer packages supporting protocol 3. See [authoring](authoring.md) for the local release installer. Do not assume registry publication or install an unrelated latest version.
- The Agent needs file editing, terminal execution, JSON/log reading and image viewing. SDK declarations such as `RoomJoint` are written in model source; they are not terminal commands or separately registered Agent tools.
- `room doctor` reports environment availability. `room setup browser` installs the Playwright Chromium used by browser automation. This is separate from installing the CLI; ordinary builds and manual viewing do not require the automation browser. Basic mechanism scenarios do not require Python.

## Model-side pointer hooks

| Need | SDK entry | What the Agent writes |
| --- | --- | --- |
| Drag an ordinary door or drawer | `useRoomJointDrag` from `@yweb/room-react/direct-interaction` | Select the joint, finite-effort drive and handle mesh. |
| Press a physical button | `useRoomButton` from `@yweb/room-react/interactions` | Select the registered control ID and spread handlers on its source mesh. |
| Turn a finite-angle physical knob | `useRoomKnob` from `@yweb/room-react/interactions` | Select the registered control ID and a useful surface/view for axis-based dragging. |
| Supply custom control input | `useRoomControl` from `@yweb/room-react/interactions` | Map the input device to 0/1 or 0..1, including its own release/cancellation handling. |

Button/knob hooks use the drive/range in `RoomControl`, operate only in ready physics mode, and share pointer/camera ownership with direct dragging. Do not copy the gesture lifecycle into generated models. See [control bindings](control-bindings.md) for normal release versus cancellation behavior.

## Command index

| Task | Command and input | Output and what to inspect |
| --- | --- | --- |
| Create a project with an available matching CLI | `room init ./my-mechanism --template mechanisms`; use a new directory | Installs dependencies and generates editable TSX, manifest, scripts and `scenario.json`. For physical button/knob linkage, select `--template mechanism-controls`. Installation errors report the retry command and retain generated files. |
| Check types | `npm run typecheck` in a generated npm project | TypeScript diagnostics and exit status; resolve type errors before browser validation. |
| Build | `room build --project .` | Static site in `dist/`, including model modules, fixed Viewer and runtime assets. A successful build does not prove motion or visual correctness. |
| Inspect supported tree preview | `room inspect --project . --mode preview --output output/inspect` | `output/inspect.json` and console JSON: IDs, declarations, preview support/reasons and current state. Inspection alone is not a behavioral assertion. |
| Inspect initialized physics | `room inspect --project . --mode physics --output output/physics-inspect` | `output/physics-inspect.json`: actual runtime state after initialization. It does not continue a previously opened page or an earlier command. |
| Capture a standalone view | `room capture --project . --mode preview --view perspective --output output/initial` | `output/initial.png` and `output/initial.json` with camera/build metadata. It captures the new page's state, not a pose left by another command. |
| Run a continuous scenario | `room test --project . --scenario scenario.json --output output/mechanism` | Evidence directory containing report, scenario copy, trace and named captures; inspect actual states and assertions. |
| Open for manual interaction | `room dev --project .` | URL and live build status; open the URL in a browser and select preview or physics. Source edits trigger a full page reload. |

The mechanism templates also provide `npm run test:mechanisms`, which runs their `scenario.json` and writes `output/mechanisms`. For standalone physics smoke checks, `room step --count 120 --capture` and `room reset --capture` are available, but each starts a fresh page; use a scenario for dependent operations.

## Minimal run in an existing npm project

Check the environment first; run the setup command only if the automation browser is missing:

```sh
npx --no-install room doctor
npx --no-install room setup browser
```

After editing the model and its scenario, run:

```sh
npm run typecheck
npx --no-install room build --project .
npx --no-install room inspect --project . --mode preview --output output/inspect
npx --no-install room test --project . --scenario scenario.json --output output/mechanism
```

For advanced mechanisms, replace the inspection mode with physics. Use the [validation example](validation.md) as a scenario starting point and adapt its IDs, dimensions, targets and tolerances. Read the installed CLI README for the complete version-1 scenario schema; `room help` lists CLI flags.

## Choose scenario actions by purpose

| Check | Actions in the same scenario | Required evidence |
| --- | --- | --- |
| Initial, intermediate and endpoint poses | `mode` set to preview, then `pose`, `sample` / `assert`, and `capture` | Supported FK topology, expected joint positions and actual images. Preview does not prove collision-free travel. |
| Physical travel, limits, obstruction and release | `mode` set to physics, then `physics`, `step`, `assert` and `capture` | Actual joint motion and applied motor state, not merely the commanded target. |
| Button or knob linkage | Physics mode, `input`, `step`, `sample` / `assert` and `capture` | Actual source travel, threshold/edge events, next-step target drive and actual target motion. |
| Reset behavior | `reset`, then `sample` / `assert` | Authored initial state and cleared transient control state in the new generation. |

Scenario `pose` is preview-only; `step` is physics-only. Captures do not advance time. Mode changes reset state, so place actions in the order the behavior requires. Stable model IDs are used throughout; do not store runtime entity handles in scenario files. These action names are JSON entries, not standalone CLI subcommands.

## Read evidence and handle failures

| Artifact | Agent action |
| --- | --- |
| `report.json` | Check `status`, build identity, action results and `error` when present. Success requires a zero command exit and `status: "passed"`. |
| `scenario.json` in the evidence directory | Confirm the exact scenario that produced the report. Keep it distinct from the editable source scenario. |
| `trace.ndjson` | Read chronological samples around the failing action. Compare requested target, applied motor, actual position and relevant events/contacts. |
| Named PNG/JSON pairs | Open the PNGs with an image tool and check metadata. Verify construction, supports, clearances and useful viewing angles independently of numeric assertions. |

Reports and samples carry build identity and mode/generation/tick information. The CLI creates the trace file when scenario execution starts; available samples depend on the executed actions. A parse, build, browser-launch or initial-readiness failure can occur before any new report is written. Read stderr and exit status; an older report in the same output directory is not evidence for a failed invocation. Use a new output directory when preserving evidence from multiple attempts.

- **Build or reference failure:** fix the source, declarations or dependencies and rerun the affected checks. Do not accept artifacts left by an earlier successful build.
- **Unsupported FK topology:** report the limitation and use physics for those checks; an unsupported or skipped preview is not a pass.
- **Assertion or browser error:** inspect the first failing action and available trace/images before editing the model or scenario. Keep the intended acceptance condition.
- **Receipt timeout:** preserve the failure and investigate readiness/service state. Do not blindly resubmit impulses, toggles or other mutations; the runner does not retry them.
- **Protocol, project or revision mismatch:** use the matching project/service/release and rebuild as needed. Do not bypass identity checks.

See [validation](validation.md) for object-specific acceptance criteria and the limits of AABB/contact evidence. CLI tests validate runtime commands; they do not by themselves test pointer capture, drag cancellation or camera restoration. When pointer interaction is requested, exercise actual door/drawer dragging and button/knob gestures in the Viewer as described in [direct interaction](direct-interaction.md) and [control bindings](control-bindings.md).

## Server and browser scope

Automation opens its own page, checks project/build identity, reuses a matching server or starts a temporary one, and stops servers it created when the command ends. It leaves a reused server running. It does not operate an already open manual Viewer tab.

For an already running server or static site, provide `--url` and `--no-start`, keeping the deployment subpath:

```sh
npx --no-install room test --project . --url http://127.0.0.1:5190/mechanisms/ --no-start --scenario scenario.json --output output/served-mechanism
```

Use the actual URL for the project being tested. Starting `room dev` is only needed for manual viewing or a persistent development session; check for a suitable existing server first. Stop a server started for the task when finished unless the user asks to keep it available.
