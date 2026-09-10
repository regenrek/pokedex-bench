import { description, formatName, number } from "../data/api";
import type { PokemonData, Entry } from "../data/api";
export type View = "data" | "stats" | "index";
const STAT_NAMES: Record<string, string> = {
  hp: "HP",
  attack: "ATTACK",
  defense: "DEFENSE",
  "special-attack": "SP. ATK",
  "special-defense": "SP. DEF",
  speed: "SPEED",
};
export default function InfoScreen({
  data,
  view,
  setView,
  index,
  selected,
  navigate,
  indexError,
  retryIndex,
}: {
  data?: PokemonData;
  view: View;
  setView: (v: View) => void;
  index: Entry[];
  selected: number;
  navigate: (id: number) => void;
  indexError: boolean;
  retryIndex: () => void;
}) {
  const p = data?.pokemon;
  return (
    <>
      <div className="screen-tabs" aria-label="Display view">
        {(["data", "stats", "index"] as const).map((tab, i) => (
          <button
            key={tab}
            aria-pressed={view === tab}
            className={view === tab ? "active" : ""}
            onClick={() => setView(tab)}
          >
            <span>0{i + 1}</span> {tab}
          </button>
        ))}
      </div>
      <div className="info-frame">
        <div className="info-screen">
          <div className="info-heading">
            <span>
              {view === "index"
                ? "KANTO INDEX"
                : view === "stats"
                  ? "BASE STATISTICS"
                  : "POKÉMON DATA"}
            </span>
            <span>
              {view === "index"
                ? "151 ENTRIES"
                : `#${number(p?.id ?? selected)}`}
            </span>
          </div>
          {view === "index" ? (
            <div className="index-list" aria-label="Kanto Pokémon index">
              {index.map((entry) => (
                <button
                  key={entry.id}
                  aria-current={selected === entry.id ? "true" : undefined}
                  onClick={() => navigate(entry.id)}
                >
                  <span>{number(entry.id)}</span>
                  {formatName(entry.name)}
                  <span>{selected === entry.id ? "◂" : ""}</span>
                </button>
              ))}
              {!index.length && (
                <p>
                  {indexError ? "Index connection failed." : "Loading index…"}
                  {indexError && (
                    <button onClick={retryIndex}>Retry index</button>
                  )}
                </p>
              )}
            </div>
          ) : p && data ? (
            view === "data" ? (
              <div className="data-content">
                <div className="measurements">
                  <div>
                    <span>HEIGHT</span>
                    <strong>
                      {(p.height / 10).toFixed(1)} <small>m</small>
                    </strong>
                  </div>
                  <div>
                    <span>WEIGHT</span>
                    <strong>
                      {(p.weight / 10).toFixed(1)} <small>kg</small>
                    </strong>
                  </div>
                </div>
                <div className="ability-line">
                  <span>ABILITIES</span>
                  <strong>
                    {p.abilities
                      .map(
                        (a) =>
                          formatName(a.ability.name) +
                          (a.is_hidden ? " *" : ""),
                      )
                      .join(" / ")}
                  </strong>
                </div>
                <div className="field-note">
                  <span>FIELD NOTES / RED VERSION</span>
                  <p>{description(data.species)}</p>
                </div>
                <span className="lcd-footnote">* HIDDEN ABILITY</span>
              </div>
            ) : (
              <div className="stats-content">
                {p.stats.map((stat) => (
                  <div className="stat" key={stat.stat.name}>
                    <span>{STAT_NAMES[stat.stat.name] ?? stat.stat.name}</span>
                    <div className="stat-track">
                      <i
                        style={{ width: `${(stat.base_stat / 255) * 100}%` }}
                      />
                    </div>
                    <strong>{stat.base_stat}</strong>
                  </div>
                ))}
                <div className="stat-total">
                  <span>BASE STAT TOTAL</span>
                  <strong>
                    {p.stats.reduce((sum, s) => sum + s.base_stat, 0)}
                  </strong>
                </div>
              </div>
            )
          ) : (
            <div className="info-empty">
              AWAITING SPECIMEN DATA<span>Establishing research uplink…</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
