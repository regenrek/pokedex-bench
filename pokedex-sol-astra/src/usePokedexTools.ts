import { useEffect, useRef } from 'react'
import { resolvePokemonQuery, type PokemonListItem, type PokemonRecord } from './api'

interface ToolDefinition {
  name: string
  title: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
  execute: (input: unknown) => unknown | Promise<unknown>
}

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: ToolDefinition, options?: { signal?: AbortSignal }) => void | Promise<void>
    }
  }
}

export function usePokedexTools(
  pokemon: PokemonRecord | null,
  index: PokemonListItem[],
  selectPokemon: (id: number) => void,
) {
  const pokemonRef = useRef(pokemon)
  const indexRef = useRef(index)
  const selectRef = useRef(selectPokemon)
  pokemonRef.current = pokemon
  indexRef.current = index
  selectRef.current = selectPokemon

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()

    const register = async () => {
      await context.registerTool({
        name: 'navigate_to_pokemon',
        title: 'Navigate to Pokémon',
        description: 'Select a Kanto Pokémon by exact name or National Pokédex number and show it on the device.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string', description: 'Exact Pokémon name or a number from 1 through 151.' } },
          required: ['query'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          const query = typeof input === 'object' && input !== null && 'query' in input
            ? (input as { query: unknown }).query
            : null
          if (typeof query !== 'string') throw new Error('query must be a string')
          const id = resolvePokemonQuery(query, indexRef.current)
          if (id === null) throw new Error('No Kanto Pokémon matched that name or number')
          selectRef.current(id)
          return { selectedId: id, status: 'loading' }
        },
      }, { signal: lifecycle.signal })

      await context.registerTool({
        name: 'read_current_pokemon',
        title: 'Read current Pokémon',
        description: 'Read the Pokémon currently shown on the Pokédex without changing the device.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute() {
          const current = pokemonRef.current
          if (!current) return { status: 'loading' }
          return {
            id: current.id,
            name: current.name,
            types: current.types,
            heightM: current.heightM,
            weightKg: current.weightKg,
            abilities: current.abilities,
          }
        },
      }, { signal: lifecycle.signal })
    }

    void register().catch(() => lifecycle.abort())
    return () => lifecycle.abort()
  }, [])
}
