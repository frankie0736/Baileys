/**
 * Webhook 服务 - 接收消息并回复
 *
 * 支持处理：文本、图片、视频、文档、语音
 * 模拟人类行为：已读 → typing → 发送
 */

import { Hono } from 'hono'

const app = new Hono()

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001'

// 测试文件路径（用于回复媒体）
const TEST_IMAGE = './Example/brightex.jpg'
const TEST_VIDEO = './Example/video.mp4'
const TEST_PDF = './Example/PDF-file.pdf'

// 接收 webhook
app.post('/webhook', async (c) => {
	const payload = await c.req.json()
	const { from, type, pushName, text, filename, savedPath, messageKey } = payload

	console.log(`📩 收到 ${type} 消息: [${pushName}]`, type === 'text' ? text : filename || '')

	// ============ 业务逻辑 ============
	let replyText: string | null = null
	let replyMedia: { type: 'image' | 'video' | 'file', path: string, caption?: string } | null = null

	switch (type) {
		case 'text':
			// 文本消息处理
			const lowerText = text?.toLowerCase() || ''

			if (lowerText === 'ping') {
				replyText = 'pong'
			} else if (text?.includes('你好')) {
				replyText = `你好 ${pushName}！有什么可以帮助你的？`
			} else if (lowerText === '图片' || lowerText === 'image') {
				// 用户发"图片"，回复测试图片
				replyMedia = { type: 'image', path: TEST_IMAGE, caption: '这是测试图片' }
			} else if (lowerText === '视频' || lowerText === 'video') {
				// 用户发"视频"，回复测试视频
				replyMedia = { type: 'video', path: TEST_VIDEO, caption: '这是测试视频' }
			} else if (lowerText === '文件' || lowerText === 'pdf' || lowerText === 'file') {
				// 用户发"文件"或"pdf"，回复测试 PDF
				replyMedia = { type: 'file', path: TEST_PDF }
			} else {
				// 默认回复：收到
				replyText = '收到'
			}
			break

		case 'image':
			replyText = `✅ 收到【图片】，已保存`
			if (savedPath) {
				replyText += `\n📁 文件路径: ${savedPath}`
			}
			break

		case 'video':
			replyText = `✅ 收到【视频】，已保存`
			if (savedPath) {
				replyText += `\n📁 文件路径: ${savedPath}`
			}
			break

		case 'document':
			replyText = `✅ 收到【文档】\n📄 文件名: ${filename || '未知'}`
			if (savedPath) {
				replyText += `\n📁 文件路径: ${savedPath}`
			}
			break

		case 'audio':
			replyText = `✅ 收到【语音消息】，已保存`
			if (savedPath) {
				replyText += `\n📁 文件路径: ${savedPath}`
			}
			break

		default:
			replyText = `📦 收到消息类型: ${type}`
	}

	// ============ 发送回复（带模拟人类行为）============
	try {
		if (replyMedia) {
			// 回复媒体
			let endpoint = ''
			let body: Record<string, any> = {
				to: from,
				messageKey,  // 传递 messageKey 用于标记已读
			}

			if (replyMedia.type === 'image') {
				endpoint = '/send-image'
				body.imagePath = replyMedia.path
				body.caption = replyMedia.caption
			} else if (replyMedia.type === 'video') {
				endpoint = '/send-video'
				body.videoPath = replyMedia.path
				body.caption = replyMedia.caption
			} else if (replyMedia.type === 'file') {
				endpoint = '/send-file'
				body.filePath = replyMedia.path
			}

			const res = await fetch(`${GATEWAY_URL}${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			const result = await res.json()
			console.log(`📤 已回复媒体 (${replyMedia.type}):`, result)

		} else if (replyText) {
			// 回复文本
			const res = await fetch(`${GATEWAY_URL}/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					to: from,
					message: replyText,
					messageKey,  // 传递 messageKey 用于标记已读
				}),
			})
			const result = await res.json()
			console.log(`📤 已回复文本: ${replyText}`, result)
		}
	} catch (err) {
		console.log(`⚠️  回复失败: ${err}`)
	}

	return c.json({ ok: true })
})

app.get('/', (c) => c.json({
	status: 'webhook server running',
	commands: {
		'ping': '回复 pong',
		'你好': '回复问候',
		'图片/image': '回复测试图片',
		'视频/video': '回复测试视频',
		'文件/pdf/file': '回复测试 PDF',
		'其他文字': '回复"收到"',
		'发送图片/视频/文档': '自动回复确认收到'
	},
	humanLikeBehavior: '已读 → typing → 发送'
}))

export default {
	port: 3002,
	fetch: app.fetch,
}

console.log('🎯 Webhook 服务启动在 http://localhost:3002')
console.log('📝 可用命令: ping, 你好, 图片, 视频, 文件')
console.log('🤖 其他文字会回复"收到"')
console.log('👤 模拟人类行为: 已读 → typing → 发送')
