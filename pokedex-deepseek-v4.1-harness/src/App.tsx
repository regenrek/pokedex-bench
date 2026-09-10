import { pokedexApi, type PokedexApi } from './api/pokeapi';
import { Pokedex } from './components/Pokedex';
import { PokedexProvider } from './state/PokedexProvider';

export interface AppProps {
  /** Overridable for tests; the app always uses the shared singleton in production. */
  api?: PokedexApi;
}

export default function App({ api = pokedexApi }: AppProps) {
  return (
    <PokedexProvider api={api}>
      <div className="app">
        <Pokedex />
      </div>
    </PokedexProvider>
  );
}
