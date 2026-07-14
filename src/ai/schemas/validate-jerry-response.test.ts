import { describe, it, expect } from 'vitest';
import { safeValidateJerryResponse } from './validate-jerry-response';

describe('validateJerryResponse', () => {
  const getValidBase = (): any => ({
    schema_version: '0.1',
    intent: 'answer',
    status: 'completed',
    user_message: 'Here is the answer.',
    clarifying_questions: [],
    answer: 'The answer is 42.',
    plan: null,
    citations: [],
    action: null,
    memory: null,
    execution: null,
    uncertainty: null,
    next_step: null
  });

  it('A. A valid completed read-only answer passes.', () => {
    const data = getValidBase();
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(true);
  });

  it('B. An unknown intent fails.', () => {
    const data = getValidBase();
    (data as any).intent = 'magic';
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('C. A missing top-level field fails.', () => {
    const data = getValidBase();
    delete (data as any).user_message;
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('D. needs_clarification with no questions fails.', () => {
    const data = getValidBase();
    data.status = 'needs_clarification';
    data.clarifying_questions = [];
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('E. needs_clarification with questions passes.', () => {
    const data = getValidBase();
    data.status = 'needs_clarification';
    data.clarifying_questions = ['What do you mean?'];
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(true);
  });

  it('F. needs_approval without an action fails.', () => {
    const data = getValidBase();
    data.status = 'needs_approval';
    data.action = null;
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('G. needs_confirmation without an internal action fails.', () => {
    const data = getValidBase();
    data.status = 'needs_confirmation';
    data.action = null;
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);

    // Also test intent mismatch
    const data2 = getValidBase();
    data2.status = 'needs_confirmation';
    data2.intent = 'external_write';
    data2.action = {
      action_id: '1',
      action_type: 'task',
      tool_name: 't1',
      risk_tier: 'R1',
      proposal_payload: {},
      approval_required: true,
      approval_status: 'not_required',
      approval_expires_at: null,
      idempotency_key: null,
      provider_result: null
    };
    const result2 = safeValidateJerryResponse(data2);
    expect(result2.success).toBe(false);
  });

  it('H. unsupported intent with an executable action fails.', () => {
    const data = getValidBase();
    data.intent = 'unsupported';
    data.action = {
      action_id: '1',
      action_type: 'bad',
      tool_name: 't1',
      risk_tier: 'R3',
      proposal_payload: {},
      approval_required: true,
      approval_status: 'not_required',
      approval_expires_at: null,
      idempotency_key: null,
      provider_result: null
    };
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('I. completed external action with running execution fails.', () => {
    const data = getValidBase();
    data.intent = 'external_write';
    data.status = 'completed';
    data.execution = {
      execution_id: 'exe1',
      execution_type: 'ext',
      state: 'running',
      started_at: 'now',
      completed_at: null,
      error_message: null,
      retryable: false,
      verified: false
    };
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('J. completed external action with verified completed execution passes.', () => {
    const data = getValidBase();
    data.intent = 'external_write';
    data.status = 'completed';
    data.action = {
      action_id: '1',
      action_type: 'test',
      tool_name: 'tool',
      risk_tier: 'R2',
      proposal_payload: {},
      approval_required: false,
      approval_status: 'approved',
      approval_expires_at: null,
      idempotency_key: null,
      provider_result: null
    };
    data.execution = {
      execution_id: 'exe1',
      execution_type: 'ext',
      state: 'completed',
      started_at: 'now',
      completed_at: 'now',
      error_message: null,
      retryable: false,
      verified: true
    };
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(true);
  });

  it('K. approved memory without a verified approval record fails according to the existing rules.', () => {
    const data = getValidBase();
    data.memory = {
      proposal_id: null,
      memory_text: 'Mem',
      category: 'Cat',
      reason: 'Reason',
      source: 'Source',
      expires_at: null,
      status: 'approved'
    };
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });

  it('L. unknown nested fields fail if the schemas are intended to be strict.', () => {
    const data = getValidBase();
    (data as any).action = {
      action_id: '1',
      action_type: 't',
      tool_name: 't',
      risk_tier: 'R0',
      proposal_payload: {},
      approval_required: false,
      approval_status: 'not_required',
      approval_expires_at: null,
      idempotency_key: null,
      provider_result: null,
      unknown_field: 'bad'
    };
    const result = safeValidateJerryResponse(data);
    expect(result.success).toBe(false);
  });
});
