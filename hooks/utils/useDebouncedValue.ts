import { useEffect, useRef, useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300) {
	const [debounced, setDebounced] = useState(value)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => {
			setDebounced(value)
		}, delay)
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		}
	}, [value, delay])

	return debounced
}
