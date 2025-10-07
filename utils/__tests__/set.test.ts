import { diffSets } from '../set'

describe('set utils', () => {
	describe('diffSets', () => {
		it('应该识别新增元素', () => {
			const source = new Set([1, 2])
			const target = new Set([1, 2, 3])
			const { added, removed } = diffSets(source, target)
			expect(added).toEqual(new Set([3]))
			expect(removed).toEqual(new Set())
		})

		it('应该识别删除元素', () => {
			const source = new Set([1, 2, 3])
			const target = new Set([1, 2])
			const { added, removed } = diffSets(source, target)
			expect(added).toEqual(new Set())
			expect(removed).toEqual(new Set([3]))
		})

		it('应该识别新增和删除元素', () => {
			const source = new Set([1, 2])
			const target = new Set([1, 3])
			const { added, removed } = diffSets(source, target)
			expect(added).toEqual(new Set([3]))
			expect(removed).toEqual(new Set([2]))
		})
	})
})
