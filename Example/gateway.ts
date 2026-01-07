/**
 * WhatsApp Gateway - 最小闭环示例
 *
 * 功能：
 * 1. 收到消息 → 调用外部 WEBHOOK_URL
 * 2. 暴露 POST /send API 用于发送消息
 *
 * 流程：
 * 收到消息 → gateway.ts → POST 到你的服务 → 你的服务调用 /send → 回复消息
 */

import { Hono } from 'hono'
import qrcode from 'qrcode-terminal'
import makeWASocket, {
	DisconnectReason,
	useMultiFileAuthState,
	makeCacheableSignalKeyStore,
	delay,
	WAMessage
} from '../src'
import { Boom } from '@hapi/boom'
import P from 'pino'

// ============ 配置 ============
const PORT = Number(process.env.PORT) || 3001
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3002/webhook'
const AUTH_DIR = process.env.AUTH_DIR || 'baileys_auth_info'

const logger = P({ level: 'silent' })
const app = new Hono()

// 全局 socket
let sock: ReturnType<typeof makeWASocket> | null = null

// ============ WhatsApp 连接 ============
async function initWhatsApp() {
	const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
	console.log(`📁 认证目录: ${AUTH_DIR}`)

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

			const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
			if (!text) continue

			const payload = {
				from: msg.key.remoteJid,
				text: text,
				pushName: msg.pushName || '',
				messageId: msg.key.id,
				timestamp: msg.messageTimestamp,
			}

			console.log(`📩 收到: [${payload.pushName}] ${text}`)

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

// 发送消息
app.post('/send', async (c) => {
	if (!sock) return c.json({ error: '未连接 WhatsApp' }, 503)

	const { to, message } = await c.req.json()
	if (!to || !message) {
		return c.json({ error: '缺少 to 或 message' }, 400)
	}

	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	// 随机延迟 0.5-1.5 秒
	const randomDelay = 500 + Math.random() * 1000
	await delay(randomDelay)

	const result = await sock.sendMessage(jid, { text: message })
	console.log(`📤 已发送到 ${to}: ${message}`)

	return c.json({ success: true, messageId: result?.key.id })
})

// ============ 启动 ============
await initWhatsApp()

export default {
	port: PORT,
	fetch: app.fetch,
}

console.log(`\n🚀 Gateway 启动成功!`)
