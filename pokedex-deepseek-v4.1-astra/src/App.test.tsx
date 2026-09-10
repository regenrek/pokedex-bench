import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { cacheKeys, clearCache, dropMemory } from './api/cache'
import { installApiMock, type ApiMock } from './test/apiMock'

let api: ApiMock

beforeEach(() => {
  clearCache()
  localStorage.clear()
  api = installApiMock()
})

afterEach(() => {
  api.restore()
})

const mainScreen = () => screen.getByRole('region', { name: 'Selected entry display' })
const infoScreen = () => screen.getByRole('region', { name: 'Information display' })
const dexNumber = () =>
  (within(mainScreen()).getByText(/^No\.\s*\d{3}$/).textContent ?? '').replace(/\u00a0/g, ' ')
const searchField = () => screen.getByLabelText('SEARCH')
const scanButton = () => screen.getByRole('button', { name: 'SCAN' })
const nextButtons = () => screen.getAllByRole('button', { name: 'Next entry' })
const prevButtons = () => screen.getAllByRole('button', { name: 'Previous entry' })

async function setup() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('heading', { name: 'Bulbasaur' })
  return user
}

async function search(user: ReturnType<typeof userEvent.setup>, query: string) {
  const field = searchField()
  await user.clear(field)
  if (query) await user.type(field, query)
  await user.click(scanButton())
}

describe('initial load', () => {
  it('opens on entry 001 with data taken from the API response', async () => {
    await setup()

    expect(dexNumber()).toBe('No. 001')
    expect(within(mainScreen()).getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()
    expect(within(mainScreen()).getByText('GRASS')).toBeInTheDocument()
    expect(within(mainScreen()).getByText('POISON')).toBeInTheDocument()
    // the mock reports height = id decimetres and weight = id * 2 hectograms
    expect(within(mainScreen()).getByText('0.1 m')).toBeInTheDocument()
    expect(within(mainScreen()).getByText('0.2 kg')).toBeInTheDocument()
    expect(within(mainScreen()).getByText('Seed Pokémon')).toBeInTheDocument()
    expect(
      within(infoScreen()).getByText('Entry 1 stores power in its cheeks.'),
    ).toBeInTheDocument()
    expect(within(mainScreen()).getByText('LIVE LINK')).toBeInTheDocument()
  })

  it('fetches the index once and only the selected entry detail', async () => {
    await setup()

    expect(api.countFor(/\/pokemon\?limit=151&offset=0$/)).toBe(1)
    expect(api.countFor(/\/pokemon\/\d+$/)).toBe(1)
    expect(api.countFor(/\/pokemon-species\/\d+$/)).toBe(1)
  })
})

describe('navigation', () => {
  it('steps with the physical next/previous controls and disables them at the bounds', async () => {
    const user = await setup()

    expect(prevButtons().every((button) => button.hasAttribute('disabled'))).toBe(true)

    await user.click(nextButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 002'))
    expect(await screen.findByRole('heading', { name: 'Ivysaur' })).toBeInTheDocument()

    await user.click(prevButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 001'))

    await user.click(screen.getByRole('button', { name: 'Jump to entry 151, Mew' }))
    await waitFor(() => expect(dexNumber()).toBe('No. 151'))
    expect(await screen.findByRole('heading', { name: 'Mew' })).toBeInTheDocument()
    expect(nextButtons().every((button) => button.hasAttribute('disabled'))).toBe(true)
  })

  it('clamps ±10 D-pad jumps to the 001–151 window', async () => {
    const user = await setup()

    const down = () => screen.getByRole('button', { name: 'Down ten entries' })
    const up = () => screen.getByRole('button', { name: 'Up ten entries' })

    expect(down()).toBeDisabled()
    expect(up()).toBeEnabled()

    await user.click(up())
    await waitFor(() => expect(dexNumber()).toBe('No. 011'))

    await search(user, '5')
    await waitFor(() => expect(dexNumber()).toBe('No. 005'))
    await user.click(down())
    await waitFor(() => expect(dexNumber()).toBe('No. 001'))

    await user.click(screen.getByRole('button', { name: 'Jump to entry 151, Mew' }))
    await waitFor(() => expect(dexNumber()).toBe('No. 151'))
    expect(up()).toBeDisabled()
    await user.click(up())
    expect(dexNumber()).toBe('No. 151')
  })

  it('navigates with the keyboard and stays out of the way while typing', async () => {
    const user = await setup()

    await user.keyboard('{ArrowRight}')
    await waitFor(() => expect(dexNumber()).toBe('No. 002'))

    await user.keyboard('{ArrowLeft}')
    await waitFor(() => expect(dexNumber()).toBe('No. 001'))

    await user.keyboard('{End}')
    await waitFor(() => expect(dexNumber()).toBe('No. 151'))

    await user.keyboard('{Home}')
    await waitFor(() => expect(dexNumber()).toBe('No. 001'))

    const field = searchField()
    await user.click(field)
    await user.type(field, 'pikachu')
    await user.keyboard('{ArrowRight}{ArrowRight}')

    expect(field).toHaveValue('pikachu')
    expect(dexNumber()).toBe('No. 001')
  })

  it('ignores a slow response that arrives after a newer selection', async () => {
    const user = await setup()
    api.delays.set(2, 120)
    api.delays.set(3, 5)

    await user.click(nextButtons()[0]) // -> 002, slow
    await user.click(nextButtons()[0]) // -> 003, fast

    await waitFor(() => expect(dexNumber()).toBe('No. 003'))
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(dexNumber()).toBe('No. 003')
    expect(within(mainScreen()).getByRole('heading', { name: 'Species 3' })).toBeInTheDocument()
  })
})

describe('search', () => {
  it('resolves pikachu, Pikachu, 25 and 025 to entry 025', async () => {
    const user = await setup()

    for (const query of ['pikachu', 'Pikachu', '25', '025']) {
      await search(user, query)
      await waitFor(() => expect(dexNumber()).toBe('No. 025'))
      expect(within(mainScreen()).getByRole('heading', { name: 'Pikachu' })).toBeInTheDocument()
    }

    expect(within(mainScreen()).getByText('ELECTRIC')).toBeInTheDocument()
    expect(within(infoScreen()).getByText('Entry 25 stores power in its cheeks.')).toBeInTheDocument()
  })

  it('resolves punctuated Gen I names', async () => {
    const user = await setup()

    await search(user, 'Mr. Mime')
    await waitFor(() => expect(dexNumber()).toBe('No. 122'))
    expect(within(mainScreen()).getByRole('heading', { name: 'Mr. Mime' })).toBeInTheDocument()

    await search(user, "Farfetch'd")
    await waitFor(() => expect(dexNumber()).toBe('No. 083'))
    expect(within(mainScreen()).getByRole('heading', { name: "Farfetch'd" })).toBeInTheDocument()

    await search(user, 'Nidoran ♀')
    await waitFor(() => expect(dexNumber()).toBe('No. 029'))
  })

  it('keeps the current entry and explains invalid, empty and out-of-range input', async () => {
    const user = await setup()

    await search(user, 'missingno')
    expect(await screen.findByRole('alert')).toHaveTextContent(/No Kanto entry matches/)
    expect(dexNumber()).toBe('No. 001')

    await search(user, '152')
    expect(await screen.findByRole('alert')).toHaveTextContent(/outside the Kanto index/)
    expect(dexNumber()).toBe('No. 001')

    await search(user, '')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Enter a name or a dex number/)
    expect(dexNumber()).toBe('No. 001')
    expect(within(mainScreen()).getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()

    await search(user, 'pikachu')
    await waitFor(() => expect(dexNumber()).toBe('No. 025'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('index view', () => {
  it('lists all 151 entries and selects from the list', async () => {
    const user = await setup()

    await user.click(screen.getByRole('button', { name: 'INDEX' }))
    const rows = await screen.findAllByRole('button', { name: /^\d{3} \S/ })
    expect(rows).toHaveLength(151)

    await user.click(screen.getByRole('button', { name: '025 Pikachu' }))
    await waitFor(() => expect(dexNumber()).toBe('No. 025'))
    expect(screen.getByRole('button', { name: '025 Pikachu' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('stays available while a search is invalid', async () => {
    const user = await setup()

    await search(user, 'zzz')
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'INDEX' }))
    expect(await screen.findAllByRole('button', { name: /^\d{3} \S/ })).toHaveLength(151)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('caching', () => {
  it('revisits a cached entry without refetching and reports MEMORY', async () => {
    const user = await setup()

    await user.click(nextButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 002'))
    await user.click(prevButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 001'))

    expect(api.countFor(/\/pokemon\/1$/)).toBe(1)
    expect(api.countFor(/\/pokemon-species\/1$/)).toBe(1)
    expect(within(mainScreen()).getByText('MEMORY')).toBeInTheDocument()
  })

  it('falls back to the persisted layer and labels it CACHED', async () => {
    const user = await setup()
    await user.click(nextButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 002'))

    // Simulate a page reload: the in-memory layer is gone, localStorage is not.
    dropMemory(cacheKeys.pokemon(2))
    dropMemory(cacheKeys.species(2))

    await user.click(nextButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 003'))
    await user.click(prevButtons()[0])
    await waitFor(() => expect(dexNumber()).toBe('No. 002'))

    expect(api.countFor(/\/pokemon\/2$/)).toBe(1)
    expect(within(mainScreen()).getByText('CACHED')).toBeInTheDocument()
  })
})

describe('failures', () => {
  it('shows an actionable fault, keeps the entry identified and recovers on Retry', async () => {
    const user = await setup()
    api.failIds.add(4)

    await search(user, '4')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/HTTP 503/)
    expect(dexNumber()).toBe('No. 001')

    api.failIds.delete(4)
    await user.click(screen.getByRole('button', { name: 'RETRY' }))

    expect(await screen.findByRole('heading', { name: 'Charmander' })).toBeInTheDocument()
    expect(dexNumber()).toBe('No. 004')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps working when the species record is missing', async () => {
    api.failSpeciesIds.add(1)
    await setup()

    expect(within(mainScreen()).getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()
    expect(within(infoScreen()).getByText(/SPECIES RECORD PARTIAL/)).toBeInTheDocument()
  })

  it('recovers the species record in place and keeps the cached Pokémon record', async () => {
    api.failSpeciesIds.add(1)
    const user = await setup()

    const panel = within(infoScreen())
    expect(panel.getByText(/SPECIES RECORD PARTIAL/)).toBeInTheDocument()
    expect(within(mainScreen()).getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()
    expect(api.countFor(/\/pokemon\/1$/)).toBe(1)
    expect(api.countFor(/\/pokemon-species\/1$/)).toBe(1)

    api.failSpeciesIds.delete(1)
    await user.click(panel.getByRole('button', { name: 'RETRY SPECIES' }))

    expect(await panel.findByText('Entry 1 stores power in its cheeks.')).toBeInTheDocument()
    expect(panel.queryByText(/SPECIES RECORD PARTIAL/)).not.toBeInTheDocument()
    // Only the missing species resource was refetched; the Pokémon record stayed cached.
    expect(api.countFor(/\/pokemon\/1$/)).toBe(1)
    expect(api.countFor(/\/pokemon-species\/1$/)).toBe(2)
  })

  it('recovers a failed index list and still searches numbers meanwhile', async () => {
    api.failList = true
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Bulbasaur' })

    await search(user, '25')
    await waitFor(() => expect(dexNumber()).toBe('No. 025'))

    await user.click(screen.getByRole('button', { name: 'INDEX' }))
    const retryList = await screen.findByRole('button', { name: 'RETRY LIST' })

    api.failList = false
    await user.click(retryList)

    expect(await screen.findAllByRole('button', { name: /^\d{3} \S/ })).toHaveLength(151)
  })

  it('degrades gracefully when a sprite cannot be loaded', async () => {
    await setup()

    fireEvent.error(await screen.findByAltText('Bulbasaur front sprite'))

    expect(await screen.findByText(/UNAVAILABLE/)).toBeInTheDocument()
    expect(within(mainScreen()).getByRole('heading', { name: 'Bulbasaur' })).toBeInTheDocument()
  })
})
