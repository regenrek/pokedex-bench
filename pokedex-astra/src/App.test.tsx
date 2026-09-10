import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { getIndex, getPokemon } from "./data/api";
vi.mock("./data/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./data/api")>()),
  getIndex: vi.fn(),
  getPokemon: vi.fn(),
}));
const names: Record<number, string> = {
  1: "bulbasaur",
  2: "ivysaur",
  25: "pikachu",
  151: "mew",
};
function fixture(id: number) {
  return {
    cached: false,
    pokemon: {
      id,
      name: names[id] ?? "pokemon",
      height: 7,
      weight: 69,
      sprites: {
        front_default: "https://example.test/sprite.png",
        back_default: null,
      },
      types: [{ type: { name: "grass", url: "" } }],
      abilities: [{ ability: { name: "overgrow", url: "" }, is_hidden: false }],
      stats: [{ base_stat: 45, stat: { name: "hp", url: "" } }],
    },
    species: {
      genera: [{ genus: "Seed Pokémon", language: { name: "en" } }],
      flavor_text_entries: [
        {
          flavor_text: "A seed\nis planted.",
          language: { name: "en" },
          version: { name: "red" },
        },
      ],
    },
  };
}
beforeEach(() => {
  vi.mocked(getIndex).mockResolvedValue(
    Object.entries(names).map(([id, name]) => ({ id: +id, name })),
  );
  vi.mocked(getPokemon)
    .mockReset()
    .mockImplementation(async (id) => fixture(id));
});
it("loads Bulbasaur by default and renders API data", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Bulbasaur" }),
  ).toBeInTheDocument();
  expect(screen.getByText("A seed is planted.")).toBeInTheDocument();
  expect(screen.getByText("Overgrow")).toBeInTheDocument();
  expect(screen.getByText("6.9")).toBeInTheDocument();
});
it("handles previous/next, keyboard navigation, and both boundaries", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Bulbasaur" });
  expect(
    screen.getByRole("button", { name: "Previous Pokémon" }),
  ).toBeDisabled();
  fireEvent.keyDown(window, { key: "ArrowLeft" });
  expect(getPokemon).toHaveBeenLastCalledWith(1);
  await user.click(screen.getByRole("button", { name: "Next Pokémon" }));
  await screen.findByRole("heading", { name: "Ivysaur" });
  fireEvent.keyDown(window, { key: "ArrowLeft" });
  await screen.findByRole("heading", { name: "Bulbasaur" });
  fireEvent.keyDown(window, { key: "ArrowRight" });
  await screen.findByRole("heading", { name: "Ivysaur" });
  await user.type(screen.getByRole("textbox"), "151{Enter}");
  await screen.findByRole("heading", { name: "Mew" });
  expect(screen.getByRole("button", { name: "Next Pokémon" })).toBeDisabled();
  fireEvent.keyDown(window, { key: "ArrowRight" });
  expect(getPokemon).toHaveBeenLastCalledWith(151);
});
it.each(["pikachu", "Pikachu", "25", "025"])("searches %s", async (query) => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Bulbasaur" });
  await user.type(screen.getByRole("textbox"), `${query}{Enter}`);
  expect(
    await screen.findByRole("heading", { name: "Pikachu" }),
  ).toBeInTheDocument();
});
it("shows useful invalid search feedback and does not hijack input arrow keys", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Bulbasaur" });
  await user.type(screen.getByRole("textbox"), "missingno{Enter}{ArrowRight}");
  expect(screen.getByRole("status")).toHaveTextContent("No match");
  expect(
    screen.getByRole("heading", { name: "Bulbasaur" }),
  ).toBeInTheDocument();
});
it("keeps the device on API failure and recovers with retry", async () => {
  vi.mocked(getPokemon).mockRejectedValueOnce(new Error("offline"));
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("alert");
  expect(
    screen.getByRole("region", { name: "Interactive Kanto Pokédex" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry scan ↻" }));
  await screen.findByRole("heading", { name: "Bulbasaur" });
});
it("ignores stale responses from rapid navigation", async () => {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Bulbasaur" });
  let release!: (data: ReturnType<typeof fixture>) => void;
  vi.mocked(getPokemon).mockImplementation((id) =>
    id === 2
      ? new Promise((resolve) => {
          release = resolve;
        })
      : Promise.resolve(fixture(id)),
  );
  await user.click(screen.getByRole("button", { name: "Next Pokémon" }));
  await user.type(screen.getByRole("textbox"), "25{Enter}");
  await screen.findByRole("heading", { name: "Pikachu" });
  release(fixture(2));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Pikachu" }),
    ).toBeInTheDocument(),
  );
});
