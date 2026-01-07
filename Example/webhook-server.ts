/**
 * Webhook 服务 - 接收消息并回复
 *
 * 这是你的"业务逻辑"服务
 * 收到 gateway 推送的消息后，调用 gateway API 回复
 */

import { Hono } from 'hono'

const app = new Hono()

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3001'

// 接收 webhook
app.post('/webhook', async (c) => {
	const { from, text, pushName } = await c.req.json()

	console.log(`📩 收到消息: [${pushName}] ${text}`)

	// ============ 你的业务逻辑 ============
	let reply: string | null = null

	if (text.toLowerCase() === 'ping') {
		reply = 'pong'
	} else if (text.includes('你好')) {
		reply = `你好 ${pushName}！有什么可以帮助你的？`
	}
	// 可以加更多逻辑...

	// ============ 回复消息 ============
	if (reply) {
		try {
			const res = await fetch(`${GATEWAY_URL}/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ to: from, message: reply }),
			})
			const result = await res.json()
			console.log(`📤 已回复: ${reply}`, result)
		} catch (err) {
			console.log(`⚠️  回复失败: ${err}`)
		}
	}

	return c.json({ ok: true })
})

app.get('/', (c) => c.json({ status: 'webhook server running' }))

export default {
	port: 3002,
	fetch: app.fetch,
}

console.log('🎯 Webhook 服务启动在 http://localhost:3002')
