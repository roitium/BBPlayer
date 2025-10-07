import { diffSets } from './set'

describe('set utils', () => {
  describe('diffSets', () => {
    it('should identify added elements when target has more', () => {
      const source = new Set([1, 2])
      const target = new Set([1, 2, 3])
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set([3]))
      expect(removed).toEqual(new Set())
    })

    it('should identify removed elements when target has less', () => {
      const source = new Set([1, 2, 3])
      const target = new Set([1, 2])
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set())
      expect(removed).toEqual(new Set([3]))
    })

    it('should identify both added and removed elements', () => {
      const source = new Set([1, 2])
      const target = new Set([1, 3])
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set([3]))
      expect(removed).toEqual(new Set([2]))
    })

    it('should handle identical sets', () => {
      const source = new Set([1, 2, 3])
      const target = new Set([1, 2, 3])
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set())
      expect(removed).toEqual(new Set())
    })

    it('should handle empty sets', () => {
      const source = new Set()
      const target = new Set()
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set())
      expect(removed).toEqual(new Set())
    })

    it('should handle source being empty', () => {
      const source = new Set()
      const target = new Set([1, 2])
      const { added, removed } = diffSets(source, target)
      expect(added).toEqual(new Set([1, 2]))
      expect(removed).toEqual(new Set())
    })

    it('should handle target being empty', () => {
        const source = new Set([1, 2])
        const target = new Set()
        const { added, removed } = diffSets(source, target)
        expect(added).toEqual(new Set())
        expect(removed).toEqual(new Set([1, 2]))
      })
  })
})