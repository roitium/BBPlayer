import navigationRef from '@/app/navigationRef'
import type { ModalInstance, ModalKey, ModalPropsMap } from '@/types/navigation'
import toast from '@/utils/toast'
import type { Emitter } from 'mitt'
import mitt from 'mitt'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface ModalState {
	modals: ModalInstance[]
	eventEmitter: Emitter<{ modalHostDidClose: undefined }>

	open: <K extends ModalKey>(
		key: K,
		props: ModalPropsMap[K],
		options?: ModalInstance['options'],
	) => void
	/**
	 * 如果需要在 close 时进行跳转到其他页面的操作，**必须**将 navigation.navigate 调用放在 doAfterModalHostClosed 回调中执行
	 * @param key modal 的 key
	 * @returns
	 */
	close: (key: ModalKey) => void
	closeAll: () => void
	closeTop: () => void
	doAfterModalHostClosed: (callback: () => void) => void
}

export const useModalStore = create<ModalState>()(
	immer((set, get) => ({
		modals: [],
		eventEmitter: mitt<{ modalHostDidClose: undefined }>(),

		open: (key, props, options) => {
			const exists = get().modals.some((m) => m.key === key)

			if (exists) {
				toast.error(`已经打开 ${key} 了`)
				return
			}

			set((state) => ({
				modals: [...state.modals, { key, props, options }],
			}))

			if (navigationRef.current?.isReady()) {
				navigationRef.current.navigate('ModalHost')
			} else {
				toast.error('导航尚未准备好，无法打开模态框')
			}
		},

		// 所有对于 ModalHost 的关闭操作（goBack）都在 ModalHost 内完成
		// 我不懂为什么在这里调用 navigationRef.current.goBack() 没有效果
		close: (key) => {
			set((state) => ({ modals: state.modals.filter((m) => m.key !== key) }))
		},

		closeAll: () => {
			set({ modals: [] })
		},

		closeTop: () => {
			const topOne = get().modals[get().modals.length - 1]
			if (topOne) {
				get().close(topOne.key)
			}
		},

		doAfterModalHostClosed: (callback) => {
			const wrapper = () => {
				get().eventEmitter.off('modalHostDidClose', wrapper)
				callback()
			}
			get().eventEmitter.on('modalHostDidClose', wrapper)
		},
	})),
)

export const openModal = useModalStore.getState().open
