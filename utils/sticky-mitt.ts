import mitt, { type Emitter, type Handler } from 'mitt'
import log from './log'

const logger = log.extend('Utils.StickyMitt')

/**
 * 当一个新的监听器被添加时，如果对应事件存在粘性事件，会立即用该值触发一次监听器。
 *
 * @returns 一个支持粘性事件的 Emitter 实例。
 */
function createStickyEmitter<Events extends Record<string, unknown>>() {
	const emitter: Emitter<Events> = mitt<Events>()

	const stickyEvents = new Map<keyof Events, Events[keyof Events]>()

	return {
		/**
		 * 发射一个粘性事件。
		 * 这个事件的值会被存储起来，供未来的监听者使用。
		 */
		emitSticky<Key extends keyof Events>(
			type: Key,
			payload: Events[Key],
		): void {
			stickyEvents.set(type, payload)
			emitter.emit(type, payload)
		},

		/**
		 * 注册一个事件监听器。
		 * 如果这是一个粘性事件且之前已经发射过，会立即用最后一次的值触发 handler。
		 */
		on<Key extends keyof Events>(
			type: Key,
			handler: Handler<Events[Key]>,
		): void {
			emitter.on(type, handler)
			if (stickyEvents.has(type)) {
				try {
					handler(stickyEvents.get(type) as Events[Key])
				} catch (err) {
					logger.error('Sticky Event Handler 处理器出错', {
						type,
						error: err,
					})
				}
			}
		},

		/**
		 * 清除某个事件类型的粘性状态。
		 */
		clearSticky<Key extends keyof Events>(type: Key): void {
			stickyEvents.delete(type)
		},

		/**
		 * 清除所有事件的粘性状态。
		 */
		clearAllSticky(): void {
			stickyEvents.clear()
		},

		/**
		 * 普通的 emit 方法
		 */
		emit<Key extends keyof Events>(type: Key, payload: Events[Key]): void {
			emitter.emit(type, payload)
		},

		/**
		 * 注销事件监听器
		 */
		off<Key extends keyof Events>(
			type: Key,
			handler: Handler<Events[Key]>,
		): void {
			emitter.off(type, handler)
		},

		/**
		 * 获取所有事件监听器的 Map。
		 * 使用 getter 属性来代理，这是一种更优雅且不会引发 `this` 问题的方式。
		 */
		get all() {
			return emitter.all
		},
	}
}

export default createStickyEmitter
