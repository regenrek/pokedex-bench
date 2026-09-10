import { beforeEach, describe, expect, it, vi } from "vitest";
import { description, resolveSearch } from "./api";
const index = [
  { id: 25, name: "pikachu" },
  { id: 122, name: "mr-mime" },
  { id: 29, name: "nidoran-f" },
];
describe("Kanto search", () => {
  it.each(["pikachu", "Pikachu", "25", "025", "  Pikachu  "])(
    "resolves %s to Pikachu",
    (query) => expect(resolveSearch(query, index)).toBe(25),
  );
  it.each(["0", "152", "-1", "", "missingno", "25.0"])("rejects %s", (query) =>
    expect(resolveSearch(query, index)).toBeUndefined(),
  );
  it("accepts display-name punctuation", () => {
    expect(resolveSearch("Mr. Mime", index)).toBe(122);
    expect(resolveSearch("Nidoran ♀", index)).toBe(29);
  });
  it("cleans flavor-text control characters", () =>
    expect(
      description({
        genera: [],
        flavor_text_entries: [
          {
            flavor_text: "A strange\nseed\fgrows.\r",
            language: { name: "en" },
            version: { name: "red" },
          },
        ],
      }),
    ).toBe("A strange seed grows."));
});
describe("API resource cache", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    vi.unstubAllGlobals();
  });
  it("fetches details lazily, deduplicates concurrent requests and reuses persistent cache", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    vi.stubGlobal("fetch", fetcher);
    const api = await import("./api");
    await Promise.all([api.getPokemon(1), api.getPokemon(1)]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect((await api.getPokemon(1)).cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.resetModules();
    const freshApi = await import("./api");
    expect((await freshApi.getPokemon(1)).cached).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects HTTP failures and allows retry", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    const api = await import("./api");
    await expect(api.getPokemon(1)).rejects.toThrow("unavailable");
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
    await expect(api.getPokemon(1)).resolves.toHaveProperty("pokemon.id", 1);
  });
  it("validates boundaries without making network requests", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const api = await import("./api");
    await expect(api.getPokemon(0)).rejects.toThrow();
    await expect(api.getPokemon(152)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("continues when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 2 }) }),
    );
    const api = await import("./api");
    await expect(api.getPokemon(2)).resolves.toHaveProperty("pokemon.id", 2);
    vi.restoreAllMocks();
  });
});
