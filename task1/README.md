# Cerebras Performance Explorer — Task 1

Live URL: [TO BE ADDED AFTER DEPLOYMENT]

## What it does
Turns Cerebras internal performance projection spreadsheets into 
two audience-specific views:
- **Customer View** — go/no-go signal with Gen Speed, TTFT, and RPM
- **Engineer View** — full 19-column data, charts, and anomaly detection

## Install and run locally

1. Install dependencies:
   cd task1
   npm install

2. Start the dev server:
   npm run dev

3. Open http://localhost:5173

## Upload a model sweep
Click "Upload Model Sweep" and select any .xlsx file matching the
Model_<X>_profile_<N> naming convention. Multiple files can be 
uploaded at once. Uploaded sweeps are session-only.

## Tech stack
React + Vite, Recharts, SheetJS, Tailwind CSS
Deployed on Vercel
