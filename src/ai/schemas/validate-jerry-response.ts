import { z } from 'zod';
import { JerryResponseSchema } from './jerry-response.schema';
import { JerryResponse } from './jerry-response.types';

export interface ValidationResult {
  success: boolean;
  data?: JerryResponse;
  errors?: string[];
}

export function validateJerryResponse(data: unknown): JerryResponse {
  const result = safeValidateJerryResponse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.errors?.join('; ')}`);
  }
  return result.data!;
}

export function safeValidateJerryResponse(data: unknown): ValidationResult {
  try {
    // 1. Zod base validation
    const parsed = JerryResponseSchema.parse(data) as JerryResponse;
    const errors: string[] = [];

    // 2. Custom Business Rules
    
    // completed status with an unverified external execution
    if (parsed.status === 'completed' && parsed.execution && !parsed.execution.verified) {
      errors.push("Invalid state: 'completed' status requires a verified execution if execution is present.");
    }

    // needs_clarification with zero clarifying questions
    if (parsed.status === 'needs_clarification' && (!parsed.clarifying_questions || parsed.clarifying_questions.length === 0)) {
      errors.push("Invalid state: 'needs_clarification' requires at least one clarifying question.");
    }

    // needs_approval without an action proposal
    if (parsed.status === 'needs_approval' && !parsed.action) {
      errors.push("Invalid state: 'needs_approval' requires an action proposal.");
    }

    // needs_confirmation without an internal action proposal
    // Note: Jerry MVP describes internal writes needing confirmation
    if (parsed.status === 'needs_confirmation' && (!parsed.action || parsed.intent !== 'internal_write')) {
      errors.push("Invalid state: 'needs_confirmation' requires an internal action proposal and 'internal_write' intent.");
    }

    // unsupported intent with any executable action
    if (parsed.intent === 'unsupported' && parsed.action) {
      errors.push("Invalid state: 'unsupported' intent must not contain an executable action.");
    }

    // approved memory being silently returned without a proposal or verified record
    if (parsed.memory && parsed.memory.status === 'approved' && !parsed.memory.proposal_id) {
      errors.push("Invalid state: approved memory returned without a valid proposal or reference.");
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: parsed };

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Map Zod errors without exposing sensitive data
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Unknown validation error occurred'] };
  }
}
