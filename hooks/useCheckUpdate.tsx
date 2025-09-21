import { useModalStore } from '@/hooks/stores/useModalStore'
import { checkForAppUpdate } from '@/lib/services/updateService'
import { storage } from '@/utils/mmkv'
import { useEffect } from 'react'

export default function useCheckUpdate() {
	const open = useModalStore((state) => state.open)

	useEffect(() => {
		if (__DEV__) {
			return
		}
		let canceled = false
		const run = async () => {
			const skipped = storage.getString('skip_version') ?? ''
			const result = await checkForAppUpdate()
			if (canceled) return
			if (result.isErr()) return
			const { update } = result.value
			if (!update) return
			if (!update.forced && skipped && skipped === update.version) return
			open('UpdateApp', update)
		}
		void run()
		return () => {
			canceled = true
		}
	}, [open])
}
