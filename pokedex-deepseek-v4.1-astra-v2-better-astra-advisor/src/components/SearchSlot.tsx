/** Search slot: the recessed input used to find a Pokémon by name or number. */
import type { FormEvent, JSX } from 'react';
import { DeviceButton } from './DeviceButton';

const INPUT_ID = 'pokedex-search-input';

export interface SearchSlotProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function SearchSlot({
  value,
  onChange,
  onSubmit,
  disabled = false,
}: SearchSlotProps): JSX.Element {
  const inputId = INPUT_ID;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form className="search-slot" role="search" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        Search Pokémon by name or number
      </label>
      <span className="search-slot__tag" aria-hidden="true">
        FIND
      </span>
      <span className="search-slot__field">
        <input
          id={inputId}
          className="search-slot__input"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="NAME OR No. — e.g. PIKACHU / 25"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <DeviceButton
        variant="search"
        type="submit"
        className="btn--search"
        disabled={disabled}
        aria-label="Search"
      >
        SEARCH
      </DeviceButton>
    </form>
  );
}
