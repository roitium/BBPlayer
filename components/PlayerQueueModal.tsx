import { memo, useCallback, type RefObject } from 'react'
import { View } from 'react-native'
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet' // Import BottomSheetFlatList
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

const TrackItem = memo(
  ({
    track,
    onSwitchTrack,
    onRemoveTrack,
  }: {
    track: Track
    onSwitchTrack: (track: Track) => void
    onRemoveTrack: (track: Track) => void
  }) => {
    return (
      <TouchableRipple onPress={() => onSwitchTrack(track)}>
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
              onPress={() => onRemoveTrack(track)}
            />
          </View>
        </Surface>
      </TouchableRipple>
    )
  },
)

function PlayerQueueModal({ sheetRef }: { sheetRef: RefObject<BottomSheet> }) {
  const queue = usePlayerStore((state) => state.queue)
  const skipToTrack = usePlayerStore((state) => state.skipToTrack)
  const theme = useTheme()

  const switchTrackHandler = useCallback(
    (track: Track) => {
      const index = queue.findIndex((t) => t.id === track.id)
      if (index === -1) return
      skipToTrack(index)
    },
    [skipToTrack, queue],
  )

  const removeTrackHandler = useCallback((track: Track) => {
    // TODO: 实现删除逻辑
    console.log('Attempting to remove track:', track.id)
    showToast({
      message: `你就当 ${track.title || track.id} 删除成功`,
      title: '正在开发',
      type: 'info',
    })
  }, [])

  const keyExtractor = useCallback((item: Track) => item.id, [])

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <TrackItem
        track={item}
        onSwitchTrack={switchTrackHandler}
        onRemoveTrack={removeTrackHandler}
      />
    ),
    [switchTrackHandler, removeTrackHandler],
  )

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      enableDynamicSizing={false}
      enablePanDownToClose={true}
      snapPoints={['75%']}
      backgroundStyle={{
        backgroundColor: theme.colors.elevation.level1,
      }}
      handleStyle={{
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.elevation.level5,
      }}
    >
      <BottomSheetFlatList
        data={queue}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{
          backgroundColor: theme.colors.elevation.level1,
        }}
      />
    </BottomSheet>
  )
}

export default PlayerQueueModal
