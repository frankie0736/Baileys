/**
 * WhatsApp Gateway - 支持媒体收发 + 模拟人类行为
 *
 * 功能：
 * 1. 收到消息（文本/图片/视频/文档） → 调用外部 WEBHOOK_URL
 * 2. 暴露 API 用于发送消息（自动模拟人类行为：已读→typing→发送）
 *
 * API：
 * - POST /send        发送文本
 * - POST /send-image  发送图片
 * - POST /send-video  发送视频
 * - POST /send-file   发送文件
 * - POST /read        标记消息已读
 * - POST /typing      发送 typing 状态
 */

import { Hono } from 'hono'
import qrcode from 'qrcode-terminal'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import makeWASocket, {
	DisconnectReason,
	useMultiFileAuthState,
	makeCacheableSignalKeyStore,
	delay,
	downloadMediaMessage,
	getContentType,
} from '../src'
import { Boom } from '@hapi/boom'
import P from 'pino'

// ============ 配置 ============
const PORT = Number(process.env.PORT) || 3001
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3002/webhook'
const AUTH_DIR = process.env.AUTH_DIR || 'baileys_auth_info'
const MEDIA_DIR = process.env.MEDIA_DIR || './received_media'

// 模拟人类行为配置（智能延迟）
const HUMAN_LIKE = {
	// 基础延迟
	INITIAL_DELAY: { min: 1000, max: 3000 },      // 收到消息后的初始延迟 (ms)
	READ_DELAY: { min: 200, max: 500 },           // 已读前的基础延迟 (ms)
	BEFORE_TYPING_DELAY: { min: 300, max: 800 },  // 已读后、typing 前的基础延迟 (ms)
	TYPING_DELAY: { min: 500, max: 1500 },        // typing 状态基础时间 (ms)

	// 智能延迟系数（与内容长度相关）
	READ_PER_CHAR: 30,                            // 每字符增加的阅读时间 (ms)
	MAX_READ_TIME: 3000,                          // 最大阅读时间 (ms)
	THINKING_PER_CHAR: 20,                        // 每字符增加的思考时间 (ms)
	MAX_THINKING_TIME: 2000,                      // 最大思考时间 (ms)
	TYPING_PER_CHAR: 50,                          // 每字符的打字时间 (ms)
	MAX_TYPING_TIME: 8000,                        // 最大 typing 时间 (ms)
}

const logger = P({ level: 'silent' })
const app = new Hono()

// 全局 socket
let sock: ReturnType<typeof makeWASocket> | null = null

// 确保媒体目录存在
if (!existsSync(MEDIA_DIR)) {
	await mkdir(MEDIA_DIR, { recursive: true })
}

// ============ 工具函数 ============

// 随机延迟
function randomDelay(min: number, max: number): number {
	return min + Math.random() * (max - min)
}

// 根据输入消息长度计算阅读时间
function calculateReadTime(inputLength: number): number {
	const baseTime = randomDelay(HUMAN_LIKE.READ_DELAY.min, HUMAN_LIKE.READ_DELAY.max)
	const charTime = inputLength * HUMAN_LIKE.READ_PER_CHAR
	return Math.min(baseTime + charTime, HUMAN_LIKE.MAX_READ_TIME)
}

// 根据输入消息长度计算思考时间
function calculateThinkingTime(inputLength: number): number {
	const baseTime = randomDelay(HUMAN_LIKE.BEFORE_TYPING_DELAY.min, HUMAN_LIKE.BEFORE_TYPING_DELAY.max)
	const charTime = inputLength * HUMAN_LIKE.THINKING_PER_CHAR
	return Math.min(baseTime + charTime, HUMAN_LIKE.MAX_THINKING_TIME)
}

// 根据输出消息长度计算 typing 时间
function calculateTypingTime(outputLength: number): number {
	const baseTime = randomDelay(HUMAN_LIKE.TYPING_DELAY.min, HUMAN_LIKE.TYPING_DELAY.max)
	const charTime = outputLength * HUMAN_LIKE.TYPING_PER_CHAR
	return Math.min(baseTime + charTime, HUMAN_LIKE.MAX_TYPING_TIME)
}

// 模拟人类发送消息流程（智能延迟与内容长度相关）
async function humanLikeSend(
	jid: string,
	content: Parameters<NonNullable<typeof sock>['sendMessage']>[1],
	options?: {
		messageKey?: { id: string; remoteJid: string; fromMe?: boolean; participant?: string };
		skipRead?: boolean;
		skipTyping?: boolean;
		skipInitialDelay?: boolean;
		inputLength?: number;  // 输入消息长度（用于计算阅读和思考时间）
	}
) {
	if (!sock) throw new Error('未连接 WhatsApp')

	const {
		messageKey,
		skipRead = false,
		skipTyping = false,
		skipInitialDelay = false,
		inputLength = 0
	} = options || {}

	// 0. 初始延迟（模拟人看到消息后的反应时间）
	if (!skipInitialDelay) {
		const initialWait = randomDelay(HUMAN_LIKE.INITIAL_DELAY.min, HUMAN_LIKE.INITIAL_DELAY.max)
		console.log(`⏳ 等待 ${Math.round(initialWait)}ms 后开始处理...`)
		await delay(initialWait)
	}

	// 1. 标记已读（延迟与输入消息长度相关）
	if (!skipRead && messageKey) {
		const readWait = calculateReadTime(inputLength)
		console.log(`📖 阅读中 ${Math.round(readWait)}ms...`)
		await delay(readWait)
		try {
			await sock.readMessages([messageKey])
			console.log(`👁️  已标记已读`)
		} catch (err) {
			console.log(`⚠️  标记已读失败: ${err}`)
		}
	}

	// 2. 已读后、typing 前的延迟（思考时间与输入长度相关）
	if (!skipTyping) {
		const thinkingWait = calculateThinkingTime(inputLength)
		console.log(`💭 思考中 ${Math.round(thinkingWait)}ms...`)
		await delay(thinkingWait)
	}

	// 3. 发送 typing 状态（时间与输出长度相关）
	if (!skipTyping) {
		try {
			await sock.sendPresenceUpdate('composing', jid)
			console.log(`⌨️  正在输入...`)

			// 根据输出内容长度计算 typing 时间
			let outputLength = 0
			if ('text' in content && typeof content.text === 'string') {
				outputLength = content.text.length
			}
			const typingTime = calculateTypingTime(outputLength)

			await delay(typingTime)

			// 停止 typing
			await sock.sendPresenceUpdate('paused', jid)
		} catch (err) {
			console.log(`⚠️  发送 typing 状态失败: ${err}`)
		}
	}

	// 4. 发送消息
	const result = await sock.sendMessage(jid, content)
	return result
}

// ============ WhatsApp 连接 ============
async function initWhatsApp() {
	const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
	console.log(`📁 认证目录: ${AUTH_DIR}`)
	console.log(`📂 媒体保存目录: ${MEDIA_DIR}`)

	sock = makeWASocket({
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		logger,
		syncFullHistory: false,
	})

	sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
		if (qr) {
			console.log('\n📱 扫描二维码登录:\n')
			qrcode.generate(qr, { small: true })
		}
		if (connection === 'close') {
			const code = (lastDisconnect?.error as Boom)?.output?.statusCode
			if (code !== DisconnectReason.loggedOut) {
				console.log('⚠️  连接断开，重连中...')
				initWhatsApp()
			} else {
				console.log('❌ 已登出')
			}
		}
		if (connection === 'open') {
			console.log('\n✅ WhatsApp 已连接!')
			console.log(`🌐 API 地址: http://localhost:${PORT}`)
			console.log(`🔗 Webhook: ${WEBHOOK_URL}\n`)
		}
	})

	sock.ev.on('creds.update', saveCreds)

	// 收到消息 → 调用 webhook
	sock.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type !== 'notify') return

		for (const msg of messages) {
			if (msg.key.fromMe) continue // 忽略自己发的

			const messageContent = msg.message
			if (!messageContent) continue

			const contentType = getContentType(messageContent)

			// 构建 payload
			const payload: Record<string, any> = {
				from: msg.key.remoteJid,
				pushName: msg.pushName || '',
				messageId: msg.key.id,
				timestamp: msg.messageTimestamp,
				type: 'text', // 默认
				// 传递消息 key，用于后续标记已读
				messageKey: {
					id: msg.key.id,
					remoteJid: msg.key.remoteJid,
					fromMe: msg.key.fromMe,
					participant: msg.key.participant,
				},
			}

			// 处理不同类型的消息
			if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
				// 文本消息
				payload.type = 'text'
				payload.text = messageContent.conversation || messageContent.extendedTextMessage?.text || ''
				console.log(`📩 收到文本: [${payload.pushName}] ${payload.text}`)

			} else if (contentType === 'imageMessage') {
				// 图片
				payload.type = 'image'
				payload.caption = messageContent.imageMessage?.caption || ''
				payload.mimetype = messageContent.imageMessage?.mimetype || 'image/jpeg'

				// 下载并保存
				try {
					const buffer = await downloadMediaMessage(msg, 'buffer', {})
					const ext = payload.mimetype.split('/')[1] || 'jpg'
					const filename = `image_${Date.now()}.${ext}`
					const filepath = join(MEDIA_DIR, filename)
					await writeFile(filepath, buffer as Buffer)
					payload.savedPath = filepath
					payload.filename = filename
					console.log(`🖼️  收到图片: [${payload.pushName}] 已保存到 ${filepath}`)
				} catch (err) {
					console.log(`⚠️  图片下载失败: ${err}`)
				}

			} else if (contentType === 'videoMessage') {
				// 视频
				payload.type = 'video'
				payload.caption = messageContent.videoMessage?.caption || ''
				payload.mimetype = messageContent.videoMessage?.mimetype || 'video/mp4'

				try {
					const buffer = await downloadMediaMessage(msg, 'buffer', {})
					const ext = payload.mimetype.split('/')[1] || 'mp4'
					const filename = `video_${Date.now()}.${ext}`
					const filepath = join(MEDIA_DIR, filename)
					await writeFile(filepath, buffer as Buffer)
					payload.savedPath = filepath
					payload.filename = filename
					console.log(`🎬 收到视频: [${payload.pushName}] 已保存到 ${filepath}`)
				} catch (err) {
					console.log(`⚠️  视频下载失败: ${err}`)
				}

			} else if (contentType === 'documentMessage' || contentType === 'documentWithCaptionMessage') {
				// 文档/文件
				payload.type = 'document'
				const docMsg = messageContent.documentMessage || messageContent.documentWithCaptionMessage?.message?.documentMessage
				payload.filename = docMsg?.fileName || 'unknown'
				payload.mimetype = docMsg?.mimetype || 'application/octet-stream'
				payload.caption = docMsg?.caption || ''

				try {
					const buffer = await downloadMediaMessage(msg, 'buffer', {})
					const filename = `doc_${Date.now()}_${payload.filename}`
					const filepath = join(MEDIA_DIR, filename)
					await writeFile(filepath, buffer as Buffer)
					payload.savedPath = filepath
					console.log(`📄 收到文档: [${payload.pushName}] ${payload.filename} 已保存到 ${filepath}`)
				} catch (err) {
					console.log(`⚠️  文档下载失败: ${err}`)
				}

			} else if (contentType === 'audioMessage') {
				// 语音
				payload.type = 'audio'
				payload.mimetype = messageContent.audioMessage?.mimetype || 'audio/ogg'
				payload.ptt = messageContent.audioMessage?.ptt || false // 是否语音消息

				try {
					const buffer = await downloadMediaMessage(msg, 'buffer', {})
					const ext = payload.ptt ? 'ogg' : 'mp3'
					const filename = `audio_${Date.now()}.${ext}`
					const filepath = join(MEDIA_DIR, filename)
					await writeFile(filepath, buffer as Buffer)
					payload.savedPath = filepath
					payload.filename = filename
					console.log(`🎵 收到语音: [${payload.pushName}] 已保存到 ${filepath}`)
				} catch (err) {
					console.log(`⚠️  语音下载失败: ${err}`)
				}

			} else {
				// 其他类型
				payload.type = contentType || 'unknown'
				console.log(`📦 收到其他类型消息: ${contentType}`)
			}

			// 调用外部 webhook
			try {
				await fetch(WEBHOOK_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				})
				console.log(`📤 已推送到 webhook`)
			} catch (err) {
				console.log(`⚠️  Webhook 调用失败: ${err}`)
			}
		}
	})
}

// ============ API 路由 ============

// 健康检查
app.get('/', (c) => c.json({
	status: 'ok',
	connected: !!sock,
	webhook: WEBHOOK_URL,
	humanLikeConfig: HUMAN_LIKE,
}))

// 发送文本消息（模拟人类行为，智能延迟）
app.post('/send', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, message, messageKey, skipRead, skipTyping, skipInitialDelay, inputLength } = await c.req.json()
	if (!to || !message) {
		return c.json({ error: '缺少 to 或 message' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	try {
		const result = await humanLikeSend(jid, { text: message }, {
			messageKey,
			skipRead,
			skipTyping,
			skipInitialDelay,
			inputLength: inputLength || 0,  // 用于智能延迟计算
		})
		console.log(`📤 已发送文本到 ${to}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`)
		return c.json({ success: true, messageId: result?.key.id })
	} catch (err) {
		console.log(`⚠️  发送失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// 发送图片（模拟人类行为）
app.post('/send-image', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, imagePath, caption, messageKey, skipRead, skipTyping, skipInitialDelay } = await c.req.json()
	if (!to || !imagePath) {
		return c.json({ error: '缺少 to 或 imagePath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	try {
		const result = await humanLikeSend(
			jid,
			{ image: { url: imagePath }, caption: caption || '' },
			{ messageKey, skipRead, skipTyping, skipInitialDelay }
		)
		console.log(`🖼️  已发送图片到 ${to}: ${imagePath}`)
		return c.json({ success: true, messageId: result?.key.id })
	} catch (err) {
		console.log(`⚠️  发送失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// 发送视频（模拟人类行为）
app.post('/send-video', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, videoPath, caption, messageKey, skipRead, skipTyping, skipInitialDelay } = await c.req.json()
	if (!to || !videoPath) {
		return c.json({ error: '缺少 to 或 videoPath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	try {
		const result = await humanLikeSend(
			jid,
			{ video: { url: videoPath }, caption: caption || '' },
			{ messageKey, skipRead, skipTyping, skipInitialDelay }
		)
		console.log(`🎬 已发送视频到 ${to}: ${videoPath}`)
		return c.json({ success: true, messageId: result?.key.id })
	} catch (err) {
		console.log(`⚠️  发送失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// 发送文件/文档（模拟人类行为）
app.post('/send-file', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, filePath, filename, mimetype, messageKey, skipRead, skipTyping, skipInitialDelay } = await c.req.json()
	if (!to || !filePath) {
		return c.json({ error: '缺少 to 或 filePath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	try {
		const result = await humanLikeSend(
			jid,
			{
				document: { url: filePath },
				fileName: filename || filePath.split('/').pop() || 'file',
				mimetype: mimetype || 'application/octet-stream'
			},
			{ messageKey, skipRead, skipTyping, skipInitialDelay }
		)
		console.log(`📄 已发送文件到 ${to}: ${filePath}`)
		return c.json({ success: true, messageId: result?.key.id })
	} catch (err) {
		console.log(`⚠️  发送失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// 单独标记已读 API
app.post('/read', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { messageKey } = await c.req.json()
	if (!messageKey || !messageKey.id || !messageKey.remoteJid) {
		return c.json({ error: '缺少 messageKey' }, 400)
	}

	try {
		await sock.readMessages([messageKey])
		console.log(`👁️  已标记已读: ${messageKey.id}`)
		return c.json({ success: true })
	} catch (err) {
		console.log(`⚠️  标记已读失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// 发送 typing 状态 API
app.post('/typing', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, action = 'composing' } = await c.req.json()
	if (!to) {
		return c.json({ error: '缺少 to' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
	const validActions = ['composing', 'recording', 'paused']

	if (!validActions.includes(action)) {
		return c.json({ error: `action 必须是 ${validActions.join('/')}` }, 400)
	}

	try {
		await sock.sendPresenceUpdate(action, jid)
		console.log(`⌨️  已发送 ${action} 状态到 ${to}`)
		return c.json({ success: true })
	} catch (err) {
		console.log(`⚠️  发送状态失败: ${err}`)
		return c.json({ error: String(err) }, 500)
	}
})

// ============ 启动 ============
await initWhatsApp()

export default {
	port: PORT,
	fetch: app.fetch,
}

console.log(`\n🚀 Gateway 启动成功!`)
