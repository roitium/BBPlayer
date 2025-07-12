import { favoriteListQueryKeys } from '@/hooks/queries/bilibili/useFavoriteData'
import { userQueryKeys } from '@/hooks/queries/bilibili/useUserData'
import useAppStore from '@/hooks/stores/useAppStore'
import toast from '@/utils/toast'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useState } from 'react'
import {
	Button,
	Dialog,
	Divider,
	Portal,
	Text,
	TextInput,
} from 'react-native-paper'

function SetCookieDialog({
	visible,
	setVisible,
}: {
	visible: boolean
	setVisible: (visible: boolean) => void
}) {
	const queryClient = useQueryClient()
	const cookie = useAppStore((state) => state.bilibiliCookieString)
	const [inputCookie, setInputCookie] = useState(cookie)
	const setBilibiliCookie = useAppStore(
		(state) => state.setBilibiliCookieString,
	)
	const handleConfirm = () => {
		if (inputCookie === cookie) {
			setVisible(false)
			return
		}
		if (!inputCookie) {
			toast.error('Cookie 不能为空')
			return
		}
		setBilibiliCookie(inputCookie)
		setVisible(false)
		// 刷新所有 b 站个人和收藏夹相关请求
		queryClient.refetchQueries({ queryKey: favoriteListQueryKeys.all })
		queryClient.refetchQueries({ queryKey: userQueryKeys.all })
	}

	return (
		<Portal>
			<Dialog
				visible={visible}
				onDismiss={() => setVisible(false)}
			>
				<Dialog.Title>设置 Bilibili Cookie</Dialog.Title>
				<Dialog.Content>
					<TextInput
						label='Cookie'
						value={inputCookie}
						onChangeText={setInputCookie}
						mode='outlined'
						numberOfLines={5}
						multiline
						style={{ maxHeight: 200 }}
						textAlignVertical='top'
					/>
					<Text
						variant='bodySmall'
						style={{ marginTop: 8 }}
					>
						请在此处粘贴您的 Bilibili Cookie 以获取个人数据。
					</Text>
					<Divider style={{ marginTop: 16, marginBottom: 16 }} />
				</Dialog.Content>
				<Dialog.Actions>
					<Button onPress={() => setVisible(false)}>取消</Button>
					<Button onPress={handleConfirm}>确定</Button>
				</Dialog.Actions>
			</Dialog>
		</Portal>
	)
}

const CookieLoginModal = memo(SetCookieDialog)

CookieLoginModal.displayName = 'CookieLoginModal'

export default CookieLoginModal
