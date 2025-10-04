import { useModalStore } from '@/hooks/stores/useModalStore'
import { storage } from '@/utils/mmkv'
import toast from '@/utils/toast'
import * as Clipboard from 'expo-clipboard'
import * as WebBrowser from 'expo-web-browser'
import { useCallback } from 'react'
import { View } from 'react-native'
import { Button, Dialog, Text } from 'react-native-paper'

export interface UpdateModalProps {
	version: string
	notes: string
	url: string
	forced?: boolean
}

export default function UpdateAppModal({
	version,
	notes,
	url,
	forced = false,
}: UpdateModalProps) {
	const _close = useModalStore((state) => state.close)
	const close = useCallback(() => _close('UpdateApp'), [_close])

	const onUpdate = async () => {
		try {
			if (url) await WebBrowser.openBrowserAsync(url)
		} catch (e) {
			void Clipboard.setStringAsync(url)
			toast.error('无法打开浏览器，已将链接复制到剪贴板', {
				description: String(e),
			})
		}
		close()
	}

	const onSkip = () => {
		storage.set('skip_version', version)
		close()
	}

	const onCancel = () => {
		close()
	}

	return (
		<>
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
			<Dialog.Actions style={{ justifyContent: 'space-between' }}>
				{forced ? <Button onPress={onSkip}>跳过此版本</Button> : <View />}
				<View style={{ flexDirection: 'row' }}>
					<Button onPress={onCancel}>取消</Button>
					<Button onPress={onUpdate}>去更新</Button>
				</View>
			</Dialog.Actions>
		</>
	)
}
