# Test Coverage (Phase 5 & 6)

## Overview
This document tracks the test coverage requirements and implementations across recent phases, particularly focusing on the new Action Centre and Memory architecture.

## Phase 6 Memory & Action Centre Tests
The following invariants are covered by unit tests (using mocks only, no live Supabase/Google network calls):

- **Memory Proposal Creation**: Successfully creates proposals with correct payloads.
- **Sensitive Memory Rejection**: Memories containing "password", "secret", or "ssn" are rejected.
- **No Silent Memory Activation**: Proposals always start as "proposed".
- **Atomic Approval**: Approval creates exactly one active memory.
- **Idempotency**: Duplicate approvals are idempotent.
- **Memory Exclusion**: Deleted and expired memories are safely excluded from context retrieval.
- **Payload & Token Hashing**: Tokens are correctly hashed and verified against the `external_action_approvals` table.
- **Token Storage**: Plaintext tokens are NEVER stored in the database.
- **Execution Validation**: Execution requires valid, unconsumed, unexpired approval.
- **Atomic Duplication Protection**: Conditional updates prevent duplicate execution.
- **Provider Restrictions**: Gmail adapter does not have "send" capabilities; Calendar adapter verifies date ranges and valid IANA timezones.
- **UI States**: Chat Proposal cards render safely without exposing raw tokens.

## Running Tests
Run `npm run test:run` to execute the full test suite using Vitest and React Testing Library.
