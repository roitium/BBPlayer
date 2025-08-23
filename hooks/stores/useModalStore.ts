import navigationRef from '@/app/navigationRef'
import type { ModalInstance, ModalKey, ModalPropsMap } from '@/types/navigation'
import toast from '@/utils/toast'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface ModalState {
	modals: ModalInstance[]
	open: <K extends ModalKey>(
		key: K,
		props: ModalPropsMap[K],
		options?: ModalInstance['options'],
	) => void
	close: (key: ModalKey) => void
	closeAll: () => void
	closeTop: () => void
}

export const useModalStore = create<ModalState>()(
	immer((set, get) => ({
		modals: [],
		open: (key, props, options) => {
			const exists = get().modals.some((m) => m.key === key)

			if (exists) {
				toast.error(`已经打开 ${key} 了`)
				return
			}

			set((state) => ({
				modals: [...state.modals, { key, props, options }],
			}))

			if (navigationRef.current) {
				navigationRef.current.navigate('ModalHost')
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
	})),
)

export const openModal = useModalStore.getState().open
