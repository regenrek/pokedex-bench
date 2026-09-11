import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { getKantoIndex, getPokemon, type PokemonRecord } from './api'

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>()
  return { ...actual, getPokemon: vi.fn(), getKantoIndex: vi.fn() }
})

const makePokemon = (id: number, name: string): PokemonRecord => ({
  id,
  name,
  sprite: `${name}.png`,
  types: ['electric'],
  heightM: 0.4,
  weightKg: 6,
  abilities: ['Static'],
  stats: [
    { key: 'hp', label: 'HP', value: 45 },
    { key: 'attack', label: 'ATK', value: 55 },
  ],
  description: `${name} field notes.`,
  genus: 'Test Pokémon',
  habitat: 'Forest',
})

const list = Array.from({ length: 151 }, (_, index) => ({
  id: index + 1,
  name: index === 0 ? 'Bulbasaur' : index === 24 ? 'Pikachu' : index === 150 ? 'Mew' : `Pokemon ${index + 1}`,
}))

describe('App', () => {
  beforeEach(() => {
    vi.mocked(getKantoIndex).mockResolvedValue(list)
    vi.mocked(getPokemon).mockImplementation(async (id) => makePokemon(id, list[id - 1].name))
  })

  it('loads Bulbasaur and supports controls and keyboard navigation', async () => {
    render(<App />)
    expect(await screen.findByText('Bulbasaur')).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Next Pokémon' })[0])
    expect(await screen.findByText('Pokemon 2')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(await screen.findByText('Bulbasaur')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Previous Pokémon' })[0]).toBeDisabled()
  })

  it.each(['pikachu', '25', '025'])('finds Pikachu with %s', async (query) => {
    render(<App />)
    await screen.findByText('Bulbasaur')
    const input = screen.getByLabelText('FIND SPECIMEN')
    await userEvent.type(input, query)
    await userEvent.click(screen.getByRole('button', { name: 'SCAN' }))
    expect(await screen.findByText('Pikachu')).toBeInTheDocument()
    expect(screen.getByText('LOCKED: #025 PIKACHU')).toBeInTheDocument()
  })

  it('reports invalid searches without crashing', async () => {
    render(<App />)
    await screen.findByText('Bulbasaur')
    await userEvent.type(screen.getByLabelText('FIND SPECIMEN'), 'missingno')
    await userEvent.click(screen.getByRole('button', { name: 'SCAN' }))
    expect(screen.getByText('NO MATCH — USE NAME OR 001–151')).toBeInTheDocument()
    expect(screen.getByText('Bulbasaur')).toBeInTheDocument()
  })

  it('keeps the device visible when the API fails', async () => {
    vi.mocked(getPokemon).mockRejectedValueOnce(new Error('offline'))
    render(<App />)
    await waitFor(() => expect(screen.getByText(/DATA LINK ERROR/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'RETRY DATA LINK' })).toBeInTheDocument()
    expect(screen.getByLabelText('Interactive Kanto Pokédex')).toBeInTheDocument()
  })

  it('enforces the upper boundary at Mew', async () => {
    render(<App />)
    await screen.findByText('Bulbasaur')
    const input = screen.getByLabelText('FIND SPECIMEN')
    await userEvent.type(input, '151')
    await userEvent.click(screen.getByRole('button', { name: 'SCAN' }))
    expect(await screen.findByText('Mew')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Next Pokémon' })[0]).toBeDisabled()
  })
})
