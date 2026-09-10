/**
 * End-to-end behaviour of the Pokédex device through the real component tree.
 * Covers the acceptance list: default load, navigation + boundaries, keyboard,
 * search forms, invalid search, API-rendered data, caching and error survival.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { clearApiCache } from '../src/api/pokeapi';
import { installFetchMock, type FetchMock } from './fetchMock';

let mock: FetchMock;

beforeEach(() => {
  clearApiCache();
  mock = installFetchMock();
});

afterEach(() => {
  mock.restore();
  clearApiCache();
});

const exact = (suffix: string) => (url: string) => url.endsWith(suffix);

async function renderDevice() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText('Bulbasaur');
  return user;
}

const nextButton = () => screen.getByRole('button', { name: 'Next Pokémon (A)' });
const prevButton = () => screen.getByRole('button', { name: 'Previous Pokémon (B)' });
const searchBox = () => screen.getByLabelText('Search Pokémon by name or number');
const status = () => screen.getByTestId('main-status');

describe('Pokédex application', () => {
  it('loads #001 Bulbasaur by default', async () => {
    await renderDevice();
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
    expect(screen.getByText('No. 001')).toBeInTheDocument();
    expect(status()).toHaveTextContent('RECORD READY');
    // The device casing, not just a card grid, is on screen.
    expect(screen.getByTestId('pokedex-device')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pokédex main display' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pokédex information display' })).toBeInTheDocument();
  });

  it('navigates with the physical next/previous buttons', async () => {
    const user = await renderDevice();

    await user.click(nextButton());
    await screen.findByText('Ivysaur');
    expect(screen.getByText('No. 002')).toBeInTheDocument();

    await user.click(prevButton());
    await screen.findByText('Bulbasaur');
    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it('navigates with the D-pad and the A/B buttons', async () => {
    const user = await renderDevice();

    await user.click(screen.getByRole('button', { name: /D-pad right/ }));
    await screen.findByText('Ivysaur');

    await user.click(screen.getByRole('button', { name: /D-pad left/ }));
    await screen.findByText('Bulbasaur');
  });

  it('respects the #001 lower boundary', async () => {
    const user = await renderDevice();
    expect(prevButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: /D-pad left/ })).toBeDisabled();

    // Forcing the boundary through the keyboard must not move past #001.
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(status()).toHaveTextContent('AT INDEX START'));
    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it('respects the #151 upper boundary', async () => {
    const user = await renderDevice();

    await user.click(screen.getByRole('button', { name: /Confirm/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Pokémon index' });
    await user.click(within(dialog).getByRole('option', { name: /151\s*Mew/i }));

    await screen.findByText('Mew');
    expect(screen.getByText('No. 151')).toBeInTheDocument();
    expect(nextButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: /D-pad right/ })).toBeDisabled();

    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(status()).toHaveTextContent('AT INDEX END'));
    expect(screen.getByText('No. 151')).toBeInTheDocument();
  });

  it('navigates with the keyboard arrow keys', async () => {
    const user = await renderDevice();

    await user.keyboard('{ArrowRight}');
    await screen.findByText('Ivysaur');

    await user.keyboard('{ArrowRight}');
    await screen.findByText('Venusaur');

    await user.keyboard('{ArrowLeft}');
    await screen.findByText('Ivysaur');
  });

  it('resolves the search term "pikachu"', async () => {
    const user = await renderDevice();

    await user.type(searchBox(), 'pikachu');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await screen.findByText('Pikachu');
    expect(screen.getByText('No. 025')).toBeInTheDocument();
  });

  it('resolves the search terms "25" and "025" to #025', async () => {
    const user = await renderDevice();

    await user.type(searchBox(), '25');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('Pikachu');
    expect(screen.getByText('No. 025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show species data' }));
    await user.clear(searchBox());
    await user.type(searchBox(), '025');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('No. 025')).toBeInTheDocument();
  });

  it('resolves a number typed on the physical keypad', async () => {
    const user = await renderDevice();

    await user.click(screen.getByRole('button', { name: 'Key 2' }));
    await user.click(screen.getByRole('button', { name: 'Key 5' }));
    expect(status()).toHaveTextContent('ENTRY 25');

    await user.click(screen.getByRole('button', { name: 'Enter number and jump' }));
    await screen.findByText('Pikachu');
    expect(screen.getByText('No. 025')).toBeInTheDocument();
  });

  it('shows an invalid search state for unknown names', async () => {
    const user = await renderDevice();

    await user.type(searchBox(), 'missingno');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() => expect(status()).toHaveTextContent('MISSINGNO'));
    expect(status()).toHaveTextContent('NOT IN THIS INDEX');
    // The device stays on screen and keeps the current record.
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
  });

  it('shows a range error for out-of-range numbers', async () => {
    const user = await renderDevice();

    await user.type(searchBox(), '999');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(status()).toHaveTextContent('BEYOND KANTO'));

    await user.clear(searchBox());
    await user.type(searchBox(), '0');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(status()).toHaveTextContent('BELOW THIS INDEX'));
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument();
  });

  it('renders Pokémon data from the API response', async () => {
    const user = await renderDevice();
    const main = () => within(screen.getByRole('region', { name: 'Pokédex main display' }));

    expect(main().getByText('Seed Pokémon')).toBeInTheDocument();
    expect(main().getByText('GRASS')).toBeInTheDocument();
    expect(main().getByText('POISON')).toBeInTheDocument();
    expect(main().getByText('0.7 m')).toBeInTheDocument();
    expect(main().getByText('6.9 kg')).toBeInTheDocument();
    expect(main().getByText('Overgrow')).toBeInTheDocument();
    expect(main().getByText('Chlorophyll (hidden)')).toBeInTheDocument();
    // Flavour text is cleaned of newline/form-feed artefacts.
    expect(
      main().getByText(/A strange seed was planted on its back at birth/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/[\f\n]/)).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'STATS' }));
    expect(main().getByText('BASE STATS')).toBeInTheDocument();
    expect(main().getByRole('meter', { name: 'HP base stat' })).toHaveAttribute(
      'aria-valuenow',
      '45',
    );
    expect(main().getByText('TOTAL')).toBeInTheDocument();
  });

  it('uses the local cache for repeated navigation', async () => {
    const user = await renderDevice();

    await user.click(nextButton());
    await screen.findByText('Ivysaur');
    await user.click(prevButton());
    await screen.findByText('Bulbasaur');

    expect(mock.calls.filter(exact('/pokemon/1'))).toHaveLength(1);
    expect(mock.calls.filter(exact('/pokemon-species/1'))).toHaveLength(1);
    expect(mock.calls.filter(exact('/pokemon/2'))).toHaveLength(1);
    expect(mock.count('pokemon?limit=151&offset=0')).toBe(1);
  });

  it('survives an API failure without crashing and can retry', async () => {
    mock.breakNext(/\/pokemon\/1$/);
    const user = userEvent.setup();
    render(<App />);

    const errorPanel = await screen.findByTestId('main-error');
    expect(errorPanel).toBeInTheDocument();
    expect(screen.getByTestId('pokedex-device')).toBeInTheDocument();

    mock.recover();
    await user.click(within(errorPanel).getByRole('button', { name: 'RETRY' }));
    await screen.findByText('Bulbasaur');
    expect(screen.queryByTestId('main-error')).toBeNull();
  });

  it('keeps the device visible while loading a new record', async () => {
    const user = await renderDevice();

    await user.click(nextButton());
    // The casing and the LCD remain mounted during the transition.
    expect(screen.getByTestId('pokedex-device')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Pokédex main display' })).toBeInTheDocument();
    await screen.findByText('Ivysaur');
  });

  it('moves focus into the index and keeps arrows inside it', async () => {
    const user = await renderDevice();

    const confirm = screen.getByRole('button', { name: /Confirm/ });
    await user.click(confirm);
    const dialog = await screen.findByRole('dialog', { name: 'Pokémon index' });

    // Focus lands on the currently selected entry.
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/001\s*Bulbasaur/),
    );

    // Arrow keys belong to the list, not to the device.
    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/002\s*Ivysaur/),
    );
    expect(screen.getByTestId('info-detail')).toHaveTextContent('SUMMARY');
    expect(screen.getByText('No. 001')).toBeInTheDocument();

    // Escape closes and returns focus to the control that opened it.
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Pokémon index' })).toBeNull(),
    );
    expect(document.activeElement).toBe(confirm);
    expect(within(dialog).queryByRole('listbox')).not.toBeNull();
  });

  it('moves focus into the index even when loading failed', async () => {
    mock.failNext('pokemon?limit=151&offset=0', 500);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Bulbasaur');

    await user.click(screen.getByRole('button', { name: /Confirm/ }));
    const retry = await screen.findByRole('button', { name: 'RETRY INDEX' });
    await waitFor(() => expect(document.activeElement).toBe(retry));

    mock.recover();
    await user.click(retry);
    await screen.findByRole('option', { name: /025\s*Pikachu/i });
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent(/001\s*Bulbasaur/),
    );
  });

  it('follows the ARIA tabs pattern without changing Pokémon', async () => {
    const user = await renderDevice();

    const dataTab = screen.getByRole('tab', { name: 'DATA' });
    dataTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'STATS' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'STATS' }));
    expect(screen.getByText('No. 001')).toBeInTheDocument();
  });

  it('recovers when the index request fails', async () => {
    mock.failNext('pokemon?limit=151&offset=0', 500);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Bulbasaur');

    // A failed index is reported differently from a pending one.
    await user.type(searchBox(), 'pikachu');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(status()).toHaveTextContent('INDEX UNAVAILABLE'));
    expect(status()).not.toHaveTextContent('STILL LOADING');

    // Recovery is available from the index dialog.
    await user.click(screen.getByRole('button', { name: /Confirm/ }));
    await screen.findByRole('dialog', { name: 'Pokémon index' });
    const retry = await screen.findByRole('button', { name: 'RETRY INDEX' });

    mock.recover();
    await user.click(retry);
    await screen.findByRole('option', { name: /025\s*Pikachu/i });

    // Search works again once the index is back, without a reload.
    await user.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('Pikachu');
    expect(screen.getByText('No. 025')).toBeInTheDocument();
  });

  it('switches information sections with the D-pad', async () => {
    const user = await renderDevice();
    expect(screen.getByTestId('info-detail')).toHaveTextContent('SUMMARY');

    await user.click(screen.getByRole('button', { name: /D-pad down/ }));
    expect(screen.getByTestId('info-detail')).toHaveTextContent('HABITAT');

    await user.click(screen.getByRole('button', { name: /D-pad up/ }));
    expect(screen.getByTestId('info-detail')).toHaveTextContent('SUMMARY');
  });
});
