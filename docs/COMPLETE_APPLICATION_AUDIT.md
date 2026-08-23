# Complete Application Audit

## 1. Current State of the UI

### Layout & Navigation (`src/components/Layout.tsx`, `src/App.tsx`)
- **Status:** Hardcoded navigation items. Missing several required routes (Overview, Monitoring, Investigations, Exceptions, Payments, Refunds, Disputes, Reconciliation, Merchants, Audit Trail). Admin configuration missing.
- **Roles:** No role-based access control (RBAC). Hardcoded user (NovaCart).
- **Global Search:** Command bar UI exists but does nothing (no logic).

### Dashboard (`src/pages/Dashboard.tsx`)
- **Status:** Entirely static.
- **KPIs:** "Processed", "Success Rate", "Merchant Health", "Open Incidents" are hardcoded strings. Buttons are not clickable or do not filter to respective views.
- **AI Briefing:** Hardcoded text.
- **Ask TRACE:** UI only, button is a dead link. 
- **Exceptions Requiring Attention:** Hardcoded INC_001 and INC_002. View All links to `/settlements`.

### Settlements (`src/pages/Settlements.tsx`)
- **Status:** Hardcoded array of settlements (SETL_8291, SETL_0091, SETL_3412, SETL_9921). 
- **Ask TRACE:** Extracts SETL_XXXX using a naive regex and navigates to `/settlements/SETL_8291` as fallback. Handles INC_ using a basic route redirect. Does not execute AI tools.

### SettlementDetail (`src/pages/SettlementDetail.tsx`)
- **Status:** Fake UI state simulation. Uses a `setTimeout` to step through fake investigation phases (`steps = ['Planning investigation...', ...]`).
- **Graph:** Hardcoded `initialNodes` and `initialEdges` (ReactFlow). Always shows the same graph regardless of the entity.
- **Resolution:** Buttons ("Mark Reconciled", "Escalate for Review") do nothing (dead buttons). 

### Incidents (`src/pages/Incidents.tsx`)
- **Status:** Hardcoded mock data.
- **Links:** Investigate links to `/incidents/:id`.

### IncidentDetail (`src/pages/IncidentDetail.tsx`)
- **Status:** Same as SettlementDetail. Hardcoded nodes and edges. Hardcoded AI Investigation Report.
- **Resolution:** Stateful Approve/Reject buttons but they only change local state, they do not trigger any actual DB updates or workflow transitions.
- **Timeline:** Hardcoded HTML timeline.

## 2. Missing Functionality (The Gaps)

1. **Role System:** Not implemented on frontend or backend. RLS is not configured for roles.
2. **Dynamic AI Ask TRACE:** No general purpose NLP routing for queries.
3. **Dynamic Investigation Engine:** Backend (`/api/investigate`) might process some AI tasks, but UI doesn't supply the dynamic graph nor does the backend build entity-specific causality graphs.
4. **Approval/Rejection Workflow:** Missing API routes and DB logic to handle human review, transition states, and log to `audit_logs`.
5. **Missing Pages:** Payments, Refunds, Disputes, Reconciliation, Merchants, Monitoring, Audit Trail are literally placeholder text in `App.tsx` or don't exist.
6. **Merchant Isolation:** RLS not strictly enforced in frontend queries (mostly because frontend doesn't query DB, it uses static data).
7. **SLA & Notifications:** Missing.

## 3. Workflow Issues
- Exceptions and Incidents do not transition through the full lifecycle: `DETECTED` -> `QUEUED` -> `AI_INVESTIGATING` -> `AI_RECOMMENDED` -> `HUMAN_REVIEW` -> `RESOLVED`.
- Fake timers are used instead of real timestamps from the DB.
- No end-to-end flow is possible because forms don't submit, data is static, and graphs are hardcoded.

## Conclusion
The application is currently a disjointed set of static mockups with a backend that can do some AI tricks but isn't wired to the UI. Phase 5 requires ripping out the static data and wiring every component to Supabase via React Query, building the missing pages, implementing real RBAC, and ensuring all state transitions are logged and execute real business logic.
