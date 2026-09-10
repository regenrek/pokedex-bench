export function Screw({ className = "" }: { className?: string }) {
  return <i aria-hidden="true" className={`screw ${className}`} />;
}
export function Speaker() {
  return (
    <div className="speaker" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
export function Dpad({
  id,
  navigate,
  setView,
}: {
  id: number;
  navigate: (id: number) => void;
  setView: (view: "data" | "stats") => void;
}) {
  return (
    <div className="dpad" aria-label="Directional controls">
      <button
        className="up"
        aria-label="Show data"
        onClick={() => setView("data")}
      >
        ▴
      </button>
      <button
        className="left"
        aria-label="Previous Pokémon"
        disabled={id === 1}
        onClick={() => navigate(id - 1)}
      >
        ◂
      </button>
      <span className="dpad-center" />
      <button
        className="right"
        aria-label="Next Pokémon"
        disabled={id === 151}
        onClick={() => navigate(id + 1)}
      >
        ▸
      </button>
      <button
        className="down"
        aria-label="Show stats"
        onClick={() => setView("stats")}
      >
        ▾
      </button>
    </div>
  );
}
