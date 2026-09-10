# Pokédex benchmark

**GPT-6 Astra was fastest. Astra + DeepSeek produced the strongest code. DeepSeek alone looked closest to the reference.** All three worked in ordinary use, and all three still need robustness fixes.

Three implementations of the same task, reviewed independently by Fable 5.1 and Codex. Build a physical red Pokédex with real [PokéAPI](https://pokeapi.co/) data, the original 151 Pokémon, search, keyboard navigation, caching, and a usable mobile layout.

## Original reference

![Original physical red Pokédex reference](assets/reference.png)

## GPT-6 Astra

GPT-6 Astra (`gpt-6-astra`) worked alone in Codex Desktop with medium reasoning effort.

![GPT-6 Astra desktop result](assets/astra-desktop.png)

**Fastest prototype and fewest observed tokens.** Finished in 8m 08s with 1.33 million observed workflow tokens. All 26 supplied tests passed. Code scores were 57 from Fable and 65 from Codex. Visual scores were 53 and 70.

The app worked in ordinary use, but too much behavior and presentation lives in one component.

<details>
<summary>GPT-6 Astra on mobile</summary>

<img src="assets/astra-mobile.png" alt="GPT-6 Astra full mobile page" width="390">

</details>

## GPT-6 Astra + DeepSeek V4.1 Flash

GPT-6 Astra (`gpt-6-astra`, medium reasoning) led the work in Codex Desktop. DeepSeek V4.1 Flash (`deepseek-flash`, max reasoning) implemented the app and a repair pass through DeepSeek Harness. Astra supplied the architecture, reviewed the result, and made final corrections.

![GPT-6 Astra and DeepSeek V4.1 Flash desktop result](assets/astra-deepseek-desktop.png)

**Strongest code and the best starting point for a maintained app.** Finished in 32m 39s with at least 33.76 million observed workflow tokens across both models. All 52 supplied tests passed. Code scores were 86 from Fable and 80 from Codex. Visual scores were 77 and 68.

This implementation has clearer state and data boundaries, although the additional robustness probes still found cache defects.

<details>
<summary>GPT-6 Astra + DeepSeek V4.1 Flash on mobile</summary>

<img src="assets/astra-deepseek-mobile.png" alt="GPT-6 Astra and DeepSeek V4.1 Flash full mobile page" width="390">

</details>

## DeepSeek V4.1 Flash

DeepSeek V4.1 Flash (`deepseek-flash`) worked alone in DeepSeek Harness with max reasoning effort.

![DeepSeek V4.1 Flash desktop result](assets/deepseek-desktop.png)

**Closest visual match to the reference.** Finished in 23m 27s with at least 27.43 million observed workflow tokens. All 95 supplied tests passed. Code scores were 66 from Fable and 69 from Codex. Visual scores were 84 and 75.

The code has useful separation but more confirmed interaction bugs, including a late retry replacing the selected Pokémon and male Nidoran resolving to the female entry.

<details>
<summary>DeepSeek V4.1 Flash on mobile</summary>

<img src="assets/deepseek-mobile.png" alt="DeepSeek V4.1 Flash full mobile page" width="390">

</details>

Desktop screenshots show the initial Bulbasaur screen at 1440 × 900. Mobile screenshots show full pages captured at a 390 × 844 viewport. Each app scrolls vertically.

## Reading the results

Scores are out of 100 and reflect reviewer judgment. Token totals include cached input, output, and observed worker usage. They include the original completion reports but exclude later accounting work. Some retry usage is missing for the two DeepSeek configurations. Monetary cost is unknown for all three, and recorded time is not time to a fully accepted product.

## Why the reviews differ

Both reviewers installed, tested, built, and drove the apps in a browser. Normal search, navigation, caching, and recovery from an HTTP 503 worked across all three.

Fable passed the functional gate and ranked GPT-6 Astra first overall because speed and token use outweighed its weaker code. Codex added malformed-response and cache-race probes. A deliberately malformed species response crashed every app and remained cached after reload. Codex therefore withheld overall acceptance. This was an injected fault, not something observed from normal live PokéAPI responses. Additional probes also found defects in the Astra + DeepSeek implementation, so Fable's initial finding of no reproduced bugs in that implementation is incomplete.

The useful middle ground is to show ordinary functionality and robustness separately, retain both reviewers' scores, and name the category leaders. Averaging everything into one winner would hide the acceptance disagreement. Both reviewers agree on the code ranking and that DeepSeek alone most closely follows the reference. Visual scores vary more because they judge fidelity and presentation differently.

Fable counted 1.26 million tokens for Astra alone and 33.30 million for Astra + DeepSeek. The totals above include their final completion reports, which explains the difference. The standalone DeepSeek total agrees.

## Run locally

Use Node.js 22.12 or newer. Choose one project folder, then run the same commands.

- [GPT-6 Astra](pokedex-astra)
- [GPT-6 Astra + DeepSeek V4.1 Flash](pokedex-deepseek-v4.1-astra)
- [DeepSeek V4.1 Flash](pokedex-deepseek-v4.1-harness)

```bash
cd pokedex-astra
npm ci
npm run dev
```

```bash
npm run typecheck
npm test
npm run build
```

The application source is unchanged. This repository contains the three projects, this summary, and comparison images. Raw transcripts, logs, private measurement records, generated builds, and temporary evaluation files stay out of Git.

This is one task with one submitted attempt per run. Model and harness names come from the recorded execution configurations. The reviews are independent, although visible folder names compromised blinding. The results describe these submissions and do not establish a general model ranking.
