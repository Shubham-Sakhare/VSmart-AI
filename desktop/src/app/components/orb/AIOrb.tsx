import "./AIOrb.css";

export default function AIOrb() {
  return (
    <div className="orb-wrapper">
      <div className="orb-ring ring-1"></div>
      <div className="orb-ring ring-2"></div>
      <div className="orb-ring ring-3"></div>

      <div className="orb-core">
        <div className="orb-glow"></div>
        <div className="orb-text">V</div>
      </div>

      <div className="orb-shadow"></div>
    </div>
  );
}