# Validation and evidence

Use structural checks, object-specific scenarios and actual image inspection together. Read the installed CLI README for the complete scenario contract.

```sh
npm run typecheck
room build
room inspect --project .
room test --project . --scenario scenario.json --output output/mechanism
```

Each standalone CLI command opens a new page. Put dependent actions in one scenario; an input command in one page followed by a step in another cannot test a mechanism.

## Continuous scenarios

A scenario is version 1 JSON. Actions are mode, reset, pose, physics, input, step, sample, assert and capture. All references are stable model IDs. Assertion paths support array selection by stable ID; no arbitrary JavaScript runs.

```json
{
  "version": 1,
  "name": "door-opening",
  "actions": [
    { "kind": "mode", "mode": "preview" },
    { "kind": "pose", "joints": { "door-hinge": 0.7 } },
    { "kind": "capture", "name": "half-open" },
    { "kind": "mode", "mode": "physics" },
    { "kind": "physics", "operations": [{
      "kind": "set-motor", "entity": "door-hinge",
      "motor": { "mode": "position", "target": 1, "maxEffort": 20, "frequencyHz": 4, "dampingRatio": 1 }
    }] },
    { "kind": "step", "count": 120 },
    { "kind": "assert", "path": "mechanisms.physics.state.joints[door-hinge].state.position", "op": "near", "value": 1, "tolerance": 0.05 },
    { "kind": "capture", "name": "physical-open" }
  ]
}
```

Choose tolerances and step counts from the object's scale and intended behavior. The template scenarios are starting points, not universal acceptance thresholds. Add an obstacle scenario separately: the motor target may remain open while actual position remains blocked. Then remove/move the obstacle and verify release or resumed travel. Test joint limits and reset. Pose preview proves geometry only, not physical reachability or collision-free travel.

Moving a static obstacle with `set-pose` does not necessarily wake a sleeping blocked dynamic body. When testing resumed travel, explicitly wake that body (for example, a physics operation `{ "kind": "wake", "entity": "door" }`) or reapply the intended motor, then assert the actual joint position. Preserve the blocked sample before moving the obstacle; a changed target alone does not prove recovery.

Outputs include report.json, optional trace.ndjson and captures. Reports identify project/build revision, mode, generation, physics tick and scenario digest. Inspect current-build images with an image tool. Report failures with the affected IDs and first relevant failing sample. Do not use captures from an earlier successful build after compilation fails.

## Receipts and observations

Enqueued is not executed. The runner waits for matching requestId receipts; timed-out impulses or toggle inputs are not retried. Request IDs are scoped to service and session generation. Physics observations distinguish requested target, applied motor and actual joint state.

For controls verify: source input -> actual source travel -> threshold/edge event -> next-step target motor -> actual target motion. A blocked button must not trigger before reaching its threshold. A blocked target must not teleport.

Step-by-step samples preserve transient behavior that a final snapshot can miss. Contacts are opt-in recent contact reports, not a complete static mesh-intersection query. Observe reported truncation/dropped data. AABB overlap is a broad-phase clue, not proof of visual mesh penetration or exact clearance.

For Gear/Rack verify coupling residual and driver/follower motion. For Pulley verify weighted length and guide motion. For SixDOF inspect the actual relative pose and valid drives; nextTarget is an interpolation coefficient for pose bindings, not an achieved coordinate.

## Completion

Record the following outcomes separately in the existing brief or delivery notes; no new CLI report schema is required:

| Outcome | Completion evidence |
| --- | --- |
| Visual | Current-build initial/closed, intermediate and endpoint/open images agree with the available reference evidence for silhouette, construction, interior, materials and graphics. List concrete discrepancies and corrected comparisons. |
| Mechanism | Stable parts and real joints, consistent local frames, intended limits and full travel; preview limitations remain explicit. |
| Physics and direct interaction, when requested | Relevant dynamics and actual input/release checks pass, including room placement and obstacles after integration. Mark unrequested checks as not requested, not passed. |

For a complete reconstruction delivery, required outcomes must describe the same successful build. Significant evidenced misplacement, missing parts or incorrect construction keep the visual outcome incomplete even when `report.status` is `passed`. Distinguish pending fixes from missing evidence and approximations explicitly accepted by the user; a note saying “approximate” does not clear a fixable finding.

Re-run affected checks after structural refinement as described in [authoring](authoring.md#refining-an-existing-object). For a material-only follow-up, scope the new outcome to visual refinement and cite the unchanged behavioral baseline; do not label old dynamics evidence as newly tested or automatically rerun unrelated scenarios.
