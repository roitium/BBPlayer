/**
 * 对两个 Set 进行差集计算
 * @param source 标准的 Set
 * @param target 另一个 Set
 * @returns
 */
export function diffSets<T>(
	source: Set<T>,
	target: Set<T>,
): {
	added: Set<T>
	removed: Set<T>
} {
	const added = new Set<T>()
	const removed = new Set<T>()

	for (const elem of source) {
		if (!target.has(elem)) {
			added.add(elem)
		}
	}

	for (const elem of target) {
		if (!source.has(elem)) {
			removed.add(elem)
		}
	}

	return { added, removed }
}
