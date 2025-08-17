import UpdateAppModal from '@/components/modals/UpdateAppModal'
import { checkForAppUpdate, type ReleaseInfo } from '@/lib/services/update'
import { storage } from '@/utils/mmkv'
import { useEffect, useState } from 'react'

export default function UpdateGate() {
	const [visible, setVisible] = useState(false)
	const [release, setRelease] = useState<ReleaseInfo | null>(null)

	useEffect(() => {
		let canceled = false
		const run = async () => {
			const skipped = storage.getString('skip_version') ?? ''
			const result = await checkForAppUpdate()
			if (canceled) return
			if (result.isErr()) return
			const { update } = result.value
			if (!update) return
			if (!update.forced && skipped && skipped === update.version) return
			setRelease(update)
			setVisible(true)
		}
		void run()
		return () => {
			canceled = true
		}
	}, [])

	if (!release) return null
	return (
		<UpdateAppModal
			visible={visible}
			setVisible={setVisible}
			version={release.version}
			notes={release.notes}
			url={release.url}
			forced={release.forced}
		/>
	)
}
