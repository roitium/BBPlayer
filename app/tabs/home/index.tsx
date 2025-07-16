import QrCodeLoginModal from '@/components/modals/QRCodeLoginModal'
import { usePersonalInformation } from '@/hooks/queries/bilibili/useUserData'
import useAppStore from '@/hooks/stores/useAppStore'
import { BilibiliApiError } from '@/lib/api/bilibili/bilibili.errors'
import toast from '@/utils/toast'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Text, useTheme } from 'react-native-paper'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FavoriteList from './components/FavoriteList'
import RecentlyPlayed from './components/RecentlyPlayed'

function HomePage() {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const bilibiliCookie = useAppStore((state) => state.bilibiliCookieString)
	const [loginDialogVisible, setLoginDialogVisible] = useState(false)
	const clearBilibiliCookie = useAppStore((state) => state.clearBilibiliCookie)

	const {
		data: personalInfo,
		isPending: personalInfoPending,
		isError: personalInfoError,
		error: personalInfoErrorObject,
	} = usePersonalInformation()

	const getGreetingMsg = () => {
		const hour = new Date().getHours()
		if (hour >= 0 && hour < 6) return '凌晨好'
		if (hour >= 6 && hour < 12) return '早上好'
		if (hour >= 12 && hour < 18) return '下午好'
		if (hour >= 18 && hour < 24) return '晚上好'
		return '你好'
	}

	const greeting = getGreetingMsg()

	useEffect(() => {
		if (!bilibiliCookie) {
			toast.info('看起来你是第一次打开 BBPlayer，先登录一下吧！')
			setLoginDialogVisible(true)
		}
		if (personalInfoErrorObject instanceof BilibiliApiError) {
			if (personalInfoErrorObject.msgCode === -101) {
				toast.error('登录状态失效，已清空 cookie，请重新登录')
				clearBilibiliCookie()
				setLoginDialogVisible(true)
			}
		}
	}, [bilibiliCookie, clearBilibiliCookie, personalInfoErrorObject])

	return (
		<View style={{ flex: 1, backgroundColor: colors.background }}>
			<View style={{ flex: 1 }}>
				{/*顶部欢迎区域*/}
				<View
					style={{
						paddingHorizontal: 16,
						paddingTop: insets.top + 8,
						paddingBottom: 8,
					}}
				>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							justifyContent: 'space-between',
						}}
					>
						<View>
							<Text
								variant='headlineSmall'
								style={{ fontWeight: 'bold' }}
							>
								BBPlayer
							</Text>
							<Text
								variant='bodyMedium'
								style={{ color: colors.onSurfaceVariant }}
							>
								{greeting}，
								{personalInfoPending || personalInfoError || !personalInfo
									? '陌生人'
									: personalInfo.name}
							</Text>
						</View>
						<View>
							<Image
								style={{ width: 40, height: 40, borderRadius: 20 }}
								source={
									!personalInfoPending &&
									!personalInfoError &&
									personalInfo?.face
										? { uri: personalInfo.face }
										: // eslint-disable-next-line @typescript-eslint/no-require-imports
											require('@/assets/images/bilibili-default-avatar.jpg')
								}
							/>
						</View>
					</View>
				</View>

				<View style={{ marginTop: 16, marginBottom: 24 }}>
					<FavoriteList />
				</View>
				{/* Recently Played */}
				<View style={{ marginBottom: 24, paddingHorizontal: 16 }}>
					<RecentlyPlayed />
				</View>
			</View>

			<QrCodeLoginModal
				visible={loginDialogVisible}
				setVisible={setLoginDialogVisible}
			/>
		</View>
	)
}

export default HomePage
