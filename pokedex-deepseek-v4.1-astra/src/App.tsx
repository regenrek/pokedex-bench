import { PokedexDevice } from './components/PokedexDevice'

export default function App() {
  return (
    <main className="stage">
      <PokedexDevice />
      <p className="stage__hint">
        ← → STEP ENTRIES · HOME / END BOUNDS · “/” FOCUS SEARCH · D-PAD ↑ ↓ ±10
      </p>
    </main>
  )
}
