# Action Centre Architecture

The Action Centre governs the execution of all external actions (e.g., Google integrations) on behalf of the user, ensuring strict user control, atomic consumption, and auditability.

## Database Schema

1. **external_action_proposals**: Stores the proposed action, including provider (`google`), tool (`gmail_draft`, `calendar_event`), a JSON `payload`, its SHA-256 `payload_hash`, and the `status`.
2. **external_action_approvals**: Stores the cryptographic approval tokens (`token_hash`), linking them to a proposal and defining a short-lived `expires_at` window. Also records when the token was consumed.
3. **external_action_executions**: Records the exact state of execution (`queued`, `running`, `completed`, `failed`), providing a unique constraint on `proposal_id` for idempotency.

## Approval Flow

1. Jerry proposes an action -> Proposal is created (`status: pending`).
2. User reviews the proposal UI and clicks "Approve" -> The API generates a random 32-byte opaque token and stores its SHA-256 hash in `external_action_approvals`. The token is returned to the client.
3. The client immediately calls `/execute` with the plaintext token.
4. The server hashes the token and atomically consumes the approval row in a single query (using conditional update `is('consumed_at', null)`).
5. The `payload_hash` is verified against the approval row and the current proposal row to prevent tampering.
6. A single execution row is inserted. If one already exists, the request fails (Idempotency).
7. The external API is called via the provider adapter, and the response is safely logged.

## Tokens & Hashing

- **NEVER** log or expose plaintext approval tokens in the database, server logs, or provider responses.
- Payload hashing prevents modifications to the proposal payload after an approval has been granted.
