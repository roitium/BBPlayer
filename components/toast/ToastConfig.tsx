import type { BaseToastProps } from 'react-native-toast-message'
import { BaseToast } from 'react-native-toast-message'

export const toastConfig = {
	success: (props: BaseToastProps) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: 'green', minHeight: 60, height: 'auto' }}
			text1Style={{
				fontSize: 15,
				fontWeight: 'normal',
			}}
			text2Style={{
				fontSize: 10,
			}}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
		/>
	),
	error: (props: BaseToastProps) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: 'red', minHeight: 60, height: 'auto' }}
			text1Style={{
				fontSize: 15,
				fontWeight: 'normal',
			}}
			text2Style={{
				fontSize: 10,
			}}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
		/>
	),
	info: (props: BaseToastProps) => (
		<BaseToast
			{...props}
			style={{ borderLeftColor: '#87CEFA', minHeight: 60, height: 'auto' }}
			text1Style={{
				fontSize: 15,
				fontWeight: 'normal',
			}}
			text2Style={{
				fontSize: 10,
			}}
			text1NumberOfLines={0}
			text2NumberOfLines={0}
		/>
	),
}
