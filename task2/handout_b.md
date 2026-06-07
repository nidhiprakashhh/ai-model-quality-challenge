# Handout B — Why This Matters and How to Use It
*Developers, test engineers, product, customer team | ½ page*

## What Changes for the Customer Conversation

Today, evaluating a candidate model against the coding and long-context benchmarks means running 415 test items. With pruning, that drops to 50 items — an 88% reduction — while giving the same go/no-go answer.

In practical terms: a deployment lead can get a model quality verdict in minutes instead of waiting for an overnight run. Engineering can run the pruned suite in CI on every model update without it becoming a bottleneck.

## How to Run It

The pruners are registered as datasets inside evalscope. Add your model connection flags and run:

```bash
# Coding capability
evalscope eval --model <model_endpoint> [...connection flags] \
    --datasets live_code_bench --output ./results_full/

evalscope eval --model <model_endpoint> [...connection flags] \
    --datasets live_code_bench_pruned \
    --dataset-args '{"pruning_strategy": "correlation_stratified", "prune_ratio": 0.1}' \
    --output ./results_pruned/

python -m evalscope_ext.tools.compare_runs \
    --full ./results_full/ --pruned ./results_pruned/
```

The output is the same evalscope report format already in use. No new tooling required.

## What the Multimodal Probe Actually Tests

Random sampling from MMMU mostly surfaces domain knowledge and reasoning gaps — a model can answer many MMMU questions without meaningfully processing the image at all, by reasoning from text context. That does not tell you whether the encoder works.

The encoder stress probe selects questions where the image is genuinely required: reading a value from a specific table cell, identifying which chart line peaks at a given x-value, tracing which node connects to which in a diagram. Failures on these questions are encoder failures, not reasoning failures.

Running 150 targeted questions gives a per-category verdict:

```
Category      Score   Reference   Delta   Verdict
dense_text    0.850     0.850    +0.000   PASS
tables        0.739     0.739    +0.000   PASS
charts        0.714     0.714    +0.000   PASS
diagrams      0.600     0.600    +0.000   PASS
fine_grained  0.577     0.577    +0.000   PASS
```

If fine-grained drops significantly below reference, the encoder has a specific weakness with high-detail scientific images. That diagnosis comes from 150 questions, not 12,000.

## Why This Matters Beyond Engineering

**Faster evaluation cycles:** A candidate model can be screened in a single meeting. That shortens the evaluation phase of a deal.

**Defensible answers:** When someone asks "why only 30 questions?", the answer is concrete: "because the other 285 questions give the same answer regardless of which model you test — those questions don't differentiate model quality for this workload."

**Multimodal readiness:** When the customer's roadmap extends to vision, there is already a probe ready to run — 150 questions, not 12,000, with results in minutes.

**CI-friendly:** A 50-question suite runs fast enough to include in automated testing on every model update.
