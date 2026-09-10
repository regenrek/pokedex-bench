import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { loadEntry, type Entry } from './api';
vi.mock('./api', async importOriginal => {
  const actual = await importOriginal<typeof import('./api')>();
  return { ...actual, loadEntry: vi.fn(), loadIndex: vi.fn(async () => [{name:'bulbasaur',url:''},{name:'ivysaur',url:''}]) };
});
const names: Record<number, string> = { 1: 'bulbasaur', 2: 'ivysaur', 25: 'pikachu', 151: 'mew' };
function fixture(id: number): Entry {
  return { pokemon: { id, name: names[id] ?? 'pokemon', height: 7, weight: 69, sprites: { front_default: null, back_default: null }, types: [{slot: 1, type: {name:'grass'}}], abilities: [{ability:{name:'overgrow'},is_hidden:false}], stats: [{base_stat:45,stat:{name:'hp'}}] }, species: { flavor_text_entries:[{flavor_text:'A seed\ngrows.',language:{name:'en'}}], genera:[{genus:'Seed Pokémon',language:{name:'en'}}], habitat:{name:'grassland'},capture_rate:45,growth_rate:{name:'medium-slow'} } };
}
beforeEach(() => { vi.mocked(loadEntry).mockImplementation(async query => ({entry: fixture(query.toLowerCase() === 'pikachu' ? 25 : Number(query)), cached: false})); });
describe('Pokédex controls', () => {
  it('boots with Bulbasaur and respects the lower bound', async () => {
    render(<App/>);
    expect(await screen.findByRole('heading',{name:'Bulbasaur'})).toBeVisible();
    expect(screen.getByRole('button',{name:'Previous Pokémon'})).toBeDisabled();
    fireEvent.keyDown(window,{key:'ArrowLeft'});
    expect(loadEntry).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window,{key:'ArrowRight'});
    expect(await screen.findByRole('heading',{name:'Ivysaur'})).toBeVisible();
  });
  it.each(['pikachu','Pikachu','25','025'])('searches %s', async query => {
    render(<App/>); await screen.findByRole('heading',{name:'Bulbasaur'});
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'),query); await user.click(screen.getByRole('button',{name:'Search Pokémon'}));
    expect(await screen.findByRole('heading',{name:'Pikachu'})).toBeVisible();
    expect(screen.getByText('No. 025')).toBeVisible();
  });
  it('keeps the current entry for invalid searches and API failures', async () => {
    render(<App/>); await screen.findByRole('heading',{name:'Bulbasaur'});
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox'),'999'); await user.click(screen.getByRole('button',{name:'Search Pokémon'}));
    expect(screen.getByText('Kanto entries range from 001 to 151.')).toBeVisible();
    vi.mocked(loadEntry).mockRejectedValueOnce(new Error('Connection unavailable.'));
    await user.click(screen.getByRole('button',{name:'Next Pokémon'}));
    await waitFor(() => expect(screen.getByText('Connection unavailable.')).toBeVisible());
    expect(screen.getByRole('heading',{name:'Bulbasaur'})).toBeVisible();
  });
  it('respects the upper bound and leaves keyboard input alone', async () => {
    render(<App/>); await screen.findByRole('heading',{name:'Bulbasaur'});
    const user = userEvent.setup();
    await user.click(screen.getByRole('button',{name:'Go to last Pokémon'}));
    await screen.findByRole('heading',{name:'Mew'});
    expect(screen.getByRole('button',{name:'Next Pokémon'})).toBeDisabled();
    fireEvent.keyDown(window,{key:'ArrowRight'});
    expect(loadEntry).toHaveBeenLastCalledWith('151',expect.any(AbortSignal));
    await user.click(screen.getByRole('textbox')); await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('heading',{name:'Mew'})).toBeVisible();
  });
});
