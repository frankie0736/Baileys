import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import makeWASocket, {
	DisconnectReason,
	useMultiFileAuthState,
	WAMessage,
	proto,
	makeCacheableSignalKeyStore
} from '../src'
import P from 'pino'

// 日志配置（静默模式）
const logger = P({ level: 'silent' })

// ============ 自动回复配置 ============

// 关键词回复规则
const KEYWORD_REPLIES: Record<string, string> = {
	'你好': '你好！有什么可以帮助你的吗？',
	'hello': 'Hello! How can I help you?',
	'hi': 'Hi there! 👋',
	'价格': '请问您想了解哪个产品的价格？',
	'地址': '我们的地址是：xxx市xxx区xxx路xxx号',
	'营业时间': '我们的营业时间是：周一至周五 9:00-18:00',
}

// 默认回复（当没有匹配关键词时）
const DEFAULT_REPLY = '感谢您的消息！我会尽快回复您。'

// 是否启用默认回复
const ENABLE_DEFAULT_REPLY = true

// 忽略的 JID（不回复这些联系人/群组）
const IGNORED_JIDS: string[] = [
	// '1234567890@s.whatsapp.net', // 忽略某个联系人
	// '123456789@g.us', // 忽略某个群组
]

// 是否回复群组消息
const REPLY_TO_GROUPS = false

// ============ 机器人核心逻辑 ============

async function startBot() {
	const { state, saveCreds } = await useMultiFileAuthState('auth_info')

	const sock = makeWASocket({
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		logger,
	})

	// 处理连接状态
	sock.ev.on('connection.update', (update) => {
		const { connection, lastDisconnect, qr } = update

		if (qr) {
			console.log('\n📱 扫描下方二维码登录 WhatsApp:\n')
			qrcode.generate(qr, { small: true })
		}

		if (connection === 'close') {
			const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
			if (statusCode !== DisconnectReason.loggedOut) {
				console.log('连接断开，正在重连...')
				startBot()
			} else {
				console.log('已登出，请删除 auth_info 目录后重新运行')
			}
		}

		if (connection === 'open') {
			console.log('\n✅ 机器人已上线！等待消息中...\n')
		}
	})

	// 保存凭证
	sock.ev.on('creds.update', saveCreds)

	// 处理收到的消息
	sock.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type !== 'notify') return

		for (const msg of messages) {
			await handleMessage(sock, msg)
		}
	})

	return sock
}

// 处理单条消息
async function handleMessage(sock: ReturnType<typeof makeWASocket>, msg: WAMessage) {
	// 忽略自己发送的消息
	if (msg.key.fromMe) return

	// 获取发送者 JID
	const jid = msg.key.remoteJid
	if (!jid) return

	// 检查是否在忽略列表
	if (IGNORED_JIDS.includes(jid)) return

	// 检查是否是群组消息
	const isGroup = jid.endsWith('@g.us')
	if (isGroup && !REPLY_TO_GROUPS) return

	// 获取消息文本
	const text = extractMessageText(msg)
	if (!text) return

	// 获取发送者名称
	const senderName = msg.pushName || '未知用户'
	console.log(`📩 收到消息 [${senderName}]: ${text}`)

	// 查找匹配的关键词回复
	let reply: string | null = null
	for (const [keyword, response] of Object.entries(KEYWORD_REPLIES)) {
		if (text.toLowerCase().includes(keyword.toLowerCase())) {
			reply = response
			break
		}
	}

	// 如果没有匹配关键词，使用默认回复
	if (!reply && ENABLE_DEFAULT_REPLY) {
		reply = DEFAULT_REPLY
	}

	// 发送回复
	if (reply) {
		await sock.sendMessage(jid, { text: reply })
		console.log(`📤 已回复: ${reply}`)
	}
}

// 提取消息文本
function extractMessageText(msg: WAMessage): string | null {
	const message = msg.message
	if (!message) return null

	return (
		message.conversation ||
		message.extendedTextMessage?.text ||
		message.imageMessage?.caption ||
		message.videoMessage?.caption ||
		null
	)
}

// 启动机器人
console.log('🤖 WhatsApp 自动回复机器人启动中...\n')
startBot()
