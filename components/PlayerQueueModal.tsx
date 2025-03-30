import { useCallback, useMemo, type RefObject } from 'react'
import { View } from 'react-native'
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'
import {
  Surface,
  TouchableRipple,
  Text,
  useTheme,
  IconButton,
} from 'react-native-paper'
import { showToast } from '@/utils/toast'

function PlayerQueueModal({ sheetRef }: { sheetRef: RefObject<BottomSheet> }) {
  const queue = usePlayerStore((state) => state.queue)
  const skipToTrack = usePlayerStore((state) => state.skipToTrack)
  const snapPoints = useMemo(() => ['75%'], [])
  const colors = useTheme()

  const switchTrack = useCallback(
    (track: Track) => {
      const index = queue.indexOf(track)
      if (index === -1) return
      skipToTrack(index)
    },
    [skipToTrack, queue],
  )

  const TrackItem = useCallback(
    ({ track }: { track: Track }) => (
      <TouchableRipple
        key={track.id}
        onPress={() => switchTrack(track)}
      >
        <Surface
          className='overflow-hidden rounded-lg'
          elevation={0}
        >
          <View className='flex-row items-center justify-between p-2'>
            <View
              className='ml-3 flex-col'
              style={{ paddingRight: 0, flex: 1 }}
            >
              <Text
                variant='bodyMedium'
                numberOfLines={1}
                style={{ fontWeight: 'bold' }}
              >
                {track.title || track.id}
              </Text>
              <Text
                variant='bodySmall'
                style={{ fontWeight: 'thin' }}
                numberOfLines={1}
              >
                {track.artist || '待加载...'}
              </Text>
            </View>
            <IconButton
              icon='close-circle-outline'
              size={24}
              onPress={() =>
                showToast({
                  message: '你就当删除成功',
                  title: '正在开发',
                  type: 'info',
                })
              }
            />
          </View>
        </Surface>
      </TouchableRipple>
    ),
    [switchTrack],
  )
  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      backgroundStyle={{
        backgroundColor: colors.colors.elevation.level1,
      }}
      handleStyle={{
        borderBottomWidth: 1,
        borderBottomColor: colors.colors.elevation.level5,
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          backgroundColor: colors.colors.elevation.level1,
        }}
      >
        {queue.map((track) => (
          <TrackItem
            track={track}
            key={track.id}
          />
        ))}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

export default PlayerQueueModal
