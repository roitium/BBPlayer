import * as Haptics from 'expo-haptics'
import type { PropsWithChildren } from 'react'
import { memo, useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { Menu } from 'react-native-paper'

type FunctionalMenuProps = PropsWithChildren<Parameters<typeof Menu>[0]>

const FunctionalMenu = memo(function FunctionalMenu({
	children,
	onDismiss,
	visible,
	...props
}: FunctionalMenuProps) {
	const [showContent, setShowContent] = useState(false)
	const onClose = useCallback(() => {
		setShowContent(false)
		onDismiss?.()
	}, [onDismiss])

	useEffect(() => {
		if (visible) {
			void Haptics.performAndroidHapticsAsync(
				Haptics.AndroidHaptics.Context_Click,
			)
		}
	}, [visible])

	return (
		<>
			<Menu
				{...props}
				onDismiss={onClose}
				visible={visible}
				style={{
					opacity: showContent ? 1 : 0,
				}}
			>
				<View
					// new arch issue: 第一次打开 Menu 时会有闪烁，采用这种方法躲闪...
					onLayout={() => {
						setTimeout(() => setShowContent(true), 100)
					}}
				/>
				{children}
			</Menu>
		</>
	)
})
export default FunctionalMenu
