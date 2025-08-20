import type { PropsWithChildren } from 'react'
import { memo, useCallback, useState } from 'react'
import { View } from 'react-native'
import { Menu } from 'react-native-paper'

type FunctionalMenuProps = PropsWithChildren<Parameters<typeof Menu>[0]>

const FunctionalMenu = memo(function FunctionalMenu({
	children,
	...props
}: FunctionalMenuProps) {
	const [showContent, setShowContent] = useState(false)
	const onClose = useCallback(() => {
		setShowContent(false)
		props.onDismiss?.()
	}, [props])

	return (
		<Menu
			{...props}
			onDismiss={onClose}
			style={{
				opacity: showContent ? 1 : 0,
			}}
		>
			<View
				onLayout={() => {
					setTimeout(() => setShowContent(true), 100)
				}}
			/>
			{children}
		</Menu>
	)
})
export default FunctionalMenu
