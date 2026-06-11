# Handout A — Why This Works

## The Problem

Running a full benchmark suite against every candidate model is expensive in API cost, time, and engineering overhead. The question is whether that cost is necessary, or whether most of it is noise.

Per-item variance analysis across the three shipped models answers this directly: 64.8% of LCB items and 57% of AA-LCR items have zero variance, meaning every model scores identically on them regardless of capability. An item where all models agree tells you nothing about which model is better for your workload. These items consume evaluation budget without contributing any ranking signal. Removing them is not an approximation, it is noise reduction. The goal is to find the smallest subset that preserves the ranking and therefore the deployment decision, at a fraction of the cost.

## Solution Approach: Correlation-Stratified Pruning

Four steps, each solving a specific failure mode:

**Difficulty stratification** — Items are sorted by mean score across all three models, where a mean of 1.0 means every model answered correctly and 0.0 means none did. This distribution is split into easy (top 20%), medium (middle 50%), and hard (bottom 30%) bins. A discrimination-only selector naturally over-indexes on medium difficulty items since they have the highest variance, ignoring the extremes where capability differences also matter. Stratifying first ensures the pruned set covers the full capability range, giving a more reliable signal for models at either end of the performance spectrum.

***Discrimination scoring** — Within each bin, items are ranked by cross-model score variance. High variance means models genuinely disagree on that item, which is the only signal that separates better from worse. Items where all models score similarly, even if not identical, 
are ranked lower and less likely to be selected. This is the core selection criterion because ranking preservation depends entirely on items where model differences are visible.

**Ranking correlation filter** — High variance alone is not sufficient. A weaker model can outperform a stronger one on specific item types due to training data distribution, which would make those items discriminating but misleading. Items are filtered to keep only those 
where per-model scores correlate positively with the full-set ranking, ensuring the pruned set confirms the correct order rather than inverting it.

**Judge-noise correction (AA-LCR only)** — AA-LCR responses are graded by an LLM judge, which introduces non-determinism independent of model capability. Each item has multiple judge evaluations, and variance across those repeated scores estimates how inconsistent the grading is for that specific question. Items with high judge variance are down-weighted so the pruner selects on genuine model capability differences rather than grading noise. Without this correction, items that look discriminating may simply be ones where the judge is unreliable, producing a ranking signal that reflects evaluation noise rather than model quality.

## How Much Was Pruned and Why It Is Sufficient

| Benchmark | Full → Pruned | Retention | Top Model Correct | LOO Mean Spearman |
|---|---|---|---|---|
| LCB v5 | 315 → 30 | 9.5% | ✓ all rounds | 0.667 |
| AA-LCR | 100 → 20 | 20.0% | ✓ all rounds | 0.667 |

Spearman correlation here measures how well the pruned set preserves the full model ordering, where 1.0 is a perfect match. 

The deployment decision depends on model ranking preservation, not exact scores. The pruned set correctly identifies the strongest model for any candidate it has not seen before. **Leave-one-out (LOO)** validation tests exactly this: each model is held out, the pruner selects samples using only the remaining two, and the held-out model's ranking is verified against the full benchmark. The strongest model is correctly identified in every round on both benchmarks.

The cases where Spearman r=0.5 occur involve the two closest models — kimi-k2.5 at 62.9% and minimax-m2.5 at 61.9% on LCB, and 66.0% vs 64.0% on AA-LCR — a gap of 1.0 and 2.0 percentage points respectively on the full benchmark. Its hard to reliably separate models that close regardless of selection method. 
The clear leader in each benchmark is never misidentified: gpt-oss-120b leads by 13.6 percentage points on LCB, and kimi-k2.5 leads by 18.0 percentage points on AA-LCR. The full 315-item LCB set itself produces no meaningful separation at that gap.
 The pruned set correctly identifies what matters for deployment: which model is strongest, every time.

## Part B: MMMU Encoder Stress Probe

Overall MMMU accuracy conflates encoder quality with domain knowledge and reasoning ability. A model can score well while its encoder is degraded because many questions are partially answerable from text context alone. The probe selects questions where the image is genuinely required.

The understanding is that encoder degradation here refers not to degradation of the image itself, but to a reduction in the encoder's performance on complex visual content that cannot be resolved from surrounding text context alone — table cells, chart axes, diagram structure, fine-grained scientific detail.

**Selection**

Four pixel-level features are computed per image: edge density (structural complexity), grayscale entropy (information density), layout complexity (spatial variation across regions), and text likelihood (proxy for OCR-heavy content). 
A 2-signal consensus rule qualifies an image as encoder-stressful only if at least 2 of 4 features exceed their thresholds. 
Zero model outputs are used in selection. The probe is built entirely from image analysis, meaning the same 150-sample set is valid for any candidate model without running any reference model first. The reference model is only needed to establish the baseline accuracy scores used in the verdict step.

The five stress categories each map to a distinct encoder failure mode: tables, dense text, charts, 
diagrams , and fine-grained

**Measurement and verdict**

Candidate model accuracy per category is compared against glm-4.5v-fp8 reference scores derived from the shipped Evals/MMMU data. Rather than applying arbitrary thresholds, the probe measures degradation relative to a known baseline — a delta exceeding 15% flags a category worth investigating before committing to full evaluation.

| Category | Reference (glm-4.5v-fp8) | Example model | Delta | Verdict |
|---|---|---|---|---|
| dense_text | 0.850 | 0.820 | -3.5% | PASS |
| tables | 0.739 | 0.700 | -5.3% | PASS |
| charts | 0.714 | 0.600 | -16.0% | FAIL |
| diagrams | 0.600 | 0.540 | -10.0% | REVIEW |
| fine_grained | 0.577 | 0.450 | -22.0% | FAIL |

Delta thresholds: within 5% = PASS, within 15% = REVIEW, exceeding 15% = FAIL.

The probe currently defaults to the MMMU validation split because it is the split for which reference scores are available from the shipped Evals/MMMU data. The probe supports any HuggingFace MMMU split via `--hf-split` — passing `--hf-split test` expands selection to the full ~10.5K test split, which works cleanly since selection is purely image-based and requires no answer data. Report mode against the test split would require separately generated reference scores for that split.

## Assumptions

- Accuracy scores are stable at temperature=0.
- LLM judge noise in AA-LCR is approximately uniform across questions.
- Difficulty is proxied by mean score across models — an item where all three models score 1.0 is treated as easy, 0.0 as hard.
- The difficulty bin allocation of 20/50/30 across easy/medium/hard mirrors the approximate natural distribution of the benchmarks rather than being derived empirically.

## What Would Change

**(a) More models:** The pruner is validated on 3 models from a similar generation. More models, especially architecturally diverse ones, would test whether the selected items genuinely capture capability differences or just happen to work for this particular set.

**(b) Live model endpoint:** With a live endpoint, you query a model on the customer's actual inputs, generate scores on the fly, run the same selection logic, and produce a pruned set from content that actually resembles their deployment. Same methodology, customer's data.

**(c) More time:** The 15% FAIL threshold in report mode and the stress feature thresholds in probe selection were set based on judgment. A production version would calibrate these empirically from observed accuracy distributions across more models rather than treating them as fixed starting points.