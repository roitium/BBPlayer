import { useModalStore } from '@/hooks/stores/useModalStore'
import { Button, Dialog, Text } from 'react-native-paper'

export interface AlertButton {
	text: string
	onPress?: () => void
}

export interface AlertOptions {
	cancelable?: boolean
}

export interface AlertModalProps {
	title: string
	message?: string
	buttons: readonly [AlertButton, AlertButton?] // [negative, positive]
	options?: AlertOptions
}

export default function AlertModal({
	title,
	message,
	buttons,
}: AlertModalProps) {
	const close = useModalStore((state) => state.close)

	const renderButton = (button: AlertButton | undefined, index: number) => {
		if (!button) return null
		switch (index) {
			case 0: {
				return (
					<Button
						key={index}
						onPress={button.onPress ?? (() => close('Alert'))}
						uppercase={false}
						mode='text'
					>
						{button.text}
					</Button>
				)
			}
			case 1: {
				const handlePress = () => {
					button.onPress?.()
					close('Alert')
				}
				return (
					<Button
						key={index}
						onPress={handlePress}
						uppercase={false}
						mode='text'
					>
						{button.text}
					</Button>
				)
			}
		}
	}

	return (
		<>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Content>
				<Text variant='bodyMedium'>{message}</Text>
			</Dialog.Content>
			<Dialog.Actions>{buttons.map(renderButton)}</Dialog.Actions>
		</>
	)
}

export function alert(
	title: string,
	message: string,
	buttons: readonly [AlertButton, AlertButton?],
	options?: AlertOptions,
) {
	useModalStore
		.getState()
		.open(
			'Alert',
			{ title, message, buttons, options },
			{ dismissible: !!options?.cancelable },
		)
}
