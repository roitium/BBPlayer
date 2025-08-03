export function flatErrorMessage(
	error: Error,
	separator = ':: ',
	temp: string[] = [],
) {
	temp.push(error.message)
	if (error.cause) {
		if (error.cause instanceof Error) {
			flatErrorMessage(error.cause, separator, temp)
		}
	}
	return temp.join(separator)
}
