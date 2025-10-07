/**
 * 对两个 Set 进行差集计算
 * @param source 原始 Set
 * @param target 新的 Set
 * @returns 返回一个包含 added 和 removed 两个 Set 的对象
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

	// Find added elements (in target but not in source)
	for (const elem of target) {
		if (!source.has(elem)) {
			added.add(elem)
		}
	}

	// Find removed elements (in source but not in target)
	for (const elem of source) {
		if (!target.has(elem)) {
			removed.add(elem)
		}
	}

	return { added, removed }
}
