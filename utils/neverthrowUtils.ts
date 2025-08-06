import { type Result, ResultAsync } from 'neverthrow'

/**
 * 运行 ResultAsync 并返回 Ok 或抛出错误（注意，当返回内容为 undefined 时也会抛出错误）
 * @param resultAsync The ResultAsync instance from the API call.
 * @returns Promise<T> which resolves with value T or rejects with error E.
 */
export async function returnOrThrowAsync<T, E>(
	resultAsync: ResultAsync<T, E> | Promise<Result<T, E>>,
): Promise<Exclude<T, undefined | null>> {
	const result = await resultAsync
	if (result.isOk()) {
		const value = result.value
		if (value === undefined || value === null) {
			throw new Error('Result is undefined')
		}
		return value as Exclude<T, undefined | null>
	}
	// eslint-disable-next-line @typescript-eslint/only-throw-error
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
