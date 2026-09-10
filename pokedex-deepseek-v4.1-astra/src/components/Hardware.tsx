/** Decorative casing hardware: screws, lens, indicator lamps, vents, speaker grille. */

export function Screw({ className = '' }: { className?: string }) {
  return <span className={`screw ${className}`.trim()} aria-hidden="true" />
}

export function Lens() {
  return (
    <div className="lens" aria-hidden="true">
      <div className="lens__glass" />
    </div>
  )
}

export interface LampProps {
  tone: 'power' | 'scan' | 'link'
  label: string
  lit?: boolean
}

export function Lamp({ tone, label, lit = true }: LampProps) {
  return (
    <div className={`lamp lamp--${tone}${lit ? ' is-lit' : ''}`}>
      <span className="lamp__dot" aria-hidden="true" />
      <span className="lamp__label">{label}</span>
    </div>
  )
}

export function Vents({ count = 3 }: { count?: number }) {
  return (
    <div className="vents" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="vents__slot" />
      ))}
    </div>
  )
}

export function SpeakerGrille({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="grille" aria-hidden="true">
      {Array.from({ length: rows * cols }, (_, index) => (
        <span key={index} className="grille__hole" />
      ))}
    </div>
  )
}

/** The barrel hinge that physically joins the two halves. */
export function Hinge() {
  return (
    <div className="hinge" aria-hidden="true">
      <div className="hinge__bar" />
      <div className="hinge__knuckles">
        <span className="hinge__knuckle" />
        <span className="hinge__knuckle" />
        <span className="hinge__knuckle" />
      </div>
    </div>
  )
}
