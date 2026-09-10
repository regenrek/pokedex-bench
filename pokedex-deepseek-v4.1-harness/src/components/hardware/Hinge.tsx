/** The central barrel hinge that joins the two halves of the casing. */
export function Hinge() {
  return (
    <div className="pokedex__hinge" aria-hidden="true">
      <div className="hinge__bar" />
      <span className="hinge__knuckle" />
      <span className="hinge__knuckle" />
      <span className="hinge__knuckle" />
    </div>
  );
}
