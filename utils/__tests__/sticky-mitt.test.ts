jest.mock('../log')

import createStickyEmitter from '../sticky-mitt'

interface Events {
	[key: string]: unknown
	foo: string
	bar: number
}

describe('createStickyEmitter', () => {
	it('应该可以处理基本的事件发射和监听', () => {
		const emitter = createStickyEmitter<Events>()
		const handler = jest.fn()

		emitter.on('foo', handler)
		emitter.emit('foo', 'test')

		expect(handler).toHaveBeenCalledWith('test')
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('应该在监听器执行前立即调用一次 sticky 值', () => {
		const emitter = createStickyEmitter<Events>()
		const handler = jest.fn()

		emitter.emitSticky('foo', 'sticky-test')
		emitter.on('foo', handler)

		expect(handler).toHaveBeenCalledWith('sticky-test')
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('应该在后续 emitSticky 调用时更新 sticky 值', () => {
		const emitter = createStickyEmitter<Events>()
		const handler1 = jest.fn()
		const handler2 = jest.fn()

		emitter.emitSticky('foo', 'first')
		emitter.on('foo', handler1)

		expect(handler1).toHaveBeenCalledWith('first')
		expect(handler1).toHaveBeenCalledTimes(1)

		emitter.emitSticky('foo', 'second')
		expect(handler1).toHaveBeenCalledWith('second')
		expect(handler1).toHaveBeenCalledTimes(2)

		emitter.on('foo', handler2)
		expect(handler2).toHaveBeenCalledWith('second')
		expect(handler2).toHaveBeenCalledTimes(1)
	})

	it('应该能清除特定的 sticky 事件', () => {
		const emitter = createStickyEmitter<Events>()
		const handler = jest.fn()

		emitter.emitSticky('foo', 'sticky-test')
		emitter.clearSticky('foo')
		emitter.on('foo', handler)

		expect(handler).not.toHaveBeenCalled()
	})

	it('应该能清除所有 sticky 事件', () => {
		const emitter = createStickyEmitter<Events>()
		const fooHandler = jest.fn()
		const barHandler = jest.fn()

		emitter.emitSticky('foo', 'sticky-foo')
		emitter.emitSticky('bar', 123)
		emitter.clearAllSticky()

		emitter.on('foo', fooHandler)
		emitter.on('bar', barHandler)

		expect(fooHandler).not.toHaveBeenCalled()
		expect(barHandler).not.toHaveBeenCalled()
	})
})
