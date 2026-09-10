import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App';
import { ResourceCache } from './api/cache';
import { createPokedexApi } from './api/pokeapi';
import { createFakeRelay } from './test/fakeRelay';

function renderApp() {
  const relay = createFakeRelay();
  const cache = new ResourceCache({ storage: null });
  const api = createPokedexApi({ fetchImpl: relay.fetchImpl, cache });
  const view = render(<App api={api} />);
  return { relay, api, cache, ...view };
}

/** Waits for the LCD to settle on the given entry name. */
async function expectEntry(name: string) {
  await waitFor(() => expect(screen.getByText(name)).toBeInTheDocument());
}

async function openIndexScreen(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /open the Kanto index/i }));
  return screen.findByLabelText('FIND');
}

describe('Pokédex app', () => {
  it('boots on entry #001 and renders live API data', async () => {
    const { relay } = renderApp();

    // The physical device is on screen from the very first paint.
    expect(screen.getByRole('group', { name: /Kanto Pokédex/i })).toBeInTheDocument();

    await expectEntry('BULBASAUR');
    expect(screen.getByText('No. 001')).toBeInTheDocument();
    expect(screen.getByText('0.7 m')).toBeInTheDocument();
    expect(screen.getByText('6.9 kg')).toBeInTheDocument();
    expect(screen.getByText('grass')).toBeInTheDocument();
    expect(screen.getByText('poison')).toBeInTheDocument();
    expect(screen.getByText(/a strange seed was planted/i)).toBeInTheDocument();
    expect(screen.getByText('Overgrow / Chlorophyll (H)')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /HP base stat 45/i })).toBeInTheDocument();

    expect(relay.requests.some((url) => url.endsWith('/pokemon/1'))).toBe(true);
    expect(relay.requests.some((url) => url.endsWith('/pokemon-species/1'))).toBe(true);
    expect(relay.requests.some((url) => url.includes('/pokemon?limit=151'))).toBe(true);
  });

  it('steps forward and backward with the physical D-pad', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    await user.click(screen.getByRole('button', { name: 'Next entry' }));
    await expectEntry('IVYSAUR');
    expect(screen.getByText('No. 002')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous entry' }));
    await expectEntry('BULBASAUR');
    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it('never navigates below #001', async () => {
    renderApp();
    await expectEntry('BULBASAUR');

    expect(screen.getByRole('button', { name: 'Previous entry' })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await expectEntry('BULBASAUR');
    expect(screen.getByText('No. 001')).toBeInTheDocument();
    expect(screen.queryByText('No. 000')).not.toBeInTheDocument();
  });

  it('never navigates above #151', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.type(input, '151');
    await user.click(screen.getByRole('button', { name: 'GO' }));
    await expectEntry('MEW');
    expect(screen.getByText('No. 151')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next entry' })).toBeDisabled();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await expectEntry('MEW');
    expect(screen.queryByText('No. 152')).not.toBeInTheDocument();
  });

  it('navigates with the arrow keys', async () => {
    renderApp();
    await expectEntry('BULBASAUR');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await expectEntry('IVYSAUR');

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await expectEntry('VENUSAUR');

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    await expectEntry('IVYSAUR');
  });

  it('ignores arrow keys while typing in the search field', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.type(input, 'char');
    fireEvent.keyDown(input, { key: 'ArrowRight' });

    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it.each(['pikachu', 'Pikachu', '25', '025'])('resolves the search %s to #025', async (query) => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.clear(input);
    await user.type(input, query);
    await user.click(screen.getByRole('button', { name: 'GO' }));

    await expectEntry('PIKACHU');
    expect(screen.getByText('No. 025')).toBeInTheDocument();
  });

  it('selects an entry straight from the 151-row index', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.type(input, 'gengar');

    const list = screen.getByRole('listbox', { name: /Kanto Pokédex entries/i });
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    await user.click(within(list).getByRole('option', { name: /GENGAR/i }));

    await expectEntry('GENGAR');
    expect(screen.getByText('No. 094')).toBeInTheDocument();
  });

  it('marks the current entry inside the index list', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    await openIndexScreen(user);
    const list = screen.getByRole('listbox', { name: /Kanto Pokédex entries/i });
    expect(within(list).getAllByRole('option')).toHaveLength(151);
    expect(within(list).getByRole('option', { name: /BULBASAUR/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('reports an invalid name search without leaving the device', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.type(input, 'agumon');
    await user.click(screen.getByRole('button', { name: 'GO' }));

    expect(await screen.findByText(/NO ENTRY MATCHES/i)).toHaveTextContent(/AGUMON/);
    expect(screen.getByText('No. 001')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Kanto Pokédex/i })).toBeInTheDocument();
  });

  it('explains an out-of-range number search', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    const input = await openIndexScreen(user);
    await user.type(input, '152');
    await user.click(screen.getByRole('button', { name: 'GO' }));

    expect(await screen.findByText(/OUTSIDE THE KANTO INDEX/i)).toBeInTheDocument();
    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it('jumps to a number typed on the physical keypad', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    await user.click(screen.getByRole('button', { name: 'Keypad 0' }));
    await user.click(screen.getByRole('button', { name: 'Keypad 2' }));
    await user.click(screen.getByRole('button', { name: 'Keypad 5' }));
    expect(screen.getByText(/No\. 025 — PIKACHU/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Open typed entry number/i }));
    await expectEntry('PIKACHU');
  });

  it('reuses the local cache instead of re-requesting visited entries', async () => {
    const user = userEvent.setup();
    const { relay } = renderApp();
    await expectEntry('BULBASAUR');

    await user.click(screen.getByRole('button', { name: 'Next entry' }));
    await expectEntry('IVYSAUR');
    await user.click(screen.getByRole('button', { name: 'Previous entry' }));
    await expectEntry('BULBASAUR');

    // Back on #001 the readout is served from the archive, not the network.
    expect(relay.requests.filter((url) => url.endsWith('/pokemon/1'))).toHaveLength(1);
    expect(await screen.findByText('ARCHIVE')).toBeInTheDocument();
  });

  it('shows the boot sequence while the first entry is in flight', async () => {
    renderApp();
    expect(screen.getByText('MONSTER INDEX')).toBeInTheDocument();
    expect(screen.getByText(/SPINNING UP CARTRIDGE/i)).toBeInTheDocument();
    await expectEntry('BULBASAUR');
    expect(screen.queryByText(/SPINNING UP CARTRIDGE/i)).not.toBeInTheDocument();
  });

  it('keeps the device alive when the API fails and recovers on retry', async () => {
    const user = userEvent.setup();
    const relay = createFakeRelay();
    relay.failMatching(null, 503);
    const api = createPokedexApi({ fetchImpl: relay.fetchImpl, cache: new ResourceCache({ storage: null }) });
    render(<App api={api} />);

    expect(await screen.findByText('LINK ERROR')).toBeInTheDocument();
    expect(screen.getByText(/LINK FAULT 503/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Kanto Pokédex/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next entry' })).toBeInTheDocument();

    relay.clearFailures();
    await user.click(screen.getByRole('button', { name: /RETRY LINK/i }));
    await expectEntry('BULBASAUR');
    expect(screen.queryByText('LINK ERROR')).not.toBeInTheDocument();
  });

  it('keeps the last good entry on screen when a later request fails', async () => {
    const user = userEvent.setup();
    const { relay } = renderApp();
    await expectEntry('BULBASAUR');

    relay.failMatching(/\/pokemon(-species)?\/2$/, 500);
    await user.click(screen.getByRole('button', { name: 'Next entry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/No\. 002 UNAVAILABLE/i);
    expect(screen.getByText('BULBASAUR')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Kanto Pokédex/i })).toBeInTheDocument();
  });

  it('cycles the main screen with the DATA, A and B controls', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    expect(screen.getByText('SPECIES DATA')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /A button — next screen/i }));
    expect(screen.getByText('BASE STATS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /B button — previous screen/i }));
    expect(screen.getByText('SPECIES DATA')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByText('BASE STATS')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /DATA — open the species data screen/i }));
    expect(screen.getByText('SPECIES DATA')).toBeInTheDocument();
  });

  it('switches the right-hand reference tabs', async () => {
    const user = userEvent.setup();
    renderApp();
    await expectEntry('BULBASAUR');

    expect(screen.getByText('AREA MAP')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'VITALS' }));
    expect(screen.getByText('MONSTER, PLANT')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'NOTES' }));
    expect(screen.getByText('LOGGED')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'SUMMARY' }));
    expect(screen.getByText('SEED POKÉMON')).toBeInTheDocument();
  });
});
