import { jest } from '@jest/globals'
import type {
  BilibiliCollectionAllContents,
  BilibiliFavoriteListAllContents,
  BilibiliFavoriteListContents,
  BilibiliVideoDetails,
} from '@/types/apis/bilibili'
import { okAsync } from 'neverthrow'

export const bilibiliApi = {
  getCollectionAllContents: jest.fn(() =>
    okAsync({} as BilibiliCollectionAllContents),
  ),
  getVideoDetails: jest.fn(() => okAsync({} as BilibiliVideoDetails)),
  getFavoriteListContents: jest.fn(() =>
    okAsync({} as BilibiliFavoriteListContents),
  ),
  getFavoriteListAllContents: jest.fn(() =>
    okAsync([] as BilibiliFavoriteListAllContents),
  ),
}