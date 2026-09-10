import { useState } from "react";
import { formatName, number } from "../data/api";
import type { PokemonData } from "../data/api";
import { Screw, Speaker } from "./Hardware";
export default function PokemonScreen({
  data,
  loading,
  id,
  back,
  error,
  retry,
}: {
  data?: PokemonData;
  loading: boolean;
  id: number;
  back: boolean;
  error: string;
  retry: () => void;
}) {
  const [failedSprite, setFailedSprite] = useState<string | null>(null);
  const p = data?.pokemon;
  const sprite = p
    ? back
      ? p.sprites.back_default
      : p.sprites.front_default
    : null;
  return (
    <div className="display-bezel">
      <Screw className="tl" />
      <Screw className="tr" />
      <div className="bezel-lights" aria-hidden="true">
        <i />
        <i />
      </div>
      <div
        className={`main-screen ${loading ? "scanning" : ""}`}
        aria-busy={loading}
      >
        <div className="screen-top">
          <span>No. {number(p?.id ?? id)}</span>
          <span className="live-tag">
            {loading ? "SCANNING" : "KANTO"} <i />
          </span>
        </div>
        {p ? (
          <>
            <div className="sprite-stage">
              <div className="target-ring" />
              {sprite && failedSprite !== sprite ? (
                <img
                  key={sprite}
                  src={sprite}
                  alt={`${formatName(p.name)}, ${back ? "back" : "front"} view`}
                  onError={() => setFailedSprite(sprite)}
                />
              ) : (
                <span className="sprite-missing">SPRITE UNAVAILABLE</span>
              )}
              <span className="crosshair c1">+</span>
              <span className="crosshair c2">+</span>
              <span className="sprite-caption">
                {back ? "REAR" : "FRONT"} VIEW · 1:1
              </span>
            </div>
            <div className="pokemon-title">
              <h1>{formatName(p.name)}</h1>
              <span>
                {
                  data?.species.genera.find((g) => g.language.name === "en")
                    ?.genus
                }
              </span>
            </div>
            <div className="types">
              {p.types.map(({ type }) => (
                <span className={`type type-${type.name}`} key={type.name}>
                  {type.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="boot-screen">
            <span className="pixel-ball">◉</span>
            <strong>{error ? "CONNECTION LOST" : "INITIALIZING…"}</strong>
            <span>
              {error
                ? "The field guide is still here."
                : "Connecting to the Kanto archive"}
            </span>
          </div>
        )}
        {error && (
          <div className="screen-error" role="alert">
            <span>Connection interrupted.</span>
            <button onClick={retry}>Retry scan ↻</button>
          </div>
        )}
        <div className="screen-bottom">
          <span>
            ●{" "}
            {loading
              ? `READING #${number(id)}`
              : error
                ? "LINK ERROR"
                : "SPECIMEN IDENTIFIED"}
          </span>
          <span>GEN I</span>
        </div>
      </div>
      <div className="bezel-bottom">
        <span className="bezel-red-dot" />
        <span className="display-label">POKÉMON VISUAL DISPLAY</span>
        <Speaker />
      </div>
      <Screw className="bl" />
      <Screw className="br" />
    </div>
  );
}
