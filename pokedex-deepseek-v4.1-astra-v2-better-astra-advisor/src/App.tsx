import { FIRST_ID } from './api/pokeapi';
import { Pokedex } from './components/Pokedex';
import { useDeviceController } from './hooks/useDeviceController';
import type { JSX } from 'react';

/**
 * Application shell. All device behaviour lives in `useDeviceController`;
 * the Pokédex component tree is purely presentational.
 */
export default function App(): JSX.Element {
  const device = useDeviceController(FIRST_ID);
  return <Pokedex device={device} />;
}
