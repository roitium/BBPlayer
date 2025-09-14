import { usePreventRemove } from '@react-navigation/native'
import { useCallback, useState } from 'react'

export function useTrackSelection() {
	const [selected, setSelected] = useState<Set<number>>(() => new Set())
	const [selectMode, setSelectMode] = useState<boolean>(false)

	const toggle = useCallback((id: number) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}, [])

	const enterSelectMode = useCallback((id: number) => {
		setSelectMode(true)
		setSelected(new Set([id]))
	}, [])

	const exitSelectMode = useCallback(() => {
		setSelectMode(false)
		setSelected(new Set())
	}, [])

	usePreventRemove(selectMode, () => {
		exitSelectMode()
	})

	return {
		selected,
		selectMode,
		toggle,
		enterSelectMode,
		exitSelectMode,
		setSelectMode,
		setSelected,
	}
}
