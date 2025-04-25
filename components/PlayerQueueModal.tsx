import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet' // Import BottomSheetFlatList
import { memo, type RefObject, useCallback } from 'react'
import { View } from 'react-native'
import {
  IconButton,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper'
import { usePlayerStore } from '@/lib/store/usePlayerStore'
import type { Track } from '@/types/core/media'

const TrackItem = memo(
  ({
    track,
    onSwitchTrack,
    onRemoveTrack,
    isCurrentTrack,
  }: {
    track: Track
    onSwitchTrack: (track: Track) => void
    onRemoveTrack: (track: Track) => void
    isCurrentTrack: boolean
  }) => {
    const colors = useTheme().colors
    return (
      <TouchableRipple onPress={() => onSwitchTrack(track)}>
        <Surface
          className='overflow-hidden rounded-lg'
          style={{
            backgroundColor: isCurrentTrack
              ? colors.elevation.level5
              : undefined,
          }}
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
  const shuffleMode = usePlayerStore((state) => state.shuffleMode)
  const queue = usePlayerStore((state) => state.queue)
  const removeTrack = usePlayerStore((state) => state.removeTrack)
  const currentTrack = usePlayerStore((state) => state.currentTrack)
  const shuffledQueue = usePlayerStore((state) => state.shuffledQueue)
  const skipToTrack = usePlayerStore((state) => state.skipToTrack)
  const theme = useTheme()

  const switchTrackHandler = useCallback(
    (track: Track) => {
      const index = shuffleMode
        ? shuffledQueue.findIndex(
            (t) => t.id === track.id && t.cid === track.cid,
          )
        : queue.findIndex((t) => t.id === track.id && t.cid === track.cid)
      if (index === -1) return
      skipToTrack(index)
    },
    [skipToTrack, queue, shuffledQueue, shuffleMode],
  )

  const removeTrackHandler = useCallback(
    async (track: Track) => {
      await removeTrack(track.id, track.cid)
    },
    [removeTrack],
  )

  const keyExtractor = useCallback(
    (item: Track) => `${item.id}-${item.cid}`,
    [],
  )

  const renderItem = useCallback(
    ({ item }: { item: Track }) => (
      <TrackItem
        track={item}
        onSwitchTrack={switchTrackHandler}
        onRemoveTrack={removeTrackHandler}
        isCurrentTrack={
          item.isMultiPage
            ? item.cid === currentTrack?.cid
            : item.id === currentTrack?.id
        }
      />
    ),
    [switchTrackHandler, removeTrackHandler, currentTrack],
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
        data={shuffleMode ? shuffledQueue : queue}
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
