import createStickyEmitter from './sticky-mitt'
import log from './log'

jest.mock('./log')

type Events = {
  foo: string
  bar: number
}

describe('createStickyEmitter', () => {
  beforeEach(() => {
    // @ts-expect-error - MOCK_LOG_ERROR is a custom property on the mock
    log.MOCK_LOG_ERROR.mockClear()
  })

  it('should handle basic event emitting and listening', () => {
    const emitter = createStickyEmitter<Events>()
    const handler = jest.fn()

    emitter.on('foo', handler)
    emitter.emit('foo', 'test')

    expect(handler).toHaveBeenCalledWith('test')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should call a new listener immediately with the sticky value', () => {
    const emitter = createStickyEmitter<Events>()
    const handler = jest.fn()

    emitter.emitSticky('foo', 'sticky-test')
    emitter.on('foo', handler)

    expect(handler).toHaveBeenCalledWith('sticky-test')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should update the sticky value on subsequent emitSticky calls', () => {
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

  it('should clear a specific sticky event', () => {
    const emitter = createStickyEmitter<Events>()
    const handler = jest.fn()

    emitter.emitSticky('foo', 'sticky-test')
    emitter.clearSticky('foo')
    emitter.on('foo', handler)

    expect(handler).not.toHaveBeenCalled()
  })

  it('should clear all sticky events', () => {
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

  it('should remove a listener with off()', () => {
    const emitter = createStickyEmitter<Events>()
    const handler = jest.fn()

    emitter.on('foo', handler)
    emitter.emit('foo', 'test1')
    emitter.off('foo', handler)
    emitter.emit('foo', 'test2')

    expect(handler).toHaveBeenCalledWith('test1')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('should return all listeners with the "all" getter', () => {
    const emitter = createStickyEmitter<Events>()
    const handler1 = () => {}
    const handler2 = () => {}

    emitter.on('foo', handler1)
    emitter.on('bar', handler2)

    const allListeners = emitter.all
    expect(allListeners.get('foo')).toEqual([handler1])
    expect(allListeners.get('bar')).toEqual([handler2])
  })

  it('should not call the handler for a non-sticky event if registered after emit', () => {
    const emitter = createStickyEmitter<Events>()
    const handler = jest.fn()

    emitter.emit('foo', 'test')
    emitter.on('foo', handler)

    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle multiple listeners for the same event', () => {
    const emitter = createStickyEmitter<Events>()
    const handler1 = jest.fn()
    const handler2 = jest.fn()

    emitter.on('foo', handler1)
    emitter.on('foo', handler2)
    emitter.emit('foo', 'multi-test')

    expect(handler1).toHaveBeenCalledWith('multi-test')
    expect(handler2).toHaveBeenCalledWith('multi-test')
  })

  it('should handle sticky events for multiple listeners', () => {
    const emitter = createStickyEmitter<Events>()
    const handler1 = jest.fn()
    const handler2 = jest.fn()

    emitter.emitSticky('foo', 'sticky-multi')
    emitter.on('foo', handler1)
    emitter.on('foo', handler2)

    expect(handler1).toHaveBeenCalledWith('sticky-multi')
    expect(handler2).toHaveBeenCalledWith('sticky-multi')
  })

  it('should not throw if a handler throws an error on sticky emit', () => {
    const emitter = createStickyEmitter<Events>()
    const erroringHandler = jest.fn().mockImplementation(() => {
      throw new Error('Test Error')
    })

    emitter.emitSticky('foo', 'sticky-error')

    expect(() => {
      emitter.on('foo', erroringHandler)
    }).not.toThrow()

    expect(erroringHandler).toHaveBeenCalledWith('sticky-error')
    // @ts-expect-error - MOCK_LOG_ERROR is a custom property on the mock
    expect(log.MOCK_LOG_ERROR).toHaveBeenCalledWith(
      'Sticky Event Handler 处理器出错',
      {
        type: 'foo',
        error: expect.any(Error),
      },
    )
  })
})