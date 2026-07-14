export class OrchestrationError extends Error {
  constructor(public code: string, message: string, public details?: any) {
    super(message);
    this.name = 'OrchestrationError';
  }
}

export class InvalidRequestError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('invalid_request', message, details);
    this.name = 'InvalidRequestError';
  }
}

export class PromptLoadFailedError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('prompt_load_failed', message, details);
    this.name = 'PromptLoadFailedError';
  }
}

export class OpenAIRequestFailedError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('openai_request_failed', message, details);
    this.name = 'OpenAIRequestFailedError';
  }
}

export class EmptyModelOutputError extends OrchestrationError {
  constructor(message: string = 'Model returned empty output') {
    super('empty_model_output', message);
    this.name = 'EmptyModelOutputError';
  }
}

export class StructuredOutputFailedError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('structured_output_failed', message, details);
    this.name = 'StructuredOutputFailedError';
  }
}

export class ResponseValidationFailedError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('response_validation_failed', message, details);
    this.name = 'ResponseValidationFailedError';
  }
}

export class RepairFailedError extends OrchestrationError {
  constructor(message: string, details?: any) {
    super('repair_failed', message, details);
    this.name = 'RepairFailedError';
  }
}
