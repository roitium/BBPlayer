import type { PropsWithChildren } from 'react'
import { memo, useCallback, useState } from 'react'
import { View } from 'react-native'
import { Menu } from 'react-native-paper'
import MenuBackdropOverlay from './MenuBackdropOverlay'

type FunctionalMenuProps = PropsWithChildren<Parameters<typeof Menu>[0]>

const FunctionalMenu = memo(function FunctionalMenu({
	children,
	...props
}: FunctionalMenuProps) {
	const [showContent, setShowContent] = useState(false)
	const onClose = useCallback(() => {
		setShowContent(false)
		props.onDismiss?.()
	}, [props.onDismiss])

	return (
		<>
			<Menu
				{...props}
				onDismiss={onClose}
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
			<MenuBackdropOverlay
				visible={showContent}
				onPressOutside={onClose}
			/>
		</>
	)
})
export default FunctionalMenu
