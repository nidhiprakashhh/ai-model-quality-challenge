# Cerebras Performance Explorer — Task 1

**Live demo:** https://ai-model-quality-challenge-implemen.vercel.app/

<!-- TODO: hero screenshot — Customer View, 2-3 models selected, go/no-go badges visible -->

---

## The problem this solves

Today, the answer to "is this model fast enough for our workload?" lives in a `.xlsx` perf
projection sheet that only a Cerebras engineer can read. A customer-facing PM has to
manually decode column names, translate units, and summarize for the customer. The customer
never sees the file.

This tool removes that translation step for two audiences with different questions:

| Audience | Their real question | What they get |
|---|---|---|
| **Customer / PM** | "Will this keep up with *my* workload — yes or no?" | **Customer View**: 3 recognizable metrics with explicit thresholds, color-coded go/no-go, side-by-side model comparison |
| **Internal engineer** | "Does this projection look *right*, and where should I dig in?" | **Engineer View**: full 19-column table, automatic anomaly flags, batch-scaling charts — everything needed to sanity-check a projection before it reaches a customer |

One UI, two views — separated deliberately because the questions are genuinely different,
not as a styling choice.

---

## Customer View — what's surfaced and why

Of the ~19 raw columns in the projection sheet, only 3 are shown to a customer. Everything
else lives in the Engineer View. The reasoning:

| Metric | Why it's in Customer View | Green (meets) | Yellow (borderline) | Red (does not meet) |
|---|---|---|---|---|
| **Gen Speed (tok/s/user)** | The number a buyer associates with "how fast does text appear" — recognizable without a spec sheet | ≥ 800 | ≥ 400 | < 400 |
| **TTFT (ms)** | First-token latency is the felt responsiveness of any LLM product; this is the number a CTO will ask for first | ≤ 50 ms | ≤ 200 ms | > 200 ms |
| **RPM** | Total request throughput — the capacity question ("can it handle our user volume?") | ≥ 1,000 | ≥ 500 | < 500 |

**What was cut and why:** the raw sheet also contains uncached/cached throughput splits,
prompt-vs-gen speed, queueing-adjusted speeds, hardware-normalized throughput, etc. These
are not shown to a customer because:
- They require knowing what "uncached prompt throughput" means in context — not a customer-level concept
- They're the right input for engineering anomaly checks, not go/no-go decisions
- Surfacing 19 columns to a customer would make the tool a fancier spreadsheet, not a decision aid

**Context is shown, not scored:** the Customer View surfaces the selected workload's input
length, output length, and cache % as framing ("you are being evaluated against 10,000
input / 333 output / 50% cache"). Context window is a deployment parameter, not a
per-model output that varies row by row in the sheet — so it lives as workload framing,
not as a go/no-go card. Cost isn't in the source data at all; fabricating a number would
be worse than omitting it.

<!-- TODO: screenshot — Customer View with workload selector + 3 model cards -->

---

## Engineer View — anomaly detection and config exploration

The Engineer View is built for one job: sanity-checking a projection before it reaches a
customer. It does this two ways:

### 1. See how the numbers shift with config
The profile selector + batch-size charts let an engineer sweep across the full config
space — pick any of the 7 workload profiles, watch how Gen Speed and TTFT shift across
batch sizes (10/20/30/40 concurrent users) on an overlaid line chart per model. A
projection that looks fine at batch=10 but shows an unexpected drop at batch=30 is visible
here before it becomes a customer problem.

### 2. Automatic anomaly flags
Rather than handing engineers a bigger table and calling it done, the view runs 3 checks
across the full sweep and flags only what fires — grouped per model, collapsible:

| Check | Fires when | Why it matters |
|---|---|---|
| **Cache vs. TTFT mismatch** | Profile with higher cache % doesn't show meaningfully lower TTFT (`high_TTFT > low_TTFT × 0.9`) vs. the same workload at lower cache | Higher KV-cache hit rate should speed up first-token latency — if it doesn't, the projection's caching assumptions are probably wrong |
| **Throughput/box inconsistency** | Hardware-normalized throughput varies > 40% across batch sizes within a profile | Throughput per box should scale predictably; large swings usually indicate a modeling error, not real hardware behavior |
| **Gen Speed cliff** | Gen Speed drops > 20% between consecutive batch sizes in the same profile | Signals an unmodeled capacity ceiling the customer would hit in production |

<!-- TODO: screenshot — Engineer View anomaly panel (expanded) + Gen Speed/TTFT charts -->

---

## Traffic profile use cases (1–7)

The app reads input/output token lengths and cache rates from each profile and derives
a workload label and description. Here's my read on what each profile represents:

| # | Label | Input tok | Output tok | Cache % | Inferred use case |
|---|---|---|---|---|---|
| 1 | RAG / Search | 10,000 | 333 | 50% | Long retrieved context, short answer — typical search or document Q&A |
| 2 | Document Generation | 10,000 | 4,000 | 0% | Long input → long output, no reuse — summarization or long-form generation |
| 3 | Standard Chat | 3,200 | 400 | 50% | Medium context, short reply — general conversational Q&A |
| 4 | Conversational AI | 1,000 | 1,000 | 50% | Balanced multi-turn — interactive assistant with persistent context |
| 5 | Document Analysis | 8,000 | 1,000 | 50% | Long input, moderate output — code review, contract analysis |
| 6 | Large KB RAG | 60,000 | 200 | 90% | Very long context, high cache reuse, terse output — enterprise RAG over large knowledge bases |
| 7 | Complex Reasoning | 17,000 | 3,500 | 70% | Long in *and* out with high caching — multi-step chains, extended reasoning |

Profile 6 is notable: at 60K tokens with 90% cache, the go/no-go calculus shifts toward
TTFT (can the cached prompt be served fast enough?) rather than generation speed. Models
with high throughput/box and low TTFT are the right fit here, even if their raw Gen Speed
is lower.

---

## My read on model sizes (A–K)

*Derived from the actual sweep data — averaged Gen Speed, TTFT, and hardware-normalized
throughput (Throughput/box) across all 7 profiles and all batch sizes per model.
Throughput/box is the cleanest size proxy: it measures how many tokens a model can produce
per second per box, independent of batch size or workload, so it directly reflects
compute cost per token.*

| Tier | Models | Avg Gen Speed | Avg TTFT | Avg Throughput/box | Read |
|---|---|---|---|---|---|
| **Smallest footprint** | I, G, E | 1,200–1,420 tok/s/user | 5.6–6.7 ms | 84K–208K t/s/hw | Very high hardware efficiency, fast decode, minimal TTFT — likely the smaller/lighter models in the lineup |
| **Mid-size** | A, F, H, J, K | 960–1,130 tok/s/user | 6.4–12.3 ms | 47K–79K t/s/hw | Balanced — moderate compute footprint across workloads |
| **Largest footprint** | B, D, C | 350–700 tok/s/user | 9–22 ms | 7.6K–19.6K t/s/hw | Significantly higher per-token compute cost, high TTFT — likely the largest/most capable models |

Model C in particular stands out: its TTFT averages 22 ms and throughput/box is ~7,500 —
an order of magnitude lower than Model I. It is likely the largest (or most complex
architecture) model in the set. Models I and G sit at the opposite end.

*Caveat: this is a relative compute-footprint ranking inferred from projection characteristics,
not a verified parameter-count claim. Architecture is not in the data.*

---

## Framework choices

**Chose React + Vite + Tailwind + Recharts + SheetJS:**
- React: natural fit for stateful multi-model comparison (selected models, active profile, batch size — all interactive); well-supported Recharts ecosystem
- Vite over CRA: faster dev builds, and the build output is a flat static bundle — deploys directly to Vercel's CDN with no server needed
- SheetJS (xlsx): client-side xlsx parsing, so uploaded files never leave the browser and no backend is required for the core flow
- Recharts: declarative chart components that compose cleanly into a React state-driven view

**Ruled out:**
- **Next.js**: no server-side requirements — SSR/SSG adds complexity with no benefit for a browser-parsed client tool
- **Streamlit / Gradio**: better for Python-native data work; harder to achieve a custom design system; would need Render or Hugging Face Spaces rather than Vercel's free static tier
- **Plain HTML/vanilla JS**: would not scale to the multi-model comparison state management without reinventing React

---

## Assumptions

- The `Summary` sheet name and structure (row 1 empty, row 2 headers, data from row 3) are stable across all conforming sweeps — this is the only parsing contract.
- The `Model_<Letter(s)>_profile_<N>` filename convention generalizes (could handle multi-letter model names like "AA").
- Go/no-go thresholds (800/400 tok/s, 50/200 ms, 1000/500 rpm) are plausible baselines for interactive applications — not calibrated to a specific customer SLA, which would require customer input to tune.
- Since the data is synthetic and the tool is internal, browser-side parsing with no server persistence is appropriate. A production version handling confidential customer projections would need server-side auth.
- Comparing 2–4 models simultaneously is the common case; the UI is optimized for that.

---

## What would change with more data / production measurements / more time

**(a) More data:** calibrate go/no-go thresholds empirically from real customer SLAs rather
than picking round numbers. Build per-industry profiles (fintech, media, enterprise RAG
each have different TTFT tolerances). Validate the anomaly checks against model sweeps that
had known projection errors to tune the trigger thresholds.

**(b) Production measurements alongside projections:** show projected vs. actual delta for
previously-deployed models. The anomaly detector would become a calibration-drift tracker —
an engineer could immediately see whether the projection methodology is drifting over
hardware generations before it reaches a customer.

**(c) More time:** persisted comparison sets with shareable links (a PM sends a customer a
pre-loaded link, not a screenshot). Per-customer workload templates where the customer
inputs their own token lengths rather than picking from 7 fixed profiles. Cost-per-token
overlay if billing data is available. Export to PDF for sales decks.

---

## Pre-loaded data

All 11 shipped models (A–K) × 7 profiles (77 sweeps total) are pre-loaded on launch —
no upload required to start comparing models.

## Upload your own sweep

Click **Upload Model Sweep** in the header and select one or more `.xlsx` files. The only
requirement is that the filename matches `Model_<X>_profile_<N>.xlsx` (or the spaced
variant `Model X profile N.xlsx`) and the file has a `Summary` sheet with the standard
column layout. The model name is derived from the filename regex at runtime — no code
change needed. Uploaded models join the comparison set alongside the pre-loaded models
immediately.

## Install and run locally

```bash
cd task1
npm install
npm run dev
```

Open http://localhost:5173

The app runs entirely in the browser — no environment variables, no API keys, no backend.

## Tech stack

React 19 + Vite + Tailwind CSS + Recharts + SheetJS (xlsx). Deployed on Vercel.
Static build output — `npm run build` produces a `dist/` folder that deploys as-is
to any static host.

## Video walkthrough

[link] — covers what I cut and why, framework chosen vs. ruled out, assumptions,
my read on model sizes (A–K) and profile use cases (1–7), and what would change
with production data or more time (≤5 minutes).
