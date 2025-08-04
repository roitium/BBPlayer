import type { RootStackParamList } from '@/types/navigation'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useCallback } from 'react'

function useResetScreenOnBlur() {
	const navigation =
		useNavigation<NativeStackNavigationProp<RootStackParamList>>()
	useFocusEffect(
		useCallback(() => {
			return () => navigation.setParams({ tab: undefined })
		}, [navigation]),
	)
}

export default useResetScreenOnBlur
