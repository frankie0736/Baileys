/**
 * 消息队列模块 - 合并连续消息 + 序列化处理
 */

// ============ 配置 ============
const MESSAGE_MERGE_TIMEOUT = Number(process.env.MESSAGE_MERGE_TIMEOUT) || 5000 // 消息合并等待时间 (ms)

// 每个用户的消息队列
interface QueueItem {
	messages: string[]
	timer: ReturnType<typeof setTimeout> | null
	processing: boolean
	pendingResolvers: Array<{
		resolve: (merged: string) => void
		reject: (err: Error) => void
	}>
}

const queues = new Map<string, QueueItem>()

/**
 * 获取或创建用户队列
 */
function getQueue(jid: string): QueueItem {
	if (!queues.has(jid)) {
		queues.set(jid, {
			messages: [],
			timer: null,
			processing: false,
			pendingResolvers: [],
		})
	}
	return queues.get(jid)!
}

/**
 * 将消息加入队列，等待合并
 * 返回 Promise，在消息处理时 resolve 合并后的文本
 */
export function enqueueMessage(jid: string, text: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const queue = getQueue(jid)

		// 如果正在处理，等待当前处理完成后再加入新的批次
		if (queue.processing) {
			// 创建新的等待批次
			queue.messages.push(text)
			queue.pendingResolvers.push({ resolve, reject })
			return
		}

		// 添加消息
		queue.messages.push(text)
		queue.pendingResolvers.push({ resolve, reject })

		// 清除之前的定时器
		if (queue.timer) {
			clearTimeout(queue.timer)
		}

		// 设置新的定时器
		queue.timer = setTimeout(() => {
			processQueue(jid)
		}, MESSAGE_MERGE_TIMEOUT)
	})
}

/**
 * 处理队列中的消息
 */
async function processQueue(jid: string): Promise<void> {
	const queue = getQueue(jid)

	if (queue.messages.length === 0) return
	if (queue.processing) return

	queue.processing = true

	// 取出当前批次
	const messages = [...queue.messages]
	const resolvers = [...queue.pendingResolvers]

	// 清空队列
	queue.messages = []
	queue.pendingResolvers = []
	queue.timer = null

	// 合并消息
	const merged = messages.join('\n')

	console.log(`📦 合并 ${messages.length} 条消息: "${merged.substring(0, 50)}${merged.length > 50 ? '...' : ''}"`)

	// 通知所有等待者
	for (const { resolve } of resolvers) {
		resolve(merged)
	}

	queue.processing = false

	// 如果在处理期间有新消息加入，继续处理
	if (queue.messages.length > 0) {
		queue.timer = setTimeout(() => {
			processQueue(jid)
		}, MESSAGE_MERGE_TIMEOUT)
	}
}

/**
 * 检查用户是否有待处理的消息
 */
export function hasPendingMessages(jid: string): boolean {
	const queue = queues.get(jid)
	return queue ? queue.messages.length > 0 || queue.processing : false
}

/**
 * 获取配置信息
 */
export function getQueueConfig() {
	return {
		mergeTimeout: MESSAGE_MERGE_TIMEOUT,
	}
}
