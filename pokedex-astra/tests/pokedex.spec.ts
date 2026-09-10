import { test, expect } from "@playwright/test";
test("live API: complete device, navigation, lookup, views, cache, and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("pokeapi.co/api/v2"))
      requests.push(request.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Bulbasaur", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Overgrow / Chlorophyll *")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Previous Pokémon", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".sprite-stage img")
    .evaluate((img: HTMLImageElement) => img.decode());
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "artifacts/pokedex-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next Pokémon", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ivysaur" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByRole("heading", { name: "Bulbasaur", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Local memory");
  expect(requests.filter((url) => /pokemon\/1$/.test(url))).toHaveLength(1);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("heading", { name: "Ivysaur" })).toBeVisible();
  for (const query of ["pikachu", "Pikachu", "25", "025"]) {
    await page.getByRole("textbox").fill(query);
    await page
      .getByRole("button", { name: "Search Pokémon", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pikachu", exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "02 stats" }).click();
  await expect(page.getByText("BASE STAT TOTAL")).toBeVisible();
  await page.getByRole("textbox").fill("missingno");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("status")).toContainText("No match");
  await page.getByRole("textbox").fill("151");
  await page.getByRole("textbox").press("Enter");
  await expect(
    page.getByRole("heading", { name: "Mew", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next Pokémon", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "03 index" }).click();
  await expect(page.locator(".index-list button")).toHaveCount(151);
  await page.locator(".index-list button").first().click();
  await expect(
    page.getByRole("heading", { name: "Bulbasaur", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "01 data" }).click();
  await page.getByRole("button", { name: "CLEAR", exact: true }).click();
  await page.getByRole("textbox").blur();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator(".sprite-stage img")
    .evaluate((img: HTMLImageElement) => img.decode());
  await page.screenshot({
    path: "artifacts/pokedex-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.getByRole("button", { name: "Next Pokémon", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ivysaur", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("network failure keeps hardware visible and retry recovers from live API", async ({
  page,
}) => {
  await page.route("https://pokeapi.co/api/v2/pokemon/1", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Interactive Kanto Pokédex" }),
  ).toBeVisible();
  await page.unroute("https://pokeapi.co/api/v2/pokemon/1");
  await page.getByRole("button", { name: "Retry scan ↻" }).click();
  await expect(
    page.getByRole("heading", { name: "Bulbasaur", exact: true }),
  ).toBeVisible({ timeout: 30000 });
});
