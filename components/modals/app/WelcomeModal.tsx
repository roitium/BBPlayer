import { useModalStore } from '@/hooks/stores/useModalStore'
import { storage } from '@/utils/mmkv'
import { useCallback } from 'react'
import { Button, Dialog, Text } from 'react-native-paper'

export default function WelcomeModal() {
	const _close = useModalStore((state) => state.close)
	const close = useCallback(() => _close('Welcome'), [_close])
	const open = useModalStore((state) => state.open)

	const confirmGuestMode = () => {
		storage.set('first_open', false)
		close()
	}
	const confirmLogin = () => {
		storage.set('first_open', false)
		open('QRCodeLogin', undefined)
		close()
	}

	return (
		<>
			<Dialog.Title>欢迎使用 BBPlayer</Dialog.Title>
			<Dialog.Content>
				<Text>
					看起来你是第一次打开 BBPlayer，容我介绍一下：BBPlayer
					是一款开源、简洁的音乐播放器，你可以使用他播放来自 BiliBili 的歌曲。
					{'\n\n'}
					风险声明：虽然开发者尽力负责任地调用 BiliBili API，但
					<Text style={{ fontWeight: '800' }}>仍不保证</Text>
					您的账号一定安全无虞，你可能会遇到包括但不限于：账号被风控、短期封禁乃至永久封禁等风险。请权衡利弊后再选择登录。
					{'\n\n'}
					如果您选择「游客模式」，本地播放列表、搜索、查看合集等大部分功能仍可使用，但无法访问并即时查看您自己收藏夹中的更新。
				</Text>
			</Dialog.Content>
			<Dialog.Actions>
				<Button onPress={confirmGuestMode}>游客模式</Button>
				<Button onPress={confirmLogin}>登录</Button>
			</Dialog.Actions>
		</>
	)
}
