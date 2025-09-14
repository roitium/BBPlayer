import type { ModalKey, ModalPropsMap } from '@/types/navigation'
import AlertModal from './modals/AlertModal'
import UpdateAppModal from './modals/app/UpdateAppModal'
import WelcomeModal from './modals/app/WelcomeModal'
import AddToFavoriteListsModal from './modals/bilibili/AddVideoToBilibiliFavModal'
import EditPlaylistMetadataModal from './modals/edit-metadata/editPlaylistMetadataModal'
import EditTrackMetadataModal from './modals/edit-metadata/editTrackMetadataModal'
import CookieLoginModal from './modals/login/CookieLoginModal'
import QrCodeLoginModal from './modals/login/QRCodeLoginModal'
import EditLyricsModal from './modals/lyrics/EditLyrics'
import ManualSearchLyricsModal from './modals/lyrics/ManualSearchLyrics'
import BatchAddTracksToLocalPlaylistModal from './modals/playlist/BatchAddTracksToLocalPlaylist'
import CreatePlaylistModal from './modals/playlist/CreatePlaylistModal'
import DuplicateLocalPlaylistModal from './modals/playlist/DuplicateLocalPlaylistModal'
import UpdateTrackLocalPlaylistsModal from './modals/playlist/UpdateTrackLocalPlaylistsModal'

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
	EditLyrics: EditLyricsModal,
}
