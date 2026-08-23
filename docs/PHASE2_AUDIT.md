# TRACE PHASE 2: Codebase Audit

## 1. What already works
- **Frontend Architecture**: React + TypeScript + Vite + Tailwind v4 + React Router + TanStack Query are all correctly configured and running.
- **UI Foundation**: The Layout, Dashboard, Settlements, and Hero Investigation Workspace screens exist and align with the requested fintech institutional aesthetic.
- **React Flow**: The money graph library is integrated and rendering styled nodes and animated edges.
- **Base Financial Logic structures**: The directories and basic signatures for `calculator`, `scorer`, `reconciler`, and `webhook` exist.
- **Database Base Schema**: The initial migration `20260822000000_initial_schema.sql` properly defines `merchants`, `customers`, `orders`, `payments`, `refunds`, `disputes`, `settlements`, `adjustments`, `bank_accounts`, `bank_transactions`, and basic `webhook_events`.

## 2. What is mocked
- **Investigation Orchestrator**: The edge function `supabase/functions/investigate/index.ts` is purely returning hardcoded JSON responses based on an `if (id === 'SETL_8291')` block.
- **Investigation Progress**: `SettlementDetail.tsx` uses a `setTimeout` interval to fake the progression of AI steps.
- **Money Graph**: `SettlementDetail.tsx` uses hardcoded `initialNodes` and `initialEdges` for the SETL_8291 scenario.
- **Reconciliation Engine**: `engine/reconciliation/reconciler.ts` attempts to back-calculate gross amounts instead of fetching underlying items.
- **Dashboard KPIs**: The metrics are hardcoded.

## 3. What is incomplete
- **Database Schema**: Missing crucial tables requested for Phase 2: `event_attempts`, `investigation_steps`, `ai_tool_calls`, `ai_findings`, `match_candidates`, `reconciliation_runs`, `reconciliation_results`, `benchmark_runs`, `benchmark_cases`.
- **Money Utility**: `engine/financial/money.ts` needs to be created to enforce strict integer (paise) arithmetic.
- **Real Settlement Calculation Engine**: `engine/financial/settlement.ts` needs to fetch DB records and apply the formula.
- **Exception Engine**: Needs `engine/exceptions/` to detect `SETTLEMENT_VARIANCE`, `MISSING_SETTLEMENT`, etc.
- **Severity Engine**: Needs deterministic threshold rules.
- **Anomaly Injection Engine**: Needs `engine/anomaly/` to actually modify the DB for test cases.
- **Investigation Backend**: State machine persistence and step recording to the DB.
- **Graph Builder**: A backend service to convert DB records into React Flow JSON.
- **Evidence Verification**: Needs `engine/evidence/` to cross-reference AI findings with actual DB records.

## 4. What will be replaced
- The mock edge function (`investigate/index.ts`) will be replaced with real backend logic (either an edge function or a Next.js style API/service) that executes the investigation state machine.
- The `setTimeout` simulation in the frontend will be replaced by a polling or realtime subscription to `investigations` and `investigation_steps`.
- The hardcoded React Flow state will be replaced by fetching the backend graph builder.
- The `if (id === 'SETL_8291')` statement will be replaced by actual data-driven variance discovery.

## 5. What will remain unchanged
- The overall UI styling, layout, and visual aesthetic.
- The Tailwind v4 token system.
- The React Router configuration.
- The base database migration (`20260822000000_initial_schema.sql`), which will merely be supplemented by a new non-destructive migration.
