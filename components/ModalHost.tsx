import navigationRef from '@/app/navigationRef'
import { useModalStore } from '@/hooks/stores/useModalStore'
import { usePreventRemove } from '@react-navigation/native'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useShallow } from 'zustand/shallow'
import AnimatedModalOverlay from './commonUIs/AnimatedModalOverlay'
import { modalRegistry } from './ModalRegistry'

export default function ModalHost() {
	const { modals, generation } = useModalStore(
		useShallow((state) => ({
			modals: state.modals,
			generation: state.generation,
		})),
	)
	const close = useModalStore((s) => s.close)
	const closeTop = useModalStore((s) => s.closeTop)
	const eventEmitter = useModalStore((s) => s.eventEmitter)

	usePreventRemove(modals.length > 0, () => {
		if (modals[modals.length - 1].options?.dismissible === false) {
			return
		}
		closeTop()
	})

	useEffect(() => {
		if (modals.length === 0 && navigationRef.current) {
			const cur = navigationRef.current.getCurrentRoute?.()
			if (cur?.name === 'ModalHost' && navigationRef.current.canGoBack?.()) {
				navigationRef.current.goBack()
				// 确保在 ModalHost 关闭后再执行回调，避免其他导航操作与 ModalHost 关闭发生竞态
				setImmediate(() => {
					eventEmitter.emit('modalHostDidClose')
				})
			}
		}
	}, [eventEmitter, modals])

	if (!modals.length) return null

	return (
		<View
			style={StyleSheet.absoluteFill}
			pointerEvents='box-none'
		>
			{modals.map((m, idx) => {
				const Component = modalRegistry[m.key]
				if (!Component) return null
				const zIndex = 1000 + idx * 100
				return (
					<AnimatedModalOverlay
						key={`${m.key}_${generation}`}
						visible
						onDismiss={() => {
							if (
								m.options?.dismissible === undefined ||
								m.options?.dismissible
							) {
								close(m.key)
							}
						}}
						contentStyle={{ zIndex }}
					>
						{/*
            // @ts-expect-error -- 懒得管了*/}
						<Component {...m.props} />
					</AnimatedModalOverlay>
				)
			})}
		</View>
	)
}
