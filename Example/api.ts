import { Hono } from 'hono'
import qrcode from 'qrcode-terminal'
import makeWASocket, {
	DisconnectReason,
	useMultiFileAuthState,
	makeCacheableSignalKeyStore
} from '../src'
import { Boom } from '@hapi/boom'
import P from 'pino'

const app = new Hono()
const logger = P({ level: 'silent' })

// 全局存储 socket 实例
let sock: ReturnType<typeof makeWASocket> | null = null

// 初始化 WhatsApp 连接
async function initWhatsApp() {
	const { state, saveCreds } = await useMultiFileAuthState('auth_api')

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
				initWhatsApp() // 重连
			}
		}
		if (connection === 'open') {
			console.log('\n✅ WhatsApp 已连接！API 服务就绪\n')
		}
	})

	sock.ev.on('creds.update', saveCreds)
}

// ============ API 路由 ============

// 健康检查
app.get('/', (c) => c.json({ status: 'ok', connected: !!sock }))

// 发送文本消息
app.post('/send', async (c) => {
	if (!sock) return c.json({ error: '未连接' }, 503)

	const { to, message } = await c.req.json()
	// to 格式: 8613800138000 (不带 @s.whatsapp.net)
	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const result = await sock.sendMessage(jid, { text: message })
	return c.json({ success: true, messageId: result?.key.id })
})

// 发送图片
app.post('/send-image', async (c) => {
	if (!sock) return c.json({ error: '未连接' }, 503)

	const { to, imageUrl, caption } = await c.req.json()
	const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`

	const result = await sock.sendMessage(jid, {
		image: { url: imageUrl },
		caption: caption || ''
	})
	return c.json({ success: true, messageId: result?.key.id })
})

// 检查号码是否注册 WhatsApp
app.get('/check/:phone', async (c) => {
	if (!sock) return c.json({ error: '未连接' }, 503)

	const phone = c.req.param('phone')
	const [result] = await sock.onWhatsApp(phone)
	return c.json({ exists: result?.exists || false, jid: result?.jid })
})

// ============ 启动 ============

await initWhatsApp()

export default {
	port: 3000,
	fetch: app.fetch,
}

console.log('🚀 API 服务启动在 http://localhost:3000')
