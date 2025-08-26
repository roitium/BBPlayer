import type { RootStackParamList } from '@/types/navigation'
import { createNavigationContainerRef } from '@react-navigation/native'

const navigationRef = createNavigationContainerRef<RootStackParamList>()

export default navigationRef
