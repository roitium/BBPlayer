import useAppStore from '@/hooks/stores/useAppStore'
import { bilibiliApi } from '@/lib/api/bilibili/api'
import { BilibiliQrCodeLoginStatus } from '@/types/apis/bilibili'
import toast from '@/utils/toast'
import * as Sentry from '@sentry/react-native'
import { useQueryClient } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'
import { memo, useEffect, useReducer } from 'react'
import { Pressable } from 'react-native'
import { Button, Dialog, Portal, Text } from 'react-native-paper'
import QRCode from 'react-native-qrcode-svg'
import * as setCookieParser from 'set-cookie-parser'

type Status =
	| 'prompting'
	| 'generating'
	| 'polling'
	| 'expired'
	| 'success'
	| 'error'

interface State {
	status: Status
	statusText: string
	qrcodeKey: string
	qrcodeUrl: string
}

type Action =
	| { type: 'START_LOGIN' }
	| { type: 'RESET' }
	| {
			type: 'GENERATE_SUCCESS'
			payload: { qrcode_key: string; url: string }
	  }
	| { type: 'GENERATE_FAILURE'; payload: string }
	| { type: 'POLL_UPDATE'; payload: { code: number } }
	| { type: 'LOGIN_SUCCESS' }

const initialState: State = {
	status: 'prompting',
	statusText: '是否开始扫码登录？',
	qrcodeKey: '',
	qrcodeUrl: '',
}

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'START_LOGIN':
			return { ...state, status: 'generating', statusText: '正在生成二维码...' }
		case 'RESET':
			return initialState
		case 'GENERATE_SUCCESS':
			return {
				...state,
				status: 'polling',
				statusText: '等待扫码',
				qrcodeKey: action.payload.qrcode_key,
				qrcodeUrl: action.payload.url,
			}
		case 'GENERATE_FAILURE':
			return {
				...state,
				status: 'error',
				statusText: `获取二维码失败: ${action.payload}`,
			}
		case 'POLL_UPDATE':
			switch (action.payload.code as BilibiliQrCodeLoginStatus) {
				case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_WAIT:
					return { ...state, statusText: '等待扫码' }
				case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SCANNED_BUT_NOT_CONFIRMED:
					return { ...state, statusText: '等待确认' }
				case BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_QRCODE_EXPIRED:
					return {
						...state,
						status: 'expired',
						statusText: '二维码已过期，请重新打开窗口',
						qrcodeKey: '',
						qrcodeUrl: '',
					}
				default:
					return state
			}
		case 'LOGIN_SUCCESS':
			return { ...state, status: 'success', statusText: '登录成功' }
		default:
			return state
	}
}

const QrCodeLoginModal = memo(function QrCodeLoginModal({
	visible,
	setVisible,
}: {
	visible: boolean
	setVisible: (visible: boolean) => void
}) {
	const queryClient = useQueryClient()
	const setCookie = useAppStore((state) => state.setBilibiliCookieFromList)

	const [state, dispatch] = useReducer(reducer, initialState)
	const { status, statusText, qrcodeKey, qrcodeUrl } = state

	useEffect(() => {
		if (status !== 'generating') return

		const generateQrCode = async () => {
			const response = await bilibiliApi.getLoginQrCode()
			if (response.isErr()) {
				dispatch({
					type: 'GENERATE_FAILURE',
					payload: String(response.error.message),
				})
				toast.error('获取二维码失败', { id: 'bilibili-qrcode-login-error' })
				setTimeout(() => setVisible(false), 2000)
			} else {
				dispatch({ type: 'GENERATE_SUCCESS', payload: response.value })
			}
		}
		void generateQrCode()
	}, [status, setVisible])

	useEffect(() => {
		if (status !== 'polling' || !qrcodeKey) return

		const interval = setInterval(async () => {
			const response = await bilibiliApi.pollQrCodeLoginStatus(qrcodeKey)
			if (response.isErr()) {
				toast.error('获取二维码登录状态失败', {
					id: 'bilibili-qrcode-login-status-error',
				})
				return
			}

			const pollData = response.value
			if (
				pollData.status ===
				BilibiliQrCodeLoginStatus.QRCODE_LOGIN_STATUS_SUCCESS
			) {
				clearInterval(interval) // 成功后立刻停止轮询
				dispatch({ type: 'LOGIN_SUCCESS' })

				const splitedCookie = setCookieParser.splitCookiesString(
					pollData.cookies,
				)
				const parsedCookie = setCookieParser.parse(splitedCookie)
				const finalCookie = parsedCookie.map((c) => ({
					key: c.name,
					value: c.value,
				}))
				const result = setCookie(finalCookie)
				if (result.isErr()) {
					toast.error('保存 cookie 失败：' + result.error.message)
					Sentry.captureException(result.error, {
						tags: { Component: 'QrCodeLoginModal' },
					})
					return
				}
				toast.success('登录成功', { id: 'bilibili-qrcode-login-success' })
				await queryClient.refetchQueries({ queryKey: ['bilibili'] })
				setTimeout(() => setVisible(false), 1000)
			} else {
				dispatch({ type: 'POLL_UPDATE', payload: { code: pollData.status } })
			}
		}, 2000)

		return () => clearInterval(interval)
	}, [status, qrcodeKey, setCookie, queryClient, setVisible])

	useEffect(() => {
		if (!visible) {
			dispatch({ type: 'RESET' })
		}
	}, [visible])

	const renderDialogContent = () => {
		if (status === 'prompting') {
			return (
				<>
					<Text style={{ textAlign: 'center', padding: 16 }}>{statusText}</Text>
					<Button
						mode='contained'
						onPress={() => dispatch({ type: 'START_LOGIN' })}
					>
						开始
					</Button>
				</>
			)
		}

		if (status === 'generating' || status === 'error' || status === 'expired') {
			return (
				<Text style={{ textAlign: 'center', padding: 16 }}>{statusText}</Text>
			)
		}

		return (
			<>
				<Text style={{ textAlign: 'center', padding: 16 }}>
					{statusText}
					{'\n'}（点击二维码可直接跳转登录）
				</Text>
				<Pressable onPress={() => WebBrowser.openBrowserAsync(qrcodeUrl)}>
					<QRCode
						value={qrcodeUrl}
						size={200}
					/>
				</Pressable>
			</>
		)
	}

	return (
		<Portal>
			<Dialog
				visible={visible}
				onDismiss={() => setVisible(false)}
			>
				<Dialog.Title>扫码登录</Dialog.Title>
				<Dialog.Content
					style={{ justifyContent: 'center', alignItems: 'center' }}
				>
					{renderDialogContent()}
				</Dialog.Content>
			</Dialog>
		</Portal>
	)
})

QrCodeLoginModal.displayName = 'QrCodeLoginModal'

export default QrCodeLoginModal
