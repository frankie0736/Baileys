/**
 * WhatsApp Gateway - 支持媒体收发
 *
 * 功能：
 * 1. 收到消息（文本/图片/视频/文档） → 调用外部 WEBHOOK_URL
 * 2. 暴露 API 用于发送消息
 *
 * API：
 * - POST /send        发送文本
 * - POST /send-image  发送图片
 * - POST /send-video  发送视频
 * - POST /send-file   发送文件
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

const logger = P({ level: 'silent' })
const app = new Hono()

// 全局 socket
let sock: ReturnType<typeof makeWASocket> | null = null

// 确保媒体目录存在
if (!existsSync(MEDIA_DIR)) {
	await mkdir(MEDIA_DIR, { recursive: true })
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
	webhook: WEBHOOK_URL
}))

// 发送文本消息
app.post('/send', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, message } = await c.req.json()
	if (!to || !message) {
		return c.json({ error: '缺少 to 或 message' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const randomDelay = 500 + Math.random() * 1000
	await delay(randomDelay)

	const result = await sock.sendMessage(jid, { text: message })
	console.log(`📤 已发送文本到 ${to}: ${message}`)

	return c.json({ success: true, messageId: result?.key.id })
})

// 发送图片
app.post('/send-image', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, imagePath, caption } = await c.req.json()
	if (!to || !imagePath) {
		return c.json({ error: '缺少 to 或 imagePath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const randomDelay = 500 + Math.random() * 1000
	await delay(randomDelay)

	const result = await sock.sendMessage(jid, {
		image: { url: imagePath },
		caption: caption || ''
	})
	console.log(`🖼️  已发送图片到 ${to}: ${imagePath}`)

	return c.json({ success: true, messageId: result?.key.id })
})

// 发送视频
app.post('/send-video', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, videoPath, caption } = await c.req.json()
	if (!to || !videoPath) {
		return c.json({ error: '缺少 to 或 videoPath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const randomDelay = 500 + Math.random() * 1000
	await delay(randomDelay)

	const result = await sock.sendMessage(jid, {
		video: { url: videoPath },
		caption: caption || ''
	})
	console.log(`🎬 已发送视频到 ${to}: ${videoPath}`)

	return c.json({ success: true, messageId: result?.key.id })
})

// 发送文件/文档
app.post('/send-file', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, filePath, filename, mimetype } = await c.req.json()
	if (!to || !filePath) {
		return c.json({ error: '缺少 to 或 filePath' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const randomDelay = 500 + Math.random() * 1000
	await delay(randomDelay)

	const result = await sock.sendMessage(jid, {
		document: { url: filePath },
		fileName: filename || filePath.split('/').pop() || 'file',
		mimetype: mimetype || 'application/octet-stream'
	})
	console.log(`📄 已发送文件到 ${to}: ${filePath}`)

	return c.json({ success: true, messageId: result?.key.id })
})

// ============ 启动 ============
await initWhatsApp()

export default {
	port: PORT,
	fetch: app.fetch,
}

console.log(`\n🚀 Gateway 启动成功!`)
