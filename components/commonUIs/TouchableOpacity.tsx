import { memo } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

function _TouchableOpacity({
	children,
	onPress,
	activeOpacity,
	style,
	disabled,
}: {
	children: React.ReactNode
	onPress: () => void
	activeOpacity?: number
	style?: StyleProp<ViewStyle>
	disabled?: boolean
}) {
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				style ?? {},
				pressed ? { opacity: activeOpacity ?? 0.7 } : null,
			]}
			disabled={disabled}
		>
			{children}
		</Pressable>
	)
}

const TouchableOpacity = memo(_TouchableOpacity)

TouchableOpacity.displayName = 'TouchableOpacity'

export default TouchableOpacity
