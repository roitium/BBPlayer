import type { ResultAsync } from 'neverthrow'

/**
 * Awaits a ResultAsync and returns the value if Ok, otherwise throws the error.
 * Adapts neverthrow's ResultAsync to React Query's Promise expectation.
 * @param resultAsync The ResultAsync instance from the API call.
 * @returns Promise<T> which resolves with value T or rejects with error E.
 */
export async function returnOrThrowAsync<T, E>(
  resultAsync: ResultAsync<T, E>,
): Promise<T> {
  const result = await resultAsync
  if (result.isOk()) {
    return result.value
  }
  throw result.error
}
