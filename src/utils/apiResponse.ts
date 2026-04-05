export function ok<T>(data: T, message = "OK") {
  return { success: true as const, message, data };
}

export function fail(message: string, details?: unknown) {
  return { success: false as const, message, details };
}
