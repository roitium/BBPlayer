/* eslint-disable @typescript-eslint/no-empty-object-type */
/* eslint-disable @typescript-eslint/no-namespace */
import type { RootStackParamList } from './navigation'

export {}

declare global {
	var playerIsReady: boolean
	namespace ReactNavigation {
		interface RootParamList extends RootStackParamList {}
	}
}
