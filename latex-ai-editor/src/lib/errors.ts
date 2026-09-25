export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class CompileError extends AppError {
  constructor(message: string, public log?: string) {
    super("COMPILE_ERROR", message, 422, { log });
  }
}

export class ProjectLimitError extends AppError {
  constructor(message: string) {
    super("PROJECT_LIMIT_REACHED", message, 403);
  }
}

export class AIProviderError extends AppError {
  constructor(details?: unknown) {
    super("AI_PROVIDER_ERROR", "The AI service is unavailable right now. Please try again.", 502, details);
  }
}

export class AIInvalidOutputError extends AppError {
  constructor(reason: string) {
    super(
      "AI_INVALID_OUTPUT",
      "The AI returned an invalid edit, so nothing was changed. Try rephrasing the instruction.",
      422,
      { reason }
    );
  }
}

export class UsageLimitError extends AppError {
  constructor(message: string, details?: unknown) {
    super("USAGE_LIMIT_REACHED", message, 429, details);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
