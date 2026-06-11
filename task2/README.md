# Task 2 — Benchmark Compression for a Real Customer

## Evalscope Fork
**Repo:** https://github.com/nidhiprakashhh/evalscope/tree/d19e73f099031e11a944d6d8234f63d552a4205a 
**Pinned SHA:** `d19e73f099031e11a944d6d8234f63d552a4205a`

**Handouts:**
- [handout_a.md](./handout_a.md) — "Why this works" (technical: algorithm rationale, LOO validation, Part B design, assumptions, what would change)
- [handout_b.md](./handout_b.md) — "Why this matters" (sales/PM/customer: impact, how to run, what the probe tests vs random sampling)

## Overview

The customer question is binary: is this model good enough? Full benchmarks answer that question, but at high cost — 315 coding problems and 100 long-context questions per model, every time a candidate changes.

Per-item analysis of the shipped evaluation data shows ~65% of LCB items and ~57% of AA-LCR items have zero variance across all three models — every 
model gives the same answer. These items don't help distinguish models. The pruner removes them and keeps only the items where models actually disagree, then selects within those by difficulty distribution and ranking correlation.

## Approach

The key finding from the shipped evaluation data was that computed per-item score variance across the three candidate models (gpt-oss-120b, kimi-k2.5, minimax-m2.5) shows ~65% of LCB items and ~57% of AA-LCR items have zero variance and all three models give the same answer. 
These items are removed first.

Among the remaining discriminating items, correlation-stratified pruning selects samples by:
- **Difficulty stratification** — splits items into easy/medium/hard bins so the pruned 
  set stays representative across the full capability range, not just the middle
- **Discrimination scoring** — within each bin, ranks items by how strongly models disagree, 
  filtered to keep only items where that disagreement correctly reflects the full-set ranking 
  (high variance alone can invert rankings if a weaker model happens to excel on those items)
- **Judge-noise correction** (AA-LCR only) — down-weights items where score differences 
  likely reflect LLM judge inconsistency rather than genuine model capability differences

Full technical rationale and LOO validation: [handout_a.md](./handout_a.md)

## Setup

**Prerequisites:** Python 3.10+, pip

```bash
# Clone with submodules (evalscope extension lives at task2/evalscope)
git clone --recurse-submodules https://github.com/nidhiprakashhh/ai-model-quality-challenge-implementation.git
cd ai-model-quality-challenge-implementation

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install evalscope with all dependencies
cd task2/evalscope
pip install -e ".[all]"
pip install numpy scipy Pillow datasets
```

Set your API key before running any eval commands:

```bash
export CEREBRAS_API_KEY=your_key_here
```
> **Important:** Use `--recurse-submodules` when cloning. The evalscope fork lives as a git submodule at `task2/evalscope`.

## Run Contract

Replace `<model>` with your model name and add your API connection flags (`--eval-type`, `--api-url`, `--api-key` or equivalent).

```bash
# Step 1: Full benchmark baseline
evalscope eval --model <model> --datasets live_code_bench \
    --output ./results_full/

# Step 2: Pruned benchmark (9.5% of samples, same ranking signal)
evalscope eval --model <model> --datasets live_code_bench_pruned \
    --dataset-args '{"pruning_strategy": "correlation_stratified", "prune_ratio": 0.1}' \
    --output ./results_pruned/

# Step 3: Compare results with bootstrap confidence intervals
python -m evalscope_ext.tools.compare_runs \
    --full ./results_full/ --pruned ./results_pruned/

# AA-LCR (long-context reasoning)
evalscope eval --model <model> --datasets aa_lcr_pruned \
    --dataset-args '{"pruning_strategy": "correlation_stratified", "prune_ratio": 0.2}' \
    --output ./results_pruned_aalcr/
```

### Example: Cerebras Cloud API

```bash
# Step 1 — Full benchmark
evalscope eval \
  --model gpt-oss-120b \
  --eval-type openai_api \
  --api-url https://api.cerebras.ai/v1 \
  --api-key $CEREBRAS_API_KEY \
  --datasets live_code_bench \
  --output ./results_full/

# Step 2 — Pruned benchmark
evalscope eval \
  --model gpt-oss-120b \
  --eval-type openai_api \
  --api-url https://api.cerebras.ai/v1 \
  --api-key $CEREBRAS_API_KEY \
  --datasets live_code_bench_pruned \
  --dataset-args '{"pruning_strategy": "correlation_stratified", "prune_ratio": 0.1}' \
  --output ./results_pruned/

# Step 3 — Compare
python -m evalscope_ext.tools.compare_runs \
  --full ./results_full/ --pruned ./results_pruned/
```

## Extension Structure
```
evalscope/evalscope/benchmarks/
├── live_code_bench_pruned/     # Pruned LCB adapter
├── aa_lcr_pruned/              # Pruned AA-LCR adapter with judge noise correction
└── mmmu_pruned/                # MMMU encoder stress probe adapter
evalscope_ext/
├── pruning/
│   ├── correlation_stratified.py   # Core pruning algorithm + data loading
│   ├── leave_one_out.py            # Generalization validation
│   └── mmmu_pruner.py              # Single-model MMMU strategy
└── tools/
    ├── compare_runs.py             # Bootstrap CI comparison tool
    └── mmmu_probe.py               # Part B encoder stress probe
```

## Results

### Part A: Benchmark Compression

| Benchmark | Full | Pruned | Retention | Ranking Preserved | LOO Mean Spearman |
|-----------|------|--------|-----------|-------------------|-------------------|
| LCB v5 | 315 | 30 | 9.5% | ✓ | 0.667 |
| AA-LCR | 100 | 20 | 20.0% | ✓ | 0.667 |

Strongest model correctly identified in all leave-one-out rounds on both benchmarks.  

### Part B: MMMU Encoder Stress Probe

150 samples selected from the full MMMU validation split (900 samples across 30 subjects) using pixel-level visual stress features. Zero model outputs used in selection — generalizes to unseen models.

Reference scores for `glm-4.5v-fp8`:

| Category | Reference Accuracy |
|----------|--------------------|
| dense_text | 0.850 |
| tables | 0.739 |
| charts | 0.714 |
| diagrams | 0.600 |
| fine_grained | 0.577 |

```bash
# Build encoder probe set from full MMMU validation split
python -m evalscope_ext.tools.mmmu_probe \
    --mode select --target-size 150 \
    --output ./mmmu_probe_outputs/mmmu_probe_set.json

# Go/no-go report vs reference model
python -m evalscope_ext.tools.mmmu_probe \
    --mode report \
    --probe-file ./mmmu_probe_outputs/mmmu_probe_set.json \
    --results-dir ./results_mmmu/ \
    --reference-dir ./Evals/MMMU/reviews/glm-4.5v-fp8
```

## Extending to a New Benchmark

The three pruned benchmarks share a single `UniversalPrunedAdapterMixin`
([`evalscope_ext/pruning/universal_pruned_adapter.py`](./evalscope/evalscope_ext/pruning/universal_pruned_adapter.py))
that owns all pruning scaffolding — sample filtering, stats reporting, evals
directory resolution. Each benchmark adapter inherits the mixin and contributes only its `BenchmarkMeta` declaration and `_compute_pruned_indices` implementation. To add a new pruned benchmark:

1. Create `benchmarks/<name>_pruned/<name>_pruned_adapter.py`
2. Inherit `UniversalPrunedAdapterMixin`
3. Declare `BenchmarkMeta` with dataset ID, subsets, and pruning defaults in `extra_params`
4. Implement `_compute_pruned_indices` — load scores from Evals/, run the pruner, return selected indices
5. Register the module in `evalscope/benchmarks/__init__.py`

Nothing else required.
