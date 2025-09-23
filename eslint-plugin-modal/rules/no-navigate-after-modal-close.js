export default {
	meta: {
		type: 'problem',
		docs: {
			description: '不允许在关闭 modal 后立即执行导航操作',
			recommended: false,
		},
		schema: [
			{
				type: 'object',
				properties: {
					closeNames: {
						type: 'array',
						items: { type: 'string' },
						default: ['close', 'closeAll'],
					},
					navigateNames: {
						type: 'array',
						items: { type: 'string' },
						default: [
							'navigate',
							'push',
							'replace',
							'reset',
							'goBack',
							'dispatch',
						],
					},
				},
				additionalProperties: false,
			},
		],
		messages: {
			avoid:
				'不要在 close/closeAll 调用后的同一执行域内直接调用 navigation.navigate，使用 useModalStore.doAfterModalHostClosed 来延迟导航',
		},
	},

	create(context) {
		const opts = context.options[0] || {}
		const CLOSE_NAMES = new Set(opts.closeNames || ['close', 'closeAll'])
		const NAVIGATE_NAMES = new Set(
			opts.navigateNames || [
				'navigate',
				'push',
				'replace',
				'reset',
				'goBack',
				'dispatch',
			],
		)

		// 判断是否是 close / closeAll 调用
		function isCloseCall(node) {
			if (node.type !== 'CallExpression') return false
			const callee = node.callee
			if (!callee) return false
			if (callee.type === 'Identifier' && CLOSE_NAMES.has(callee.name))
				return true
			if (
				callee.type === 'MemberExpression' &&
				callee.property?.type === 'Identifier' &&
				CLOSE_NAMES.has(callee.property.name)
			)
				return true
			return false
		}

		// 判断是否是 navigation.navigate(...) 的调用
		function isNavigateCall(node) {
			if (node.type !== 'CallExpression') return false
			const callee = node.callee
			if (!callee) return false
			return (
				callee.type === 'MemberExpression' &&
				callee.property?.type === 'Identifier' &&
				NAVIGATE_NAMES.has(callee.property.name)
			)
		}

		// 获取最近的函数或 Program 节点
		function getEnclosingFunction(node) {
			let p = node.parent
			while (p) {
				if (
					[
						'FunctionDeclaration',
						'FunctionExpression',
						'ArrowFunctionExpression',
						'Program',
					].includes(p.type)
				) {
					return p
				}
				p = p.parent
			}
			return null
		}

		// 遍历函数节点查找 close 后的 navigate
		function hasNavigateAfter(functionNode, afterPos) {
			const visitedNodes = new Set()
			let found = false

			function traverse(node) {
				if (!node || visitedNodes.has(node)) return
				visitedNodes.add(node)

				// 跳过 parent 防止循环
				const keys = Object.keys(node).filter((k) => k !== 'parent')

				for (const key of keys) {
					const child = node[key]
					if (!child) continue

					if (Array.isArray(child)) {
						for (const c of child) {
							if (!c || typeof c.type !== 'string') continue

							// 跳过嵌套函数
							if (
								[
									'FunctionDeclaration',
									'FunctionExpression',
									'ArrowFunctionExpression',
								].includes(c.type) &&
								c !== functionNode
							) {
								continue
							}

							if (isNavigateCall(c) && (c.range?.[0] ?? 0) > afterPos) {
								found = true
								return
							}

							traverse(c)
							if (found) return
						}
					} else if (typeof child.type === 'string') {
						// 跳过嵌套函数
						if (
							[
								'FunctionDeclaration',
								'FunctionExpression',
								'ArrowFunctionExpression',
							].includes(child.type) &&
							child !== functionNode
						) {
							continue
						}

						if (isNavigateCall(child) && (child.range?.[0] ?? 0) > afterPos) {
							found = true
							return
						}

						traverse(child)
						if (found) return
					}
				}
			}

			traverse(functionNode)
			return found
		}

		return {
			CallExpression(node) {
				if (!isCloseCall(node)) return
				const afterPos = node.range?.[1] ?? 0
				const func = getEnclosingFunction(node)
				if (!func) return

				if (hasNavigateAfter(func, afterPos)) {
					context.report({ node, messageId: 'avoid' })
				}
			},
		}
	},
}
