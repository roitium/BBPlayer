import { useModalStore } from '@/hooks/stores/useModalStore'
import { storage } from '@/utils/mmkv'
import notifee, { AuthorizationStatus } from '@notifee/react-native'
import { usePreventRemove } from '@react-navigation/native'
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { AppState, View } from 'react-native'
import { Button, Dialog, Text } from 'react-native-paper'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated'

const titles = ['欢迎使用 BBPlayer', '建议开启通知', '登录？']

export default function WelcomeModal() {
	const _close = useModalStore((s) => s.close)
	const close = useCallback(() => _close('Welcome'), [_close])
	const open = useModalStore((s) => s.open)

	const [step, setStep] = useState(0)
	const [haveNotificationPermission, setHaveNotificationPermission] =
		useState(false)

	const containerRef = useRef<View>(null)
	const [measuredWidth, setMeasuredWidth] = useState(0)
	const [stepHeights, setStepHeights] = useState<[number, number, number]>([
		0, 0, 0,
	])

	const translateX = useSharedValue(0)
	const containerHeight = useSharedValue(0)

	const animatedContainerStyle = useAnimatedStyle(() => ({
		height: containerHeight.value,
		overflow: 'hidden',
	}))

	const animatedRowStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}))

	useEffect(() => {
		// eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler
		if (measuredWidth <= 0) return
		translateX.set(withTiming(-step * measuredWidth, { duration: 300 }))
		containerHeight.set(withTiming(stepHeights[step], { duration: 300 }))
	}, [step, translateX, containerHeight, stepHeights, measuredWidth])

	useLayoutEffect(() => {
		containerRef.current?.measure((_x, _y, width) => {
			setMeasuredWidth(width)
		})
	}, [containerRef])

	useEffect(() => {
		const check = async () => {
			const settings = await notifee.getNotificationSettings()
			setHaveNotificationPermission(
				settings.authorizationStatus === AuthorizationStatus.AUTHORIZED,
			)
		}
		void check()
		const cancel = AppState.addEventListener('change', (state) => {
			if (state === 'active') {
				void check()
			}
		})
		return () => cancel.remove()
	}, [])

	const goToStep = (index: number) => {
		const idx = Math.max(0, Math.min(3 - 1, index))
		setStep(idx)
	}

	const confirmGuestMode = () => {
		storage.set('first_open', false)
		close()
	}
	const confirmLogin = () => {
		storage.set('first_open', false)
		open('QRCodeLogin', undefined)
		close()
	}
	const openNotificationSettings = async () => {
		try {
			await notifee.openNotificationSettings()
		} catch (err) {
			console.warn('无法打开应用设置：', err)
		}
	}

	const Step0 = () => (
		<View>
			<Text>
				看起来你是第一次打开 BBPlayer，容我介绍一下：BBPlayer
				是一款开源、简洁的音乐播放器，你可以使用他播放来自 BiliBili 的歌曲。
				{'\n\n'}
				风险声明：虽然开发者尽力负责任地调用 BiliBili API，但
				<Text style={{ fontWeight: '800' }}>仍不保证</Text>
				您的账号安全无虞，你可能会遇到包括但不限于：账号被风控、短期封禁乃至永久封禁等风险。请权衡利弊后再选择登录。（虽然我用了这么久还没遇到任何问题）
				{'\n\n'}
				如果您选择「游客模式」，本地播放列表、搜索、查看合集等大部分功能仍可使用，但无法访问并即时查看您自己收藏夹中的更新。
			</Text>
		</View>
	)

	const Step1 = () => (
		<View>
			<Text>
				{haveNotificationPermission
					? '看起来你已经打开通知权限了，点击下一步吧！'
					: 'BBPlayer 会使用通知显示下载进度，建议打开通知权限。当然，我们也尊重您的选择，不会强制要求。'}
			</Text>

			{haveNotificationPermission || (
				<View
					style={{
						flexDirection: 'row',
						gap: 8,
						paddingTop: 20,
						justifyContent: 'flex-end',
					}}
				>
					<Button
						mode='contained'
						onPress={openNotificationSettings}
					>
						打开通知设置
					</Button>
				</View>
			)}
		</View>
	)

	const Step2 = () => (
		<View>
			<Text>最后一步！选择登录还是游客模式？</Text>

			<View
				style={{
					flexDirection: 'row',
					gap: 8,
					paddingTop: 20,
					justifyContent: 'flex-end',
				}}
			>
				<Button
					mode='contained'
					onPress={confirmLogin}
				>
					登录
				</Button>
				<Button onPress={confirmGuestMode}>游客模式</Button>
			</View>
		</View>
	)

	usePreventRemove(true, () => goToStep(step - 1))

	return (
		<>
			<View
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					pointerEvents: 'none',
					opacity: 0,
				}}
				accessible={false}
			>
				<View
					style={{ width: measuredWidth }}
					collapsable={false}
					onLayout={(e) => {
						const height = e.nativeEvent.layout.height ?? 0
						if (height <= stepHeights[0]) {
							return
						}
						setStepHeights((s) => [height, s[1], s[2]])
					}}
				>
					<Step0 />
				</View>
				<View
					collapsable={false}
					style={{ width: measuredWidth }}
					onLayout={(e) => {
						const height = e.nativeEvent.layout.height ?? 0
						if (height <= stepHeights[1]) {
							return
						}
						setStepHeights((s) => [s[0], height, s[2]])
					}}
				>
					<Step1 />
				</View>
				<View
					collapsable={false}
					style={{ width: measuredWidth }}
					onLayout={(e) => {
						const height = e.nativeEvent.layout.height ?? 0
						if (height <= stepHeights[2]) {
							return
						}
						setStepHeights((s) => [s[0], s[1], height])
					}}
				>
					<Step2 />
				</View>
			</View>
			<Dialog.Title>{titles[step]}</Dialog.Title>

			<Dialog.Content>
				<Animated.View
					style={[animatedContainerStyle]}
					ref={containerRef}
				>
					<Animated.View
						style={[
							animatedRowStyle,
							{ flexDirection: 'row', width: measuredWidth * 3 },
						]}
					>
						<View style={{ width: measuredWidth }}>
							<Step0 />
						</View>
						<View style={{ width: measuredWidth }}>
							<Step1 />
						</View>
						<View style={{ width: measuredWidth }}>
							<Step2 />
						</View>
					</Animated.View>
				</Animated.View>
			</Dialog.Content>

			<Dialog.Actions>
				{step > 0 && <Button onPress={() => goToStep(step - 1)}>上一步</Button>}

				{step < 2 && <Button onPress={() => goToStep(step + 1)}>下一步</Button>}
			</Dialog.Actions>
		</>
	)
}
