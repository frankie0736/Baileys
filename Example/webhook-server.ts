/**
 * Webhook 服务 - 接收消息并用 AI 回复
 *
 * 功能：
 * 1. 文字消息 → 消息合并 → AI 回复 → 智能分段发送
 * 2. 图片/视频/文件 → 保持原有行为（确认收到）
 * 3. 对话历史记忆
 */

import { Hono } from 'hono'
import { generateReply, getAIConfig, type ChatMessage } from './ai-service'
import { loadHistory, appendConversation, getHistoryConfig } from './chat-history'
import { enqueueMessage, getQueueConfig } from './message-queue'
import { splitText, getSplitterConfig } from './text-splitter'

const app = new Hono()

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001'

// 测试文件路径（用于回复媒体）
const TEST_IMAGE = './Example/brightex.jpg'
const TEST_VIDEO = './Example/video.mp4'
const TEST_PDF = './Example/PDF-file.pdf'

/**
 * 发送文本消息到 Gateway
 */
async function sendText(
	to: string,
	message: string,
	messageKey?: object,
	options?: {
		skipRead?: boolean;
		skipTyping?: boolean;
		skipInitialDelay?: boolean;
		inputLength?: number;  // 用于智能延迟计算
	}
) {
	const res = await fetch(`${GATEWAY_URL}/send`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			to,
			message,
			messageKey,
			...options,
		}),
	})
	return res.json()
}

/**
 * 发送媒体到 Gateway
 */
async function sendMedia(
	to: string,
	type: 'image' | 'video' | 'file',
	path: string,
	caption?: string,
	messageKey?: object
) {
	let endpoint = ''
	const body: Record<string, unknown> = { to, messageKey }

	if (type === 'image') {
		endpoint = '/send-image'
		body.imagePath = path
		body.caption = caption
	} else if (type === 'video') {
		endpoint = '/send-video'
		body.videoPath = path
		body.caption = caption
	} else {
		endpoint = '/send-file'
		body.filePath = path
	}

	const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	return res.json()
}

/**
 * 处理文字消息（核心逻辑）
 */
async function handleTextMessage(
	jid: string,
	text: string,
	_pushName: string,
	messageKey?: object
): Promise<void> {
	// 1. 检查是否是特殊命令
	const lowerText = text.toLowerCase()

	// 特殊命令处理（不经过 AI）
	if (lowerText === 'ping') {
		await sendText(jid, 'pong', messageKey)
		console.log(`📤 回复 ping: pong`)
		return
	}

	if (lowerText === '图片' || lowerText === 'image') {
		await sendMedia(jid, 'image', TEST_IMAGE, '这是测试图片', messageKey)
		console.log(`📤 回复测试图片`)
		return
	}

	if (lowerText === '视频' || lowerText === 'video') {
		await sendMedia(jid, 'video', TEST_VIDEO, '这是测试视频', messageKey)
		console.log(`📤 回复测试视频`)
		return
	}

	if (lowerText === '文件' || lowerText === 'pdf' || lowerText === 'file') {
		await sendMedia(jid, 'file', TEST_PDF, undefined, messageKey)
		console.log(`📤 回复测试 PDF`)
		return
	}

	// 2. 加入消息队列等待合并
	console.log(`⏳ 消息入队: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`)
	const mergedText = await enqueueMessage(jid, text)

	// 3. 加载对话历史
	const history = await loadHistory(jid)
	const messages: ChatMessage[] = [
		...history,
		{ role: 'user', content: mergedText },
	]

	console.log(`🤖 调用 AI (历史 ${history.length} 条)...`)

	// 4. 调用 AI 生成回复
	let aiReply: string
	try {
		aiReply = await generateReply(messages)
		console.log(`🤖 AI 回复: "${aiReply.substring(0, 50)}${aiReply.length > 50 ? '...' : ''}"`)

	} catch (err) {
		console.error('AI 调用失败:', err)
		await sendText(jid, '抱歉，我暂时无法回复，请稍后再试。', messageKey)
		return
	}

	// 5. 智能分段
	const segments = await splitText(aiReply)

	// 6. 逐段发送（传递输入长度用于智能延迟）
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i]
		const isFirst = i === 0
		const isLast = i === segments.length - 1

		// 第一段：完整的人类行为模拟（已读 + typing），传递输入消息长度
		// 后续段：跳过已读和初始延迟，只保留 typing
		await sendText(jid, segment, isFirst ? messageKey : undefined, {
			skipRead: !isFirst,
			skipInitialDelay: !isFirst,
			inputLength: isFirst ? mergedText.length : 0,  // 第一段传递输入长度
		})

		console.log(`📤 发送第 ${i + 1}/${segments.length} 段: "${segment.substring(0, 30)}..."`)

		// 段落之间的间隔（非最后一段）
		if (!isLast) {
			// 根据下一段长度计算等待时间
			const nextSegment = segments[i + 1]
			const waitTime = 500 + nextSegment.length * 20 // 基础 500ms + 每字 20ms
			await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 3000)))
		}
	}

	// 7. 保存对话历史
	await appendConversation(jid, mergedText, aiReply)
	console.log(`💾 已保存对话历史`)
}

/**
 * 处理非文字消息（图片/视频/文件/语音）
 */
async function handleMediaMessage(
	jid: string,
	type: string,
	filename: string | undefined,
	savedPath: string | undefined,
	messageKey?: object
): Promise<void> {
	let replyText: string

	switch (type) {
		case 'image':
			replyText = `✅ 收到【图片】，已保存`
			if (savedPath) replyText += `\n📁 文件路径: ${savedPath}`
			break
		case 'video':
			replyText = `✅ 收到【视频】，已保存`
			if (savedPath) replyText += `\n📁 文件路径: ${savedPath}`
			break
		case 'document':
			replyText = `✅ 收到【文档】\n📄 文件名: ${filename || '未知'}`
			if (savedPath) replyText += `\n📁 文件路径: ${savedPath}`
			break
		case 'audio':
			replyText = `✅ 收到【语音消息】，已保存`
			if (savedPath) replyText += `\n📁 文件路径: ${savedPath}`
			break
		default:
			replyText = `📦 收到消息类型: ${type}`
	}

	await sendText(jid, replyText, messageKey)
	console.log(`📤 回复媒体消息: ${type}`)
}

// ============ API 路由 ============

// 接收 webhook
app.post('/webhook', async (c) => {
	const payload = await c.req.json()
	const { from, type, pushName, text, filename, savedPath, messageKey } = payload

	console.log(`\n📩 收到 ${type} 消息: [${pushName}]`, type === 'text' ? text : filename || '')

	try {
		if (type === 'text') {
			// 文字消息 → AI 处理
			await handleTextMessage(from, text, pushName, messageKey)
		} else {
			// 其他类型 → 确认收到
			await handleMediaMessage(from, type, filename, savedPath, messageKey)
		}
	} catch (err) {
		console.error('处理消息失败:', err)
	}

	return c.json({ ok: true })
})

// 健康检查 + 配置信息
app.get('/', (c) => c.json({
	status: 'webhook server running',
	config: {
		ai: getAIConfig(),
		history: getHistoryConfig(),
		queue: getQueueConfig(),
		splitter: getSplitterConfig(),
	},
	commands: {
		'ping': '回复 pong（不经过 AI）',
		'图片/image': '回复测试图片（不经过 AI）',
		'视频/video': '回复测试视频（不经过 AI）',
		'文件/pdf/file': '回复测试 PDF（不经过 AI）',
		'其他文字': 'AI 智能回复',
	},
	features: [
		'消息合并（5 秒防抖）',
		'多轮对话记忆',
		'长文本智能分段',
		'模拟人类行为',
	],
}))

export default {
	port: 3002,
	fetch: app.fetch,
}

console.log('\n🎯 Webhook 服务启动在 http://localhost:3002')
console.log('📝 特殊命令: ping, 图片, 视频, 文件')
console.log('🤖 其他文字会调用 AI 智能回复')
console.log('🧠 支持多轮对话记忆')
console.log('✂️  长文本自动分段发送')
console.log('')
console.log('⚙️  配置信息:')
console.log(`   AI: ${getAIConfig().baseURL} (${getAIConfig().model})`)
console.log(`   API Key: ${getAIConfig().hasApiKey ? '已配置' : '❌ 未配置'}`)
console.log(`   历史记录: ${getHistoryConfig().historyDir} (最多 ${getHistoryConfig().maxLength} 轮)`)
console.log(`   消息合并: ${getQueueConfig().mergeTimeout}ms`)
console.log(`   分段阈值: ${getSplitterConfig().threshold} 字`)
