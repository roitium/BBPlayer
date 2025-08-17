import { AnimatedModal } from '@/components/AnimatedModal'
import { storage } from '@/utils/mmkv'
import * as WebBrowser from 'expo-web-browser'
import { Button, Dialog, Text } from 'react-native-paper'

export interface UpdateModalProps {
	visible: boolean
	setVisible: (v: boolean) => void
	version: string
	notes: string
	url: string
	forced?: boolean
}

export default function UpdateAppModal({
	visible,
	setVisible,
	version,
	notes,
	url,
	forced = false,
}: UpdateModalProps) {
	const onUpdate = async () => {
		if (url) await WebBrowser.openBrowserAsync(url)
		setVisible(false)
	}

	const onSkip = () => {
		storage.set('skip_version', version)
		setVisible(false)
	}

	const onCancel = () => {
		setVisible(false)
	}

	return (
		<AnimatedModal
			visible={visible}
			onDismiss={() => void 0}
		>
			<Dialog.Title>发现新版本 {version}</Dialog.Title>
			<Dialog.Content>
				{forced ? (
					<Text style={{ marginBottom: 8, fontWeight: 'bold' }}>
						此更新为强制更新，必须安装后继续使用。
					</Text>
				) : null}
				<Text selectable>
					{/* 小米对联，偷了！ */}
					{notes?.trim() || '提高软件稳定性，优化软件流畅度'}
				</Text>
			</Dialog.Content>
			<Dialog.Actions>
				{!forced && (
					<>
						<Button onPress={onCancel}>取消</Button>
						<Button onPress={onSkip}>跳过此版本</Button>
					</>
				)}
				<Button
					mode='contained'
					onPress={onUpdate}
				>
					去更新
				</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
}
