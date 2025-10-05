export interface AppStorageSchema {
	first_open: boolean
	ignore_alert_replace_playlist: boolean
	skip_version: string
	enable_sentry_report: boolean
	enable_debug_log: boolean
	send_play_history: boolean
	bilibili_cookie: string
	'download-manager-storage-v2': string
	'player-storage-full': string
	wbi_keys: string
}

export type StorageKey = keyof AppStorageSchema

type KeysForType<Schema, T> = {
	[K in keyof Schema]: Schema[K] extends T ? K : never
}[keyof Schema]

type BooleanKeys<Schema> = KeysForType<Schema, boolean>
type StringKeys<Schema> = KeysForType<Schema, string>
type NumberKeys<Schema> = KeysForType<Schema, number>
type BufferKeys<Schema> = KeysForType<Schema, ArrayBuffer | ArrayBufferLike>

/**
 * Represents a single MMKV instance.
 */
export interface TypedNativeMMKV<Schema> {
	/**
	 * Set a value for the given `key`.
	 *
	 * @throws an Error if the value cannot be set.
	 */
	set: <K extends keyof Schema>(key: K, value: Schema[K]) => void
	/**
	 * Get the boolean value for the given `key`, or `undefined` if it does not exist.
	 *
	 * @default undefined
	 */
	getBoolean: (key: BooleanKeys<Schema>) => boolean | undefined
	/**
	 * Get the string value for the given `key`, or `undefined` if it does not exist.
	 *
	 * @default undefined
	 */
	getString: (key: StringKeys<Schema>) => string | undefined
	/**
	 * Get the number value for the given `key`, or `undefined` if it does not exist.
	 *
	 * @default undefined
	 */
	getNumber: (key: NumberKeys<Schema>) => number | undefined
	/**
	 * Get a raw buffer of unsigned 8-bit (0-255) data.
	 *
	 * @default undefined
	 */
	getBuffer: (key: BufferKeys<Schema>) => ArrayBufferLike | undefined
	/**
	 * Checks whether the given `key` is being stored in this MMKV instance.
	 */
	contains: (key: StorageKey) => boolean
	/**
	 * Delete the given `key`.
	 */
	delete: (key: StorageKey) => void
	/**
	 * Get all keys.
	 *
	 * @default []
	 */
	getAllKeys: () => string[]
	/**
	 * Delete all keys.
	 */
	clearAll: () => void
	/**
	 * Sets (or updates) the encryption-key to encrypt all data in this MMKV instance with.
	 *
	 * To remove encryption, pass `undefined` as a key.
	 *
	 * Encryption keys can have a maximum length of 16 bytes.
	 *
	 * @throws an Error if the instance cannot be recrypted.
	 */
	recrypt: (key: string | undefined) => void
	/**
	 * Trims the storage space and clears memory cache.
	 *
	 * Since MMKV does not resize itself after deleting keys, you can call `trim()`
	 * after deleting a bunch of keys to manually trim the memory- and
	 * disk-file to reduce storage and memory usage.
	 *
	 * In most applications, this is not needed at all.
	 */
	trim(): void
	/**
	 * Get the current total size of the storage, in bytes.
	 */
	readonly size: number
	/**
	 * Returns whether this instance is in read-only mode or not.
	 * If this is `true`, you can only use "get"-functions.
	 */
	readonly isReadOnly: boolean
}

export interface Listener {
	remove: () => void
}

export interface TypedMMKVInterface extends TypedNativeMMKV<AppStorageSchema> {
	/**
	 * Adds a value changed listener. The Listener will be called whenever any value
	 * in this storage instance changes (set or delete).
	 *
	 * To unsubscribe from value changes, call `remove()` on the Listener.
	 */
	addOnValueChangedListener: (
		onValueChanged: (key: StorageKey) => void,
	) => Listener
}
