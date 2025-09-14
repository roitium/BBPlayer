import { useEffect, useRef } from 'react'

export default function usePreviousState<T>(value: T) {
	const ref = useRef<T>(value)

	useEffect(() => {
		ref.current = value
	}, [value])

	return ref.current
}
