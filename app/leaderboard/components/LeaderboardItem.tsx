import type { Track } from '@/types/core/media'
import { formatDurationToHHMMSS } from '@/utils/time'
import { Image } from 'expo-image'
import { memo } from 'react'
import { View } from 'react-native'
import { Surface, Text, useTheme } from 'react-native-paper'

interface LeaderboardItemProps {
	item: {
		track: Track
		playCount: number
	}
	index: number
}

export const LeaderboardListItem = memo(function LeaderboardListItem({
	item,
	index,
}: LeaderboardItemProps) {
	const { colors } = useTheme()

	return (
		<Surface
			style={{
				borderRadius: 8,
				backgroundColor: 'transparent',
				marginVertical: 4,
				marginHorizontal: 8,
			}}
			elevation={0}
		>
			<View
				style={{
					flexDirection: 'row',
					alignItems: 'center',
					paddingHorizontal: 8,
					paddingVertical: 6,
				}}
			>
				<View
					style={{
						width: 28,
						marginRight: 8,
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					<Text
						variant='bodyMedium'
						style={{ color: colors.onSurfaceVariant }}
					>
						{index + 1}
					</Text>
				</View>

				<Image
					source={{
						uri: item.track.coverUrl ?? undefined,
					}}
					style={{ width: 45, height: 45, borderRadius: 4 }}
				/>

				<View style={{ marginLeft: 12, flex: 1, marginRight: 4 }}>
					<Text variant='bodySmall'>{item.track.title}</Text>
					<View
						style={{
							flexDirection: 'row',
							alignItems: 'center',
							marginTop: 2,
						}}
					>
						{item.track.artist && (
							<>
								<Text
									variant='bodySmall'
									numberOfLines={1}
									style={{ color: colors.onSurfaceVariant }}
								>
									{item.track.artist.name ?? '未知'}
								</Text>
								<Text
									style={{
										marginHorizontal: 4,
										color: colors.onSurfaceVariant,
									}}
									variant='bodySmall'
								>
									•
								</Text>
							</>
						)}
						<Text
							variant='bodySmall'
							style={{ color: colors.onSurfaceVariant }}
						>
							{formatDurationToHHMMSS(item.track.duration)}
						</Text>
					</View>
				</View>

				<View style={{ alignItems: 'flex-end' }}>
					<Text
						variant='bodyMedium'
						style={{ color: colors.primary, fontWeight: 'bold' }}
					>
						{item.playCount}
					</Text>
					<Text
						variant='bodySmall'
						style={{ color: colors.onSurfaceVariant }}
					>
						次播放
					</Text>
				</View>
			</View>
		</Surface>
	)
})
