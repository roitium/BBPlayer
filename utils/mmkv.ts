import type { TypedMMKVInterface } from '@/types/storage'
import { MMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware/persist'

const mmkv = new MMKV()

export const storage = mmkv as unknown as TypedMMKVInterface

export const zustandStorage: StateStorage = {
	setItem: (name, value) => {
		// @ts-expect-error -- 管不了 zustand 的类型定义
		return storage.set(name, value)
	},
	getItem: (name) => {
		// @ts-expect-error -- 管不了 zustand 的类型定义
		const value = storage.getString(name)
		return value ?? null
	},
	removeItem: (name) => {
		// @ts-expect-error -- 管不了 zustand 的类型定义
		return storage.delete(name)
	},
}
