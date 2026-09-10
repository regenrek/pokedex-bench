# Pokédex benchmark

**GPT-6 Astra was fastest and is the benchmark author's visual favorite. Astra + DeepSeek produced the strongest code.** All three worked in ordinary use, and all three still need robustness fixes.

[**Try all three Pokédex apps in your browser**](https://kevinkern.dev/benchmarks/pokedex). Switch between models and explore the working apps.

Three implementations of the same task, reviewed independently by Fable 5.1 and Codex. Build a physical red Pokédex with real [PokéAPI](https://pokeapi.co/) data, the original 151 Pokémon, search, keyboard navigation, caching, and a usable mobile layout.

## Original reference

![Original physical red Pokédex reference](assets/reference.png)

## GPT-6 Astra

GPT-6 Astra (`gpt-6-astra`) worked alone in Codex Desktop with medium reasoning effort.

![GPT-6 Astra desktop result](assets/astra-desktop.png)

**Fastest prototype and fewest recorded tokens.**

The app worked in ordinary use, but too much behavior and presentation lives in one component.

<details>
<summary>GPT-6 Astra on mobile</summary>

<img src="assets/astra-mobile.png" alt="GPT-6 Astra full mobile page" width="390">

</details>

## GPT-6 Astra + DeepSeek V4.1 Flash

GPT-6 Astra (`gpt-6-astra`, medium reasoning) led the work in Codex Desktop. DeepSeek V4.1 Flash (`deepseek-flash`, max reasoning) implemented the app and a repair pass through DeepSeek Harness. Astra supplied the architecture, reviewed the result, and made final corrections.

![GPT-6 Astra and DeepSeek V4.1 Flash desktop result](assets/astra-deepseek-desktop.png)

**Strongest code and the best starting point for a maintained app.**

This implementation has clearer state and data boundaries, although the additional robustness probes still found cache defects.

<details>
<summary>GPT-6 Astra + DeepSeek V4.1 Flash on mobile</summary>

<img src="assets/astra-deepseek-mobile.png" alt="GPT-6 Astra and DeepSeek V4.1 Flash full mobile page" width="390">

</details>

## DeepSeek V4.1 Flash

DeepSeek V4.1 Flash (`deepseek-flash`) worked alone in DeepSeek Harness with max reasoning effort.

![DeepSeek V4.1 Flash desktop result](assets/deepseek-desktop.png)

The code has useful separation but more confirmed interaction bugs, including a late retry replacing the selected Pokémon and male Nidoran resolving to the female entry.

<details>
<summary>DeepSeek V4.1 Flash on mobile</summary>

<img src="assets/deepseek-mobile.png" alt="DeepSeek V4.1 Flash full mobile page" width="390">

</details>

Desktop screenshots show the initial Bulbasaur screen at 1440 × 900. Mobile screenshots show full pages captured at a 390 × 844 viewport. Each app scrolls vertically.

## What I found

Here’s my honest take. Astra gave me the best overall result in this benchmark, and it finished fastest. After trying all three apps myself, it’s the one I prefer.

There is just one thing. If you want clear abstractions and code that humans can maintain, you still need to look closely. Both reviewers ranked Astra’s code below the other two in this benchmark. Too much sits in one component, and the CSS has repeated layout fixes that make it harder to follow.

Astra + DeepSeek did better here. Loading data, keeping track of the selected Pokémon, and drawing the interface are more clearly separated. It’s the codebase I would rather maintain. But it took about four times as long and used about 25 times as many recorded tokens as Astra alone.

DeepSeek alone also split the code into smaller parts, but those parts did not always work together correctly. A delayed retry could replace the Pokémon you had just selected. Some CSS names did not match the components, so the indicator lights looked wrong. More structure did not automatically mean fewer bugs.

For me, Astra wins on the finished result. Astra + DeepSeek wins on code quality. If the code needs to stay understandable over time, I would make that part of the brief and keep code review and QA in the process. This is one benchmark, not a verdict on everything these models can do.

## The numbers

| Metric | GPT-6 Astra | Astra + DeepSeek V4.1 Flash | DeepSeek V4.1 Flash |
| --- | --- | --- | --- |
| Time to finish | 8m 08s | 32m 39s | 23m 27s |
| Recorded tokens | 1.33 million | At least 33.76 million | At least 27.43 million |
| Code quality from Fable 5.1 | 57 / 100 | 86 / 100 | 66 / 100 |
| Code quality from Codex | 65 / 100 | 80 / 100 | 69 / 100 |
| Normal search and navigation | Worked | Worked | Worked |
| Additional error checks | Needs fixes | Needs fixes | Needs fixes |

The code scores are the reviewers’ judgments. My preference after trying the apps is separate from those scores. The recorded time ends at final verification, before any fixes suggested by the independent reviews.

Tokens include input, cached input, output, and work from other agents. Some retry usage is missing for the DeepSeek runs. Dollar costs are unknown, so fewer tokens does not prove a lower bill.

All three worked in ordinary use. In an extra test, each app received API data in an unexpected format. All three crashed and were still broken after a reload because they had saved the bad data. This was a test we deliberately set up, not something observed from normal PokéAPI responses. The supplied tests did not catch it.

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
