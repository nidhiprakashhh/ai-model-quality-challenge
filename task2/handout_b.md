# Handout B — Why This Matters and How to Use It

## What Changes for the Customer Conversation

Getting a go/no-go answer on a candidate model currently means running a full benchmark suite — 415 items across coding and long-context reasoning. With the pruned benchmarks, that drops to 50 items while giving the same ranking signal.

The practical difference is turnaround time. An evaluation that previously had to be scheduled as another call and waited on can now happen before a customer call, or during one. Engineering can run the pruned suite on  model updates without it becoming a bottleneck. When a customer asks about a different model, the comparison does not have to wait.

### How to Run It

Replace `<model>` with the model you are evaluating. If running against a remote 
API endpoint rather than a local checkpoint, add your API connection details 
(`--eval-type`, `--api-url`, `--api-key`) to each eval command.

```bash
# Step 1 — Run the full benchmark
evalscope eval --model <model> --datasets live_code_bench \
    --output ./results_full/

# Step 2 — Run the pruned benchmark
evalscope eval --model <model> --datasets live_code_bench_pruned \
    --dataset-args '{"pruning_strategy": "correlation_stratified", "prune_ratio": 0.1}' \
    --output ./results_pruned/

# Step 3 — Get the verdict
python -m evalscope_ext.tools.compare_runs \
    --full ./results_full/ --pruned ./results_pruned/
```

The output shows each model's score on the pruned set alongside the full benchmark score, with ranking preservation confirmed. The model with the highest score is the strongest candidate for the customer's workload.

## What the Multimodal Probe Gives That Random Sampling Cannot

Random sampling from a 12,000 item benchmark is expensive and still may not surface encoder weaknesses. A model can score well on randomly selected questions by reasoning from supporting textual context alone, without the image contributing anything. You end up with a score that reflects general capability, not encoder quality specifically.

The probe selects 150 questions where the image is the only path to the correct answer. A question asking which bar in a chart is tallest, or what value appears in a specific table cell, cannot be answered without the encoder correctly processing that image. 
A model that fails here has an encoder problem, not a knowledge problem, and that distinction matters for deployment.

The result is a per-category verdict in minutes rather than a full benchmark run, telling you exactly which visual content types the encoder handles reliably and which it does not (gives PASS/FAIL/REVIEW results).


## Why a Customer-Facing PM Should Care

**Faster evaluation cycles:** A candidate model can be screened in a single meeting rather than across multiple follow-ups. That alone shortens the evaluation phase of a deal.

**Defensible answers:** When a customer asks why only 30 questions were used, the answer is concrete: the other 285 produce the same score regardless of which model you test, every model gets them right or wrong identically, so they carry no information about which model is better. Removing them is not cutting corners, it is removing redundancy. The 30 that remain are the ones where models actually disagree, which is the only signal that matters for a ranking decision.

**Multimodal readiness:** When the customer's roadmap extends to vision next quarter, there is already a probe ready to run. 150 questions, results in minutes, no new infrastructure required.

**CI-friendly:** A 50-question suite runs fast enough to sit in CI and validate every model update automatically, without evaluation becoming something that blocks the team.
