import "./AIOrb.css";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "error";

interface AIOrbProps {
  /** Current assistant state — drives color, pulse speed, and label. */
  state?: OrbState;
  /** Optional label shown under the orb (e.g. live transcript). */
  caption?: string;
  /** Overall size of the core orb in pixels (default: 170) */
  size?: number;
}

const STATE_LABEL: Record<OrbState, string> = {
  idle: "V",
  listening: "V",
  thinking: "V",
  speaking: "V",
  error: "!",
};

export default function AIOrb({
  state = "idle",
  caption,
  size = 170,
}: AIOrbProps) {
  return (
    <div
      className={`orb-wrapper orb-state-${state}`}
      style={{ "--orb-size": `${size}px` } as React.CSSProperties}
    >
      {/* Outer rings */}
      <div className="orb-ring ring-1" />
      <div className="orb-ring ring-2" />
      <div className="orb-ring ring-3" />

      {/* Core */}
      <div className="orb-core">
        <div className="orb-glow" />
        <div className="orb-text">{STATE_LABEL[state]}</div>

        {/* Listening bars */}
        {state === "listening" && (
          <div className="orb-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {/* Soft shadow under the orb */}
      <div className="orb-shadow" />

      {/* Optional caption */}
      {caption && <div className="orb-caption">{caption}</div>}
    </div>
  );
}