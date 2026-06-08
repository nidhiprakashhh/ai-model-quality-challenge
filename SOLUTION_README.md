# Solution Overview — AI Engineer Challenge Submission

> Original challenge spec: [README.md](./README.md) · [Task1_Performance.md](./Task1_Performance.md) · [Task2_Model_Quality.md](./Task2_Model_Quality.md)

---

## 🔗 Live Task 1 Demo
**https://ai-model-quality-challenge-implemen.vercel.app/**

All 11 shipped models (A–K) are pre-loaded across all 7 traffic profiles — open it and
start comparing immediately, no upload required. Drop in a new `.xlsx` sweep (e.g.
"Model L") and it renders live in both views with zero code changes.

<!-- TODO: hero screenshot — Customer View, multiple models, go/no-go badges visible -->

---

## Submission map

| Path | What it is |
|---|---|
| [`task1/`](./task1/) — [full README](./task1/README.md) | Performance dashboard: Customer go/no-go view + Engineer anomaly/data view. Full design rationale, anomaly check table, framework choices, assumptions, model-size read, and install instructions. |
| [`task2/`](./task2/) — [full README](./task2/README.md) | evalscope pruning extension: fork link, pinned commit SHA, full run contract, and results tables for both Part A and Part B. |
| [`task2/handout_a.md`](./task2/handout_a.md) | "Why this works" — technical rationale for the pruning approach (Part A & B) |
| [`task2/handout_b.md`](./task2/handout_b.md) | "Why this matters" — for sales / PM / customer-facing teams: what changes for the customer conversation, and how to run it tomorrow |

---

## Task 1 — what makes it more than a spreadsheet viewer

The spec's hard requirements say: no static dump, no generic table, no hard-coded model
list, upload must work for a 12th model with zero code edits. Each of those is addressed
by a specific architectural decision:

**Two genuinely different views, not one table styled two ways:**
The Customer View surfaces 3 metrics with units a buyer recognizes (tok/s, ms, rpm),
against explicit go/no-go thresholds, as color-coded cards. The Engineer View shows the
full 19-column sweep, runs automatic anomaly checks (cache/TTFT mismatch, throughput
inconsistency, Gen Speed cliffs), and overlays Gen Speed and TTFT vs. batch-size on
per-model charts — so an engineer can see how the projection shifts with config before
it reaches a customer. These views exist because the audiences' questions are genuinely
different, not because "configurable" was the path of least resistance.

**Generic by construction, not by model list:**
File parsing is driven entirely by the filename regex (`Model_<Letter(s)>_profile_<N>`)
and the `Summary` sheet's header row at runtime. The model name is extracted from the
match — never hard-coded. A "Model L" or "Model AA" upload renders in both views,
selectable and comparable alongside pre-loaded models, with no code change. This is the
direct answer to the "defensible for a twelfth model" requirement.

**Comparison is a first-class view, not an afterthought:**
Side-by-side model cards in Customer View and overlaid line charts in Engineer View
both support however many models are selected. The app treats multi-model comparison
as the common case.

See [task1/README.md](./task1/README.md) for full detail: the exact threshold and anomaly-check tables, profile
use-case breakdowns, data-derived model-size reads, framework choices and what was ruled out,
assumptions, and what would change with production data or more time.

---

## Task 2 — results snapshot

evalscope fork: https://github.com/nidhiprakashhh/evalscope/tree/749b4daaa3ebc50bdf24e8450505b31d64f30aac  
**Pinned SHA:** `573aef0e01b1e3f12c3678d3b7b8d0a17a43b56f`

The pruner lives inside evalscope as a proper upstream-quality extension — registered
via `BenchmarkMeta` + `@register_benchmark` following the framework's own conventions,
not as a standalone script.

### Part A — correlation-stratified pruning (LCB + AA-LCR)

The algorithm: stratify samples by difficulty (easy/medium/hard bins), score each by
discrimination power (variance across models) × correlation with the full-set ranking.
For AA-LCR, judge-noise correction is applied to down-weight samples where score
variance may reflect LLM-judge non-determinism rather than genuine capability differences.

| Benchmark | Full → Pruned | Retention | Ranking preserved | LOO mean Spearman |
|---|---|---|---|---|
| LiveCodeBench v5 | 315 → 30 | **9.5%** | ✓ | 0.667 |
| AA-LCR | 100 → 20 | **20.0%** | ✓ | 0.667 |

The strongest model is correctly identified in **every** leave-one-out round on both
benchmarks. Leave-one-out validation means the pruned set is tested against a model it
never saw during selection — i.e., the compression is defensible for a 4th unseen model,
not just the 3 that were shipped. Verified end-to-end against `gpt-oss-120b` via the
Cerebras Cloud API.

### Part B — MMMU encoder-stress-coverage probe (working code)

Samples are selected from the *full* ~12K HuggingFace MMMU validation split using
pixel-level visual stress features — edge density (Sobel), entropy, layout complexity,
and text likelihood — scored with a 2-signal consensus requirement. Zero model outputs
are used in probe selection, so the same 150-sample probe is valid for any candidate
model (no reference model needed to build the set).

| Image category | Reference accuracy (`glm-4.5v-fp8`) |
|---|---|
| Dense text | 0.850 |
| Tables | 0.739 |
| Charts | 0.714 |
| Diagrams | 0.600 |
| Fine-grained | 0.577 |

A new model's output is scored against these reference accuracies per category
(delta ≥ −5% = PASS, −15% = REVIEW, < −15% = FAIL). A random sample cannot give this
signal because it doesn't control for image type — encoder weaknesses are category-specific.

Full run commands in [task2/README.md](./task2/README.md). Technical rationale in
[task2/handout_a.md](./task2/handout_a.md). Customer-facing explanation of what this
changes for the sales conversation in [task2/handout_b.md](./task2/handout_b.md).

---

## Video Walkthroughs

- **Task 1** (≤5 min): [link] — audiences, what I cut and why, framework choice, assumptions, model sizes, profile use cases
- **Task 2**: [link] — pruning approach, trade-offs, results walk-through

---

## Notes for reviewers

- The evalscope fork lives as a git submodule at `task2/evalscope` — clone with `git clone --recurse-submodules`
- Full setup and run instructions: [task2/README.md](./task2/README.md)
- Task 1 frontend: all parsing is client-side, no backend — `cd task1 && npm install && npm run dev` is the full setup from a clean clone
