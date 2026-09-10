/** The blue fresnel lens in the top-left corner of the casing. */
export function Lens() {
  return (
    <div className="lens-socket" aria-hidden="true">
      <div className="lens">
        <span className="lens__gloss" />
        <span className="lens__spark" />
      </div>
    </div>
  );
}
