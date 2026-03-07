"use client";

import { CSSProperties, PointerEvent, useMemo, useState } from "react";

type GlobePoint = {
  id: string;
  label: string;
  top: string;
  left: string;
  tone: "primary" | "accent" | "muted";
};

const globePoints: GlobePoint[] = [
  { id: "karachi", label: "Karachi", top: "58%", left: "64%", tone: "primary" },
  { id: "lahore", label: "Lahore", top: "43%", left: "69%", tone: "accent" },
  { id: "islamabad", label: "Islamabad", top: "34%", left: "65%", tone: "muted" },
  { id: "dubai", label: "Dubai", top: "56%", left: "43%", tone: "accent" },
  { id: "riyadh", label: "Riyadh", top: "50%", left: "35%", tone: "muted" }
];

export function InteractiveGlobe() {
  const [rotation, setRotation] = useState({ x: -14, y: 12 });
  const [isActive, setIsActive] = useState(false);

  const globeStyle = useMemo(
    () =>
      ({
        "--globe-tilt-x": `${rotation.x}deg`,
        "--globe-tilt-y": `${rotation.y}deg`
      }) as CSSProperties,
    [rotation.x, rotation.y]
  );

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setRotation({
      x: -18 + (0.5 - y) * 16,
      y: -20 + x * 40
    });
  }

  function handlePointerLeave() {
    setRotation({ x: -14, y: 12 });
    setIsActive(false);
  }

  return (
    <div
      className={`interactiveGlobe ${isActive ? "active" : ""}`}
      onPointerEnter={() => setIsActive(true)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={globeStyle}
    >
      <div className="interactiveGlobeAura" aria-hidden="true" />
      <div className="interactiveGlobeStage" aria-hidden="true">
        <div className="interactiveGlobeSphere">
          <div className="interactiveGlobeGrid interactiveGlobeGrid--latitudes">
            {Array.from({ length: 5 }).map((_, index) => (
              <span className={`globeLatitude globeLatitude--${index + 1}`} key={`lat-${index}`} />
            ))}
          </div>
          <div className="interactiveGlobeGrid interactiveGlobeGrid--meridians">
            {Array.from({ length: 6 }).map((_, index) => (
              <span className={`globeMeridian globeMeridian--${index + 1}`} key={`mer-${index}`} />
            ))}
          </div>
          {globePoints.map((point) => (
            <div
              className={`globeMarker globeMarker--${point.tone}`}
              key={point.id}
              style={{ top: point.top, left: point.left }}
            >
              <span className="globeMarkerDot" />
              <span className="globeMarkerLabel">{point.label}</span>
            </div>
          ))}
          <div className="interactiveGlobeShine" />
        </div>
        <div className="interactiveGlobeRing interactiveGlobeRing--outer" />
        <div className="interactiveGlobeRing interactiveGlobeRing--inner" />
      </div>
      <div className="interactiveGlobeLegend">
        <span className="sellerBadge sellerBadge--verified">Interactive marketplace globe</span>
        <p>Hover ya touch se discovery world ko rotate karein. Pakistan-first seller network center me hai.</p>
      </div>
    </div>
  );
}
