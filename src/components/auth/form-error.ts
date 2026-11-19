import { ApiError } from "@/lib/api";

export interface AuthFailure {
  message: string;
  field?: string;
  code?: string;
}

export function describeAuthError(error: unknown): AuthFailure {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      ...(error.field ? { field: error.field } : {}),
      code: error.code,
    };
  }

  return { message: "Bir şeyler ters gitti. Tekrar dene." };
}
