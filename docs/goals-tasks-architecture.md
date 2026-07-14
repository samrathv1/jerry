# Goals, Tasks, and Internal Actions Architecture

## 1. Database Design

We introduce four new tables with strict Row Level Security (RLS) tied to `auth.users(id)`:
- `goals`: Long-term objectives with progress tracking and status.
- `tasks`: Actionable items, optionally tied to a goal via `goal_id`.
- `internal_action_proposals`: Captures Jerry's intent to perform an action (like `create_tasks`). Used for user confirmation.
- `internal_action_executions`: Ensures idempotency. Tracks the execution state of an action proposal.

## 2. Tool Contracts & Read/Write Behavior

Jerry has 4 new tools registered via OpenAI Structured Tools:
1. `get_user_context`: (Read-Only) Fetches authenticated user's timezone, name, and summarized goals/tasks metrics.
2. `list_goals_tasks`: (Read-Only) Fetches user goals and tasks with sophisticated filtering and sorting.
3. `draft_goal_plan`: (Read-Only) Produces a structured JSON plan output without persisting to the DB.
4. `create_internal_tasks`: (Internal Reversible) Persists tasks to the DB, but only after explicit UI-based confirmation.

## 3. Confirmation Lifecycle

When Jerry wants to create tasks based on a plan:
1. A POST request is made to `/api/internal-actions/proposals`.
2. This creates an `internal_action_proposals` record securely owned by the user, storing the exact payload hash and a 1-hour expiry.
3. The server generates a temporary pseudo `confirmation_token`.
4. The Chat UI renders a `ProposalConfirmationCard` containing the exact tasks to be created.
5. If the user clicks "Confirm & Run", a request is dispatched to `/api/internal-actions/proposals/[id]/confirm`.
6. This endpoint verifies the token, proposal expiry, ownership, and delegates to the `create_internal_tasks` tool execution.
7. Upon successful creation, the proposal is marked `executed`.

## 4. Idempotency Strategy

To prevent accidental double-task creation from network retries or double-clicks:
- Every execution attempt is tracked in `internal_action_executions`.
- There is a unique constraint on `(user_id, idempotency_key)`.
- Before task insertion begins, the execution row must successfully insert as `running`.
- If an execution already exists for that `idempotency_key`, the execution is bypassed or returns the previous successful result.

## 5. UI Routes

- `/goals`: Overview of active goals.
- `/goals/[goalId]`: Detail view of a goal and its associated tasks.
- `/tasks`: Filterable and sortable list of tasks (Today, Upcoming, Overdue, High Priority).

## 6. Testing

- Test suite includes validations for RLS isolation, tool parameter parsing, action hashing, and confirmation lifecycles.
- Run tests via `npm run test:run`.

## 7. Known Limitations
- The `confirmation_token` generation is currently a simplified pseudo-token scheme. In highly sensitive production apps, this should be an HMAC signed token with JWT-like expirations baked into the signature.
- Memory integration is not yet active.
