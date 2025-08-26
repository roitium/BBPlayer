import type { ModalKey, ModalPropsMap } from '@/types/navigation'
import AddToFavoriteListsModal from './modals/AddVideoToBilibiliFavModal'
import AlertModal from './modals/AlertModal'
import BatchAddTracksToLocalPlaylistModal from './modals/BatchAddTracksToLocalPlaylist'
import CookieLoginModal from './modals/CookieLoginModal'
import CreatePlaylistModal from './modals/CreatePlaylistModal'
import DuplicateLocalPlaylistModal from './modals/DuplicateLocalPlaylistModal'
import EditPlaylistMetadataModal from './modals/edit-metadata/editPlaylistMetadataModal'
import EditTrackMetadataModal from './modals/edit-metadata/editTrackMetadataModal'
import ManualSearchLyricsModal from './modals/ManualSearchLyrics'
import QrCodeLoginModal from './modals/QRCodeLoginModal'
import UpdateAppModal from './modals/UpdateAppModal'
import UpdateTrackLocalPlaylistsModal from './modals/UpdateTrackLocalPlaylistsModal'
import WelcomeModal from './modals/WelcomeModal'

type ModalComponent<K extends ModalKey> = React.ComponentType<
	ModalPropsMap[K] & {}
>

export const modalRegistry: { [K in ModalKey]: ModalComponent<K> } = {
	AddVideoToBilibiliFavorite: AddToFavoriteListsModal,
	EditPlaylistMetadata: EditPlaylistMetadataModal,
	EditTrackMetadata: EditTrackMetadataModal,
	BatchAddTracksToLocalPlaylist: BatchAddTracksToLocalPlaylistModal,
	CookieLogin: CookieLoginModal,
	QRCodeLogin: QrCodeLoginModal,
	CreatePlaylist: CreatePlaylistModal,
	UpdateApp: UpdateAppModal,
	Welcome: WelcomeModal,
	UpdateTrackLocalPlaylists: UpdateTrackLocalPlaylistsModal,
	DuplicateLocalPlaylist: DuplicateLocalPlaylistModal,
	ManualSearchLyrics: ManualSearchLyricsModal,
	Alert: AlertModal,
}
