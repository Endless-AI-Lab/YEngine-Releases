# Advanced constraints

Use the existing physics types and their installed API documentation. These constraints are available in physics mode; their FK preview is explicitly unsupported.

| Kind | Modeling and verification |
| --- | --- |
| Gear | Base Hinge references, static supports and dynamic moving ends; transmission frames match base moving frames. Verify thetaA + ratio * thetaB residual and actual opposing motion. |
| Rack-and-pinion | Base Hinge and Slider; ratio in rad/m and thetaA = ratio * xB. Check axes, frame references and travel. |
| Pulley | Body-local anchors, world-space fixed supports and weighted length range. Equal min/max means fixed length. Add guide Sliders as needed. It is not simulated rope geometry or a winch. |
| SixDOF | Omitted axes are locked. Validate twist/swing limits, relative B-to-A pose and complete motor replacement. Do not reinterpret rotation limits as independent Euler XYZ. |

Every joint has a stable owner ID. Base joint references may be declared in either order, but dependencies must be valid. Moving shaft/support assumptions are constrained by the existing backend API; do not invent configurations outside it.

Physical constraints transfer loads independently of controls. Load the control-bindings reference only for an external physical button/knob commanding these mechanisms.

For closed or multiply anchored assemblies use physics and inspect residuals, stability and intended travel. Do not bypass an unsupported preview by removing dependency constraints. Known initial frames and adequate collision geometry are especially important: a loop that looks connected may start with incompatible anchors.

Record limited-angle assumptions. The current Hinge does not provide continuous multi-turn unwrapping. Do not infer multi-turn accuracy from a visually rotating gear.