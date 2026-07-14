# Memory Architecture

The Jerry memory system provides long-term, user-controlled context for the AI agent.

## Core Concepts

1. **Memory Proposals**: During conversation, if Jerry identifies important preferences, contexts, or workflows, it creates a *Memory Proposal* (`memory_proposals` table). A proposal is completely inert and does not enter the AI context.
2. **Approval Process**: The user must explicitly approve the proposal (R1 or R2 approval depending on risk, although most memory proposals are low-risk). 
   - Note: Memory approvals do **not** use opaque tokens. The atomic transition from `proposed` to `approved` is handled directly via authenticated requests to the API.
3. **Active Memories**: Approving a proposal creates exactly one active `memories` record. 
4. **Lifecycle & Idempotency**:
   - Approving an already-approved memory proposal is idempotent.
   - Modifying a memory proposal invalidates its approval and resets it to `proposed`.
   - Memories can be soft-deleted by the user, immediately excluding them from retrieval.

## Retrieval Strategy

Memory retrieval is bounded and deterministic. It applies the following filters:
- **Status**: Must be `active`.
- **Expiry**: Must not be past `expires_at`.
- **Relevance**: Matched by `category` or simple `keyword` (full semantic vector search is reserved for future phases with real embeddings).
- **Budget**: Memories are retrieved up to a maximum character budget (e.g. 10,000 chars) to prevent context window bloat.

Only the retrieved, safe, and active memories are injected into Jerry's system prompt or context window. Memory content NEVER overrides system instructions or tool constraints.
