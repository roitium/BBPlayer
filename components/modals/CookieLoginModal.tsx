import { favoriteListQueryKeys } from '@/hooks/queries/bilibili/favorite'
import { userQueryKeys } from '@/hooks/queries/bilibili/user'
import useAppStore, { serializeCookieObject } from '@/hooks/stores/useAppStore'
import { toastAndLogError } from '@/utils/log'
import toast from '@/utils/toast'
import { useQueryClient } from '@tanstack/react-query'
import { memo, useEffect, useMemo, useState } from 'react'
import { Button, Dialog, Divider, Text, TextInput } from 'react-native-paper'
import { AnimatedModal } from '../AnimatedModal'

function SetCookieDialog({
	visible,
	setVisible,
}: {
	visible: boolean
	setVisible: (visible: boolean) => void
}) {
	const queryClient = useQueryClient()
	const cookieObjectFromStore = useAppStore((state) => state.bilibiliCookie)
	const setBilibiliCookie = useAppStore((state) => state.setBilibiliCookie)
	const clearBilibiliCookie = useAppStore((state) => state.clearBilibiliCookie)

	const displayCookieString = useMemo(() => {
		if (!cookieObjectFromStore) return ''
		return serializeCookieObject(cookieObjectFromStore)
	}, [cookieObjectFromStore])

	const [inputCookie, setInputCookie] = useState(displayCookieString)
	const [isLoading, setIsLoading] = useState(false)
	useEffect(() => {
		if (visible) {
			setInputCookie(displayCookieString)
		}
	}, [displayCookieString, visible])

	const handleConfirm = async () => {
		setIsLoading(true)
		try {
			if (!inputCookie?.trim()) {
				clearBilibiliCookie()
				await queryClient.cancelQueries()
				queryClient.clear()
				toast.success('Cookie 已清除')
				setVisible(false)
				return
			}

			if (inputCookie === displayCookieString) {
				setVisible(false)
				return
			}

			const result = setBilibiliCookie(inputCookie)
			if (result.isErr()) {
				toast.error(result.error.message)
				return
			}
			toast.success('Cookie 已更新')
			await queryClient.cancelQueries()
			await queryClient.invalidateQueries({
				queryKey: favoriteListQueryKeys.all,
			})
			await queryClient.invalidateQueries({ queryKey: userQueryKeys.all })
			setVisible(false)
		} catch (error) {
			toastAndLogError('操作失败', error, 'Components.CookieLoginModal')
		} finally {
			setIsLoading(false)
		}
	}

	const handleDismiss = () => {
		if (isLoading) return
		setVisible(false)
	}

	return (
		<AnimatedModal
			visible={visible}
			onDismiss={handleDismiss}
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
					请在此处粘贴您的 Bilibili Cookie 以使用完整 BBPlayer 功能。
				</Text>
				<Divider style={{ marginTop: 16, marginBottom: 16 }} />
			</Dialog.Content>
			<Dialog.Actions>
				<Button onPress={() => setVisible(false)}>取消</Button>
				<Button onPress={handleConfirm}>确定</Button>
			</Dialog.Actions>
		</AnimatedModal>
	)
}

const CookieLoginModal = memo(SetCookieDialog)

CookieLoginModal.displayName = 'CookieLoginModal'

export default CookieLoginModal
