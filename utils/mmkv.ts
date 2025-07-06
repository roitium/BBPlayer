import { MMKV } from 'react-native-mmkv'
import type { StateStorage } from 'zustand/middleware'

export const storage = new MMKV()

export const zustandStorage: StateStorage = {
	setItem: (name, value) => {
		return storage.set(name, value)
	},
	getItem: (name) => {
		const value = storage.getString(name)
		return value ?? null
	},
	removeItem: (name) => {
		return storage.delete(name)
	},
}
