import { useQueryClient } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { memo, useEffect, useState } from 'react'
import { Button, Dialog, Text, useTheme } from 'react-native-paper'
import * as setCookieParser from 'set-cookie-parser'
import { favoriteListQueryKeys } from '@/hooks/queries/bilibili/useFavoriteData'
import { userQueryKeys } from '@/hooks/queries/bilibili/useUserData'
import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/bilibili.api'
import { BilibiliQrCodeLoginStatus } from '@/types/apis/bilibili'
import Toast from '@/utils/toast'

const QrCodeLoginModal = memo(function QrCodeLoginModal({
	visible,
	setVisible,
}: {
	visible: boolean
	setVisible: (visible: boolean) => void
}) {
	const { colors } = useTheme()
	const queryClient = useQueryClient()
	const [statusText, setStatusText] = useState<string>('')
	const [qrcodeKey, setQrcodeKey] = useState('')
	const [qrcodeUrl, setQrcodeUrl] = useState('')
	const [startPolling, setStartPolling] = useState(false)
	const [isExpired, setIsExpired] = useState(false)
	const setCookie = useAppStore((state) => state.setBilibiliCookie)

	useEffect(() => {
		if (!visible) return
		const result = bilibiliApi.getLoginQrCode()
		result.then((response) => {
			if (response.isErr()) {
				Toast.error('获取二维码失败', {
					description: String(response.error),
					id: 'bilibili-qrcode-login-error',
				})
				setVisible(false)
				return
			}
			const { url, qrcode_key } = response.value
			setQrcodeKey(qrcode_key)
			setQrcodeUrl(url)
			setStatusText('等待扫码')
			setStartPolling(true)
		})
		return () => {
			setStartPolling(false)
			setQrcodeKey('')
			setQrcodeUrl('')
			setStatusText('')
			setIsExpired(false)
		}
	}, [setVisible, visible])

	useEffect(() => {
		if (startPolling && qrcodeKey && visible) {
			const interval = setInterval(async () => {
				const response = await bilibiliApi.pollQrCodeLoginStatus(qrcodeKey)
				if (response.isErr()) {
					Toast.error('获取二维码登录状态失败，你可以继续尝试登录', {
						description: String(response.error),
						id: 'bilibili-qrcode-login-status-error',
					})
					return
				}
				if (
					response.value.status ===
					BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS
				) {
					setStartPolling(false)
					setStatusText('登录成功')
					const splitedCookie = setCookieParser.splitCookiesString(
						response.value.cookies,
					)
					const parsedCookie = setCookieParser.parse(splitedCookie)
					const finalCookie = parsedCookie.map((c) => {
						return { key: c.name, value: c.value }
					})
					setCookie(finalCookie)
					Toast.success('登录成功', {
						description: response.value.cookies,
						id: 'bilibili-qrcode-login-success',
					})
					queryClient.refetchQueries({ queryKey: favoriteListQueryKeys.all })
					queryClient.refetchQueries({ queryKey: userQueryKeys.all })
				}
				switch (response.value.status) {
					case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_WAIT:
						setStatusText('等待扫码')
						break
					case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SCANNED_BUT_NOT_CONFIRMED:
						setStatusText('等待确认')
						break
					case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS:
						setStatusText('扫码成功')
						break
					case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_QRCODE_EXPIRED:
						setStatusText('二维码已过期，请重新打开窗口')
						setIsExpired(true)
						setStartPolling(false)
						break
					default:
						setStatusText('未知状态')
						Toast.error('未知的二维码登录状态', {
							description: `状态码: ${response.value}`,
							id: 'bilibili-qrcode-login-status-unknown',
						})
						return
				}
			}, 2000)
			return () => clearInterval(interval)
		}
	}, [startPolling, qrcodeKey, visible, setCookie, queryClient.refetchQueries])

	useEffect(() => {
		if (isExpired) {
			setQrcodeUrl('')
			setQrcodeKey('')
		}
	}, [isExpired])

	return (
		<Dialog
			visible={visible}
			onDismiss={() => setVisible(false)}
		>
			<Dialog.Title>请在手机上打开 BBPlayer 并扫码登录</Dialog.Title>
			<Dialog.Content>
				<Text style={{ textAlign: 'center', color: colors.error, padding: 16 }}>
					{statusText}
				</Text>
				{qrcodeUrl ? (
					// <Image
					//   source={{ uri: qrcodeUrl }}
					//   cachePolicy={'none'}
					//   blurRadius={isExpired ? 100 : 0}
					//   alt='QR Code'
					//   style={{ width: 200, height: 200 }}
					// />
					<Button onPress={() => WebBrowser.openBrowserAsync(qrcodeUrl)}>
						<Text style={{ textAlign: 'center', padding: 16 }}>
							{qrcodeUrl}
						</Text>
					</Button>
				) : (
					<Text style={{ textAlign: 'center', padding: 16 }}>
						正在生成二维码...
					</Text>
				)}
			</Dialog.Content>
		</Dialog>
	)
})

QrCodeLoginModal.displayName = 'QrCodeLoginModal'

export default QrCodeLoginModal
