# Solution Overview

**Live URL Link:** **https://ai-model-quality-challenge-implemen.vercel.app/**

- All 11 shipped models (A–K) are pre-loaded across all 7 traffic profiles, can start comparing immediately, no upload required. 
- Drop in a new `.xlsx` sweep (e.g.
"Model L") and it renders live in both views with zero code changes.

<!-- TODO: hero screenshot — Customer View, multiple models, go/no-go badges visible -->

## Quick Start

Clone with submodules (required for Task 2):

```bash
git clone --recurse-submodules <repo_url>
```

Already cloned? Run:

```bash
git submodule update --init --recursive
```

---

> Original challenge spec (given): [README.md](./README.md) · [Task1_Performance.md](./Task1_Performance.md) · [Task2_Model_Quality.md](./Task2_Model_Quality.md)

---

## Submission Structure

| Path | What it is |
|---|---|
| [`task1/`](./task1/) — [full README here](./task1/README.md) | Performance dashboard: Customer go/no-go view + Engineer anomaly/data view. Full design rationale, anomaly check table, framework choices, assumptions, model-size read, and install instructions. |
| [`task2/`](./task2/) — [full README here](./task2/README.md) | evalscope pruning extension: fork link, pinned commit SHA, full run contract, and results tables for both Part A and Part B. |
| [`task2/handout_a.md`](./task2/handout_a.md) | "Why this works" - choice of approach, decisions, future changes |
| [`task2/handout_b.md`](./task2/handout_b.md) | "Why this matters and how to use it" — for sales / PM / customer-facing teams: what changes for the customer conversation, and how to run it tomorrow |

---

## Task 1 — Performance UI for Customer and Product

- **Customer View:** Surfaces 3 metrics with units a customer recognizes (tok/s, ms, rpm), against explicit go/no-go thresholds, as color-coded cards.
- **Engineer View:** Shows the full 19-column sweep, runs automatic **anomaly checks** (cache/TTFT mismatch, throughput inconsistency, Gen Speed cliffs), and overlays Gen Speed and TTFT vs. batch-size on
per-model charts, so an engineer can see how the projection shifts with configs before it reaches a customer. 

- File parsing is driven entirely by the filename regex (`Model_<Letter(s)>_profile_<N>`)
and the `Summary` sheet's header row at runtime. The model name is extracted from the
match, never hard-coded. A "Model L" or "Model AA" upload renders in both views, selectable and comparable alongside pre-loaded models, with no code change.

- **Model Comparisons:**
Side-by-side model cards in Customer View and overlaid line charts in Engineer View both support however many models are selected. The app treats multi-model comparison as the common case.

See [task1/README.md](./task1/README.md) for full detail: the exact threshold and anomaly-check tables, profile use-case breakdowns, data-derived model-size reads, framework choices and what was ruled out,
assumptions, and what would change with production data or more time.

---

## Task 2 — Benchmark Compression for a Real Customer

evalscope fork: https://github.com/nidhiprakashhh/evalscope  
**Pinned SHA:** `573aef0e01b1e3f12c3678d3b7b8d0a17a43b56f`

The pruner lives inside evalscope as a proper upstream-quality extension. Registered via `BenchmarkMeta` + `@register_benchmark` following the framework's own conventions, not as a standalone script.

### Part A — correlation-stratified pruning (LCB + AA-LCR)

The algorithm: stratify samples by difficulty (easy/medium/hard bins), score each by discrimination power (variance across models) × correlation with the full-set ranking.
For AA-LCR, judge-noise correction is applied to down-weight samples where score variance may reflect LLM-judge non-determinism rather than genuine capability differences.

| Benchmark | Full → Pruned | Retention | Ranking preserved | LOO mean Spearman |
|---|---|---|---|---|
| LiveCodeBench v5 | 315 → 30 | **9.5%** | ✓ | 0.667 |
| AA-LCR | 100 → 20 | **20.0%** | ✓ | 0.667 |

The strongest model is correctly identified in **every** leave-one-out (LOO) round on both benchmarks. Leave-one-out validation means the pruned set is tested against a model it never saw during selection, to confirm the compression is defensible for a 4th unseen model,
not just the 3 used in selection. 

### Part B — MMMU encoder-stress-coverage probe (working code)

Samples are selected from the *full* ~12K HuggingFace MMMU validation split using pixel-level visual stress features — edge density (Sobel), entropy, layout complexity, and text likelihood — scored with a 2-signal consensus requirement. Zero model outputs are used in probe selection, so the same 150-sample probe is valid for any candidate model.

| Image category | Reference accuracy (`glm-4.5v-fp8`) |
|---|---|
| Dense text | 0.850 |
| Tables | 0.739 |
| Charts | 0.714 |
| Diagrams | 0.600 |
| Fine-grained | 0.577 |

A new model's output is scored against these reference accuracies per category
(delta ≥ −5% = PASS, −15% = REVIEW, < −15% = FAIL). A random sample cannot give this signal because it doesn't control for image type, encoder weaknesses are category-specific.

Full run commands in [task2/README.md](./task2/README.md). Technical rationale in [task2/handout_a.md](./task2/handout_a.md). Customer-facing explanation of what this changes for the sales conversation in [task2/handout_b.md](./task2/handout_b.md).

---

## Video Walkthroughs

- **Task 1** (≤5 min): [link] — audiences, what I cut and why, framework choice, assumptions, model sizes, profile use cases
- **Task 2**: [link] — pruning approach, trade-offs, results walk-through

---

## Notes for reviewers

- The evalscope fork lives as a git submodule at `task2/evalscope` — please clone with `git clone --recurse-submodules`
- Full setup and run instructions: [task2/README.md](./task2/README.md)
- Task 1 frontend: all parsing is client-side, no backend — `cd task1 && npm install && npm run dev` is the full setup from a clean clone
