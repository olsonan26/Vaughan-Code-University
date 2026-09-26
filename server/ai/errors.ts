export class AiError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.name = 'AiError';
    this.retryable = retryable;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AiNotConfiguredError extends AiError {
  constructor(message = 'DeepSeek is not configured: set DEEPSEEK_API_KEY on the server') {
    super(message, false);
    this.name = 'AiNotConfiguredError';
  }
}

export class AiTimeoutError extends AiError {
  constructor(message = 'AI request timed out') {
    super(message, true);
    this.name = 'AiTimeoutError';
  }
}

export class AiRateLimitError extends AiError {
  constructor(message = 'AI rate limit exceeded') {
    super(message, true);
    this.name = 'AiRateLimitError';
  }
}

export class AiProviderError extends AiError {
  readonly status: number;

  constructor(status: number, retryable: boolean, message?: string) {
    const defaultMsg = status === 401
      ? 'The DeepSeek API key is invalid'
      : `AI provider returned status ${status}`;
    super(message || defaultMsg, retryable);
    this.name = 'AiProviderError';
    this.status = status;
  }
}

export class AiOutputValidationError extends AiError {
  readonly issues: unknown;
  readonly rawText: string;

  constructor(issues: unknown, rawText: string, message = 'AI output failed JSON schema validation') {
    super(message, false);
    this.name = 'AiOutputValidationError';
    this.issues = issues;
    this.rawText = rawText;
  }
}
