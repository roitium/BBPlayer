import { type Result, ResultAsync } from 'neverthrow'

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

/**
 * Convert a function like `(...args: A) => Promise<Result<T, E>>` into `(...args: A) => ResultAsync<T, E>`.
 *
 * Similarly to the warnings at https://github.com/supermacro/neverthrow#resultasyncfromsafepromise-static-class-method
 *
 * you must ensure that `func` will never reject.
 */
export function wrapResultAsyncFunction<A extends unknown[], T, E>(
  func: (...args: A) => Promise<Result<T, E>>,
): (...args: A) => ResultAsync<T, E> {
  return (...args): ResultAsync<T, E> => new ResultAsync(func(...args))
}
