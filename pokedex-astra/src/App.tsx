import { useCallback, useEffect, useRef, useState } from "react";
import { getIndex, getPokemon, number, resolveSearch } from "./data/api";
import type { Entry, PokemonData } from "./data/api";
import PokemonScreen from "./components/PokemonScreen";
import InfoScreen from "./components/InfoScreen";
import type { View } from "./components/InfoScreen";
import { Dpad, Screw } from "./components/Hardware";
export default function App() {
  const [id, setId] = useState(1);
  const [data, setData] = useState<PokemonData>();
  const [index, setIndex] = useState<Entry[]>([]);
  const [indexError, setIndexError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [view, setView] = useState<View>("data");
  const [back, setBack] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadIndex = useCallback(() => {
    setIndexError(false);
    void getIndex()
      .then(setIndex)
      .catch(() => setIndexError(true));
  }, []);
  useEffect(loadIndex, [loadIndex]);
  useEffect(() => {
    let active = true;
    getPokemon(id)
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not connect to PokéAPI. Retry the scan.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);
  const navigate = useCallback(
    (next: number) => {
      const target = Math.max(1, Math.min(151, next));
      if (target === id) return;
      setLoading(true);
      setError("");
      setSearchError("");
      setBack(false);
      setId(target);
    },
    [id],
  );
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        (event.target.closest(
          'input,textarea,select,[contenteditable="true"]',
        ) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey)
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        navigate(id + (event.key === "ArrowLeft" ? -1 : 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, navigate]);
  function search() {
    const found = resolveSearch(query, index);
    if (found) {
      navigate(found);
      setSearchError("");
    } else
      setSearchError(
        indexError && !/^\d+$/.test(query.trim())
          ? "Name index unavailable. Try a number, or retry the index."
          : "No match. Try a name or a number from 001–151.",
      );
  }
  function retry() {
    setError("");
    setLoading(true);
    setAttempt((a) => a + 1);
  }
  return (
    <main className="workspace">
      <header className="page-header">
        <a className="brand" href="./" aria-label="Pokédex home">
          <span className="pokeball-logo" />{" "}
          <span>
            FIELDWORK<span className="brand-divider">/</span>
            <b>POKÉDEX</b>
          </span>
        </a>
        <span className="edition">
          KANTO COLLECTION <span>VOL. 01</span>
        </span>
      </header>
      <div className="intro">
        <span className="eyebrow">PROFESSOR OAK’S RESEARCH LAB</span>
        <h2>
          A world of discovery.
          <br className="mobile-break" /> In your hands.
        </h2>
        <p>The original 151. One iconic field companion.</p>
      </div>
      <section className="device" aria-label="Interactive Kanto Pokédex">
        <div className="left-half">
          <div className="sensor-panel">
            <div className={`lens-mount ${loading ? "is-scanning" : ""}`}>
              <div className="blue-lens" />
            </div>
            <div className="indicators">
              <div>
                <i className="lamp red" />
                <span>POWER</span>
              </div>
              <div>
                <i className={`lamp yellow ${loading ? "lit" : ""}`} />
                <span>SCAN</span>
              </div>
              <div>
                <i
                  className={`lamp green ${!loading && !error ? "lit" : ""}`}
                />
                <span>LINK</span>
              </div>
            </div>
            <div className="model-mark">
              ポケモン図鑑<span>MODEL / K–01</span>
            </div>
          </div>
          <div className="left-body">
            <div className="hardware-caption">
              <span>POKÉDEX</span>
              <span>PORTABLE ENCYCLOPEDIA</span>
            </div>
            <PokemonScreen
              data={data}
              id={id}
              loading={loading}
              error={error}
              retry={retry}
              back={back}
            />
            <div className="left-controls">
              <div className="round-control">
                <button
                  className="black-round"
                  aria-label="Flip Pokémon sprite"
                  aria-pressed={back}
                  onClick={() => setBack((b) => !b)}
                >
                  ↻
                </button>
                <span>ROTATE</span>
              </div>
              <div className="mini-controls">
                <div className="pills">
                  <button
                    className="pill coral"
                    onClick={() => setView("data")}
                    aria-label="View Pokémon data"
                  />
                  <button
                    className="pill blue"
                    onClick={() => setView("stats")}
                    aria-label="View base stats"
                  />
                </div>
                <div className="mini-lcd">
                  <span>NATIONAL INDEX</span>
                  <strong>
                    {number(id)} <small>/ 151</small>
                  </strong>
                </div>
              </div>
              <Dpad id={id} navigate={navigate} setView={setView} />
            </div>
            <div className="left-bottom">
              <span>EXPLORE. RECORD. DISCOVER.</span>
              <span className="etched-mark">◆</span>
            </div>
          </div>
          <Screw className="case-screw" />
        </div>
        <div className="hinge" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="right-half">
          <div className="right-top">
            <span className="device-wordmark">
              KANTO <b>151</b>
            </span>
            <span className="serial">
              REGIONAL DATABASE
              <br />
              1996 · FIRST GENERATION
            </span>
            <Screw />
          </div>
          <div className="right-body">
            <InfoScreen
              data={data}
              view={view}
              setView={setView}
              index={index}
              selected={id}
              navigate={navigate}
              indexError={indexError}
              retryIndex={loadIndex}
            />
            <div className="search-label">
              <label htmlFor="pokemon-search">SPECIMEN LOOKUP</label>
              <span>NAME / NO.</span>
            </div>
            <form
              className="search-form"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <span aria-hidden="true">⌕</span>
              <input
                id="pokemon-search"
                ref={searchRef}
                placeholder="Name or number…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchError("");
                }}
                aria-invalid={!!searchError}
                aria-describedby="search-status"
                autoComplete="off"
              />
              <button aria-label="Search Pokémon" type="submit">
                ↵
              </button>
            </form>
            <div
              id="search-status"
              className={`lookup-status ${searchError ? "invalid" : ""}`}
              role="status"
            >
              {searchError ||
                (loading
                  ? `Receiving specimen #${number(id)}…`
                  : error
                    ? error
                    : data?.cached
                      ? "● Local memory · specimen restored"
                      : "● Research link established")}
            </div>
            <div className="keypad-area">
              <div className="keypad" aria-label="Number keypad">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  "⌫",
                  "0",
                  "↵",
                ].map((key) => (
                  <button
                    key={key}
                    aria-label={
                      key === "⌫"
                        ? "Delete last search character"
                        : key === "↵"
                          ? "Submit keypad search"
                          : `Enter ${key}`
                    }
                    onClick={() => {
                      if (key === "↵") search();
                      else {
                        setQuery((q) =>
                          key === "⌫" ? q.slice(0, -1) : q + key,
                        );
                        setSearchError("");
                      }
                    }}
                  >
                    {key}
                  </button>
                ))}
              </div>
              <div className="keypad-side">
                <div className="vents" aria-hidden="true">
                  {Array.from({ length: 16 }, (_, i) => (
                    <i key={i} />
                  ))}
                </div>
                <span>
                  RESEARCH
                  <br />
                  WITHOUT LIMITS.
                </span>
                <button
                  className="amber-button"
                  onClick={() => {
                    setQuery("");
                    setSearchError("");
                    searchRef.current?.focus();
                  }}
                >
                  CLEAR
                </button>
              </div>
            </div>
            <div className="navigation-controls">
              <button disabled={id === 1} onClick={() => navigate(id - 1)}>
                <span>◂</span> PREV
              </button>
              <button
                onClick={() => setView(view === "index" ? "data" : "index")}
                aria-pressed={view === "index"}
                className="index-toggle"
              >
                ☷ INDEX
              </button>
              <button disabled={id === 151} onClick={() => navigate(id + 1)}>
                NEXT <span>▸</span>
              </button>
            </div>
            <div className="cartridge">
              <span>▰ KANTO REGION</span>
              <span>DATA CARTRIDGE ▴</span>
            </div>
          </div>
        </div>
      </section>
      <footer className="page-footer">
        <span>
          <i className="connection-dot" /> 151 POKÉMON. ENDLESS CURIOSITY.
        </span>
        <span className="keyboard-hint">
          <kbd>←</kbd>
          <kbd>→</kbd> to explore <i /> A little nostalgia. A lot to discover.
        </span>
      </footer>
      <div className="credits">
        Pokémon data & sprites by{" "}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer">
          PokéAPI
        </a>
        <span>·</span> An unofficial fan-made field guide.
      </div>
    </main>
  );
}
