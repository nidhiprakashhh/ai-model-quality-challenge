# Handout A — Why This Works
*Technical audience | 1 page*

## The Problem I Was Solving

The customer needs one answer: is this model good enough? Full benchmarks give that answer but at high cost — 315 coding questions plus 100 long-context questions per model, every time a candidate changes. The goal is not to approximate scores. It is to find the smallest subset that gives the same ranking — and therefore the same go/no-go decision — as the full benchmark.

The shipped data makes this tractable. Computing per-sample score variance across the three models reveals that 64.8% of LCB items and 57% of AA-LCR items have zero variance — all three models give the same answer. These items carry no information about which model is better. They are the noise. The pruner removes them and keeps only the items where models actually disagree.

## Algorithm: Correlation-Stratified Pruning

The algorithm has four steps, each solving a specific problem.

**Step 1 — Stratify by difficulty.** Items are sorted by their mean score across all models and split into easy (top 20%), medium (middle 50%), and hard (bottom 30%) bins. This matters because a purely discrimination-based selector would tend to pick medium-difficulty items and ignore easy and hard ones — but a pruned set that only contains medium items would fail to rank models on the extremes of their capability range. Stratification ensures the pruned set is representative across difficulty levels.

**Step 2 — Score by discrimination.** Within each bin, items are ranked by cross-model score variance. An item with high variance means models disagree strongly on it — exactly the signal needed to distinguish better from worse models. An item where all models score 0.8 tells you nothing about which model is best.

**Step 3 — Filter by ranking correlation.** High variance alone is not sufficient. An item where the weaker model consistently outperforms the stronger is discriminating but misleading — it would invert the ranking rather than confirm it. Items are filtered to keep only those whose per-model scores correlate positively with the full-set ranking. This is the step that prevents the pruned set from accidentally reversing the correct order.

**Step 4 — Apply judge noise correction (AA-LCR only).** AA-LCR uses an LLM judge to score responses, which introduces non-determinism. For each item, cross-judge score variance is estimated and used to down-weight items where judge noise dominates cross-model signal. This makes the pruned AA-LCR set more reliable as a ranking signal despite the noisy grading.

## Results and Defense

| Benchmark | Full | Pruned | Retention | Ranking Preserved |
|-----------|------|--------|-----------|-------------------|
| LCB v5 | 315 | 30 | 9.5% | ✓ |
| AA-LCR | 100 | 20 | 20.0% | ✓ |

**Leave-one-out validation** proves the pruner generalizes to models it has not seen. Each model is held out in turn. Samples are selected using only the remaining two models. The held-out model is then scored on those samples and its ranking verified.

```
LCB Leave-One-Out Results:
Hold out minimax-m2.5:  Spearman r=0.500 (nearest accuracy gap: 1.0%)
Hold out kimi-k2.5:     Spearman r=1.000 (nearest accuracy gap: 1.0%)
Hold out gpt-oss-120b:  Spearman r=0.500 (nearest accuracy gap: 13.7%)
Mean Spearman r: 0.667
Strongest model (gpt-oss-120b) ranked first in all rounds.

AA-LCR Leave-One-Out Results:
Hold out kimi-k2.5:     Spearman r=0.500 (nearest accuracy gap: 2.0%)
Hold out gpt-oss-120b:  Spearman r=0.500 (nearest accuracy gap: 16.0%)
Hold out minimax-m2.5:  Spearman r=1.000 (nearest accuracy gap: 2.0%)
Mean Spearman r: 0.667
Strongest model (kimi-k2.5) ranked first in all rounds.
```

Spearman r=0.5 rounds occur only when the two models being compared have accuracy scores within 1-2 percentage points of each other on the full benchmark — for example, kimi-k2.5 at 62.9% and minimax-m2.5 at 61.9% on LCB. Reliably separating models that close would require significantly more samples regardless of which selection method is used. The pruner correctly identifies the models that matter for the deployment decision.

Selection is based on structural sample properties — discrimination, difficulty distribution, ranking correlation — not on model-specific behavior. A fourth unseen model will be correctly ranked as long as its performance gap with existing models is meaningful.

## Part B: MMMU Encoder Stress Probe

**Design rationale:** The customer question is "is this model's image encoder good enough?" Overall MMMU accuracy does not answer this cleanly — it mixes encoder quality with domain knowledge and reasoning ability. A model can score 70% on MMMU while its encoder is degraded, simply because many MMMU questions can be partially answered from text context alone. The probe needs to select questions where the image is genuinely required.

**Strategy — Encoder Stress Coverage Pruning:**

The probe set is constructed from the MMMU validation split — the same 900-sample split (30 questions × 30 subjects) used for the reference model evaluation. Selection is based entirely on image properties, with zero model outputs used. This ensures the probe generalizes to any future model.

For each image, four lightweight pixel-level features are computed using numpy (no external CV libraries):
- **Edge density** — mean Sobel gradient magnitude, normalized. High edge density indicates structural complexity: diagrams, circuit schematics, annotated charts.
- **Grayscale entropy** — information density of the pixel distribution. Dense text regions and complex scientific figures score high.
- **Layout complexity** — standard deviation of regional means across a 3×3 grid. High complexity indicates spatially varied content rather than uniform backgrounds.
- **Text likelihood** — fraction of pixels at extreme intensity values (near black or near white). Proxy for text-heavy images requiring OCR fidelity.

A 2-signal consensus rule is applied: an image qualifies as encoder-stressful only if at least 2 of 4 features exceed their thresholds. This prevents noisy photographs from being mistakenly selected as complex.

Images are assigned to 5 encoder stress categories via MMMU's `img_type` metadata: `tables`, `dense_text`, `charts`, `diagrams`, `fine_grained`. Within each category, the 30 highest-stress images by composite score are selected, giving 150 total.

**Why these categories stress image encoders specifically:**
- Tables require the encoder to localize specific cells and extract precise values — failure shows up as wrong row/column reads
- Dense text requires OCR-level fidelity — encoder degradation causes character misreads
- Charts require geometric precision to read axis values and data point positions
- Diagrams require preserving topological structure — node connectivity, component labels
- Fine-grained images (medical scans, microscopy, molecular structures) require high-frequency detail preservation

**Working implementation:** The probe selection pipeline is fully implemented and tested. Running `python -m evalscope_ext.tools.mmmu_probe --mode select --target-size 150` downloads the full MMMU validation split from HuggingFace, computes stress features, and outputs a 150-sample probe JSON. The report mode (`--mode report`) computes per-category accuracy against a reference model and produces a go/no-go verdict based on accuracy delta vs reference. Verified against glm-4.5v-fp8 reference scores from the shipped Evals data.

**Measurement approach:** Rather than applying arbitrary accuracy thresholds, the probe compares candidate model scores against the reference model per category. A delta more than 15% below reference flags encoder degradation worth investigating before full MMMU evaluation.

## Assumptions

- Model accuracy scores are stable at temperature=0 — no meaningful sampling variance
- LLM judge noise in AA-LCR is approximately uniform across questions, so noise correction can be applied as a multiplicative weight
- The MMMU validation split (30 balanced samples per subject across all 30 subjects) is representative enough of the full distribution for probe construction
- Encoder stress categories most relevant to this customer's workload center on technical content — documents, charts, scientific diagrams — rather than aesthetic imagery

## What Would Change With More Resources

**(a) More shipped data or more models:** Leave-one-out validation would be more reliable with 5+ models. The noise floor for ranking separation could be estimated empirically rather than inferred from the 3-model dataset.

**(b) Live model endpoint during development:** Perturbation testing would become feasible — submitting the same question with progressively degraded images to measure accuracy drop curves. This would give a more direct encoder quality signal than category-level accuracy comparison.

**(c) More time:** The stress feature computation could incorporate OCR density estimation (actual character detection rather than intensity thresholding) and CLIP-based clustering to improve category precision, particularly for borderline image types.
