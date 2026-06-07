# Task 2 — Benchmark Compression for a Real Customer

## Evalscope Fork
**Repo:** https://github.com/nidhiprakashhh/evalscope/tree/749b4daaa3ebc50bdf24e8450505b31d64f30aac  
**Pinned SHA:** `573aef0e01b1e3f12c3678d3b7b8d0a17a43b56f`

## Setup

```bash
git clone --recurse-submodules <repo_url>
cd task2/evalscope
pip install -e ".[all]"
pip install numpy scipy Pillow datasets
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
Verified end-to-end with `gpt-oss-120b` on Cerebras Cloud API.

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
