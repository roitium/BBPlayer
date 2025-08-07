import React, { useEffect, useMemo } from 'react'
import { FlatList } from 'react-native'
import { Button, Checkbox, Dialog, List, Portal } from 'react-native-paper'

import {
	useGetAllPlaylists,
	usePlaylistsContainingTrack,
	useUpdateLocalPlaylistTracks,
} from '~/hooks/queries/db/usePlaylist'
import type { Track } from '~/types/core/media'

interface AddVideoToLocalPlaylistModalProps {
  track: Track
  visible: boolean
  setVisible: (visible: boolean) => void
}

const AddVideoToLocalPlaylistModal = ({
  track,
  visible,
  setVisible,
}: AddVideoToLocalPlaylistModalProps) => {
  const queryClient = useQueryClient()

  const { data: allPlaylists } = useGetAllPlaylists()
  const localPlaylists = useMemo(() => {
    if (!allPlaylists) return []
    return allPlaylists.filter(p => p.type === 'local')
  }, [allPlaylists])

  const { data: playlistsContainingTrack } = usePlaylistsContainingTrack(
    track.id,
  )

  const initialCheckedPlaylistIds = useMemo(() => {
    if (!playlistsContainingTrack) return []
    return playlistsContainingTrack.map(p => p.id)
  }, [playlistsContainingTrack])

  const { mutate, isPending } = useUpdateLocalPlaylistTracks(track)

  const [checkedPlaylistIds, setCheckedPlaylistIds] = React.useState<
    number[]
  >([])

  useEffect(() => {
    setCheckedPlaylistIds(initialCheckedPlaylistIds)
  }, [initialCheckedPlaylistIds])

  const handleCheckboxPress = (playlistId: number) => {
    if (checkedPlaylistIds.includes(playlistId)) {
      setCheckedPlaylistIds(
        checkedPlaylistIds.filter(id => id !== playlistId),
      )
    }
    else {
      setCheckedPlaylistIds([...checkedPlaylistIds, playlistId])
    }
  }

  const handleConfirm = () => {
    const toAddPlaylistIds = checkedPlaylistIds.filter(
      id => !initialCheckedPlaylistIds.includes(id),
    )
    const toRemovePlaylistIds = initialCheckedPlaylistIds.filter(
      id => !checkedPlaylistIds.includes(id),
    )
    mutate(
      {
        toAddPlaylistIds,
        toRemovePlaylistIds,
      },
      {
        onSuccess: () => {
          setVisible(false)
        },
      },
    )
  }

  const renderItem = React.useCallback(
    ({ item: playlist }) => (
      <Checkbox.Item
        key={playlist.id}
        label={playlist.title}
        status={
          checkedPlaylistIds.includes(playlist.id) ? 'checked' : 'unchecked'
        }
        onPress={() => handleCheckboxPress(playlist.id)}
      />
    ),
    [checkedPlaylistIds],
  )

  const keyExtractor = React.useCallback(item => item.id.toString(), [])

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={() => setVisible(false)}>
        <Dialog.Title>添加到本地歌单</Dialog.Title>
        <Dialog.Content>
          <FlatList
            data={localPlaylists}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            extraData={checkedPlaylistIds}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisible(false)}>
            取消
          </Button>
          <Button onPress={handleConfirm} loading={isPending}>
            确认
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

export default React.memo(AddVideoToLocalPlaylistModal)
