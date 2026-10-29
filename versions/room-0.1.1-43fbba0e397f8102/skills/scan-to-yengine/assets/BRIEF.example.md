# Reconstruction brief template

Room ID: `<room-id>`
Inputs: `<private capture/converted-room paths>`
Output: `<model project>/src/`
Build identity: `<current successful room build revision>`
Quality target / viewing distance: `<evidence-based reconstruction, or the user's requested coarse scope>`
Interaction scope: `<appearance/collision only, room-wide articulation, or named objects and requested behavior>`

## Shared evidence and ownership

Record room index, floor/axes, transforms, measured walls/openings/ceiling changes and assumptions.
Keep shared measurements in one place. Name the lead responsible for shell, integration and review.

| Area / stable object IDs | Owner / exclusive files | Photo indices / scan evidence | Measured dimensions, pose / assumptions | Representative cameras |
| --- | --- | --- | --- | --- |
| `<area / IDs>` | `<lead or worker / source and assets>` | `<paths and indices>` | `<values and evidence limits>` | `<matched-photo and alternate views>` |

## Object work and behavior

For each object, record its count, construction, finish, visible graphics and characteristic accessories.
Recheck activity when new evidence arrives. For articulated parts record support/moving IDs,
local-to-room transforms, freedoms, initial pose, limits and surrounding clearance; separate
measured values from assumptions. State whether yengine-mechanisms is required by the user's scope.
Keep appearance and mechanism under one owner. Reusable construction does not prove identical placement.

Worker handoff: object evidence, quality/interaction target, owned files, representative capture commands,
separate capture output prefix/directory, and required return of actual images and unresolved findings.

## Feedback and refinement

| Object ID / concrete discrepancy | Evidence / before capture | Status and reason | Correction / after capture / build |
| --- | --- | --- | --- |
| `<specific placement, construction, graphics or motion fault>` | `<paths>` | `<pending / fixed / insufficient evidence / user-accepted approximation>` | `<change and evidence>` |

For an accepted approximation, record the user's applicable instruction. For missing evidence, record
what remains unknown. Significant evidence-backed faults stay pending until corrected; viewing an
image or calling a fault approximate does not close it. Note changes requiring mechanism/collider
rebuild and retest; a material-only change needs its related visual checks.

## Final review

| Check | Result | Current-build evidence / remaining findings |
| --- | --- | --- |
| Visual: main objects and assembled room at representative and alternate views | `<pass / fail / incomplete>` | `<comparisons and resolved findings>` |
| Mechanism: requested closed/initial, intermediate and open/endpoint construction and travel | `<pass / fail / incomplete / not applicable>` | `<poses, interior/support views, room clearance>` |
| Physics / manual interaction: requested contacts, limits, obstacles, release and reset | `<pass / fail / incomplete / not applicable>` | `<scenario and pointer evidence; collider assumptions>` |

Run type checking/build and check production HTTP/subpath/browser errors. Record the successful
build identity with final evidence, source/asset locations and remaining evidence limitations.
Functional passes cannot override a failed visual review. Label synthetic fixtures explicitly.
