/**
 * 对话历史管理模块 - 存储到文件系统
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import type { ChatMessage } from './ai-service'

// ============ 配置 ============
const HISTORY_DIR = process.env.CHAT_HISTORY_DIR || './chat_history'
const MAX_HISTORY_LENGTH = Number(process.env.MAX_HISTORY_LENGTH) || 20 // 保留最近 N 轮对话（user+assistant 各算一条）

// 用于序列化操作的锁
const locks = new Map<string, Promise<void>>()

// 确保目录存在
async function ensureDir() {
	if (!existsSync(HISTORY_DIR)) {
		await mkdir(HISTORY_DIR, { recursive: true })
	}
}

// 获取用户历史文件路径
function getHistoryPath(jid: string): string {
	// 将 JID 转为安全的文件名
	const safeJid = jid.replace(/[@:]/g, '_')
	return join(HISTORY_DIR, `${safeJid}.json`)
}

/**
 * 序列化执行函数（避免并发文件写入冲突）
 */
async function withLock<T>(jid: string, fn: () => Promise<T>): Promise<T> {
	// 等待之前的操作完成
	const prev = locks.get(jid)
	if (prev) {
		await prev.catch(() => {}) // 忽略之前的错误
	}

	// 创建新的 Promise
	let resolve: () => void
	const lock = new Promise<void>((r) => { resolve = r })
	locks.set(jid, lock)

	try {
		return await fn()
	} finally {
		resolve!()
		// 如果没有新的锁等待，清理
		if (locks.get(jid) === lock) {
			locks.delete(jid)
		}
	}
}

/**
 * 加载对话历史
 */
export async function loadHistory(jid: string): Promise<ChatMessage[]> {
	await ensureDir()
	const path = getHistoryPath(jid)

	try {
		if (existsSync(path)) {
			const data = await readFile(path, 'utf-8')
			return JSON.parse(data) as ChatMessage[]
		}
	} catch (err) {
		console.error(`加载历史失败 [${jid}]:`, err)
	}

	return []
}

/**
 * 保存对话历史
 */
export async function saveHistory(jid: string, history: ChatMessage[]): Promise<void> {
	await ensureDir()
	const path = getHistoryPath(jid)

	// 裁剪历史（保留最近 N 轮）
	const maxMessages = MAX_HISTORY_LENGTH * 2 // 每轮 2 条消息
	const trimmed = history.length > maxMessages
		? history.slice(-maxMessages)
		: history

	try {
		await writeFile(path, JSON.stringify(trimmed, null, 2), 'utf-8')
	} catch (err) {
		console.error(`保存历史失败 [${jid}]:`, err)
		throw err
	}
}

/**
 * 追加消息到历史（带锁）
 */
export async function appendToHistory(
	jid: string,
	message: ChatMessage
): Promise<ChatMessage[]> {
	return withLock(jid, async () => {
		const history = await loadHistory(jid)
		history.push(message)
		await saveHistory(jid, history)
		return history
	})
}

/**
 * 追加一轮对话（用户消息 + AI 回复）
 */
export async function appendConversation(
	jid: string,
	userMessage: string,
	assistantMessage: string
): Promise<ChatMessage[]> {
	return withLock(jid, async () => {
		const history = await loadHistory(jid)
		history.push({ role: 'user', content: userMessage })
		history.push({ role: 'assistant', content: assistantMessage })
		await saveHistory(jid, history)
		return history
	})
}

/**
 * 清除用户历史
 */
export async function clearHistory(jid: string): Promise<void> {
	return withLock(jid, async () => {
		await saveHistory(jid, [])
	})
}

/**
 * 获取配置信息
 */
export function getHistoryConfig() {
	return {
		historyDir: HISTORY_DIR,
		maxLength: MAX_HISTORY_LENGTH,
	}
}
