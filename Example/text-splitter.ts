/**
 * 智能文本分段模块 - 使用 AI 分割长文本
 */

import OpenAI from 'openai'

// ============ 配置 ============
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://aihubmix.com/v1'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const LONG_TEXT_THRESHOLD = Number(process.env.LONG_TEXT_THRESHOLD) || 200 // 超过此字数触发分段
const SPLIT_RETRY_COUNT = Number(process.env.SPLIT_RETRY_COUNT) || 1 // 分段失败重试次数

// 创建 OpenAI 客户端
const openai = new OpenAI({
	baseURL: OPENAI_BASE_URL,
	apiKey: OPENAI_API_KEY,
})

// 分段 prompt
const SPLIT_PROMPT = `你是一个文本分割助手。将下面的文本分成多个自然段落，适合在即时通讯中逐条发送。

要求：
1. 每段应该是完整的语义单元，不要在句子中间断开
2. 每段字数控制在 50-150 字之间
3. 段落之间有自然的停顿感
4. 保持原文意思不变，不要添加或删除内容
5. 返回 JSON 数组格式，如 ["第一段", "第二段", "第三段"]

文本：
`

/**
 * 检查是否需要分段
 */
export function needsSplit(text: string): boolean {
	return text.length > LONG_TEXT_THRESHOLD
}

/**
 * 使用 AI 分割文本
 */
async function aiSplit(text: string): Promise<string[]> {
	const response = await openai.chat.completions.create({
		model: OPENAI_MODEL,
		messages: [
			{ role: 'user', content: SPLIT_PROMPT + text }
		],
		temperature: 0.3, // 低温度，保证稳定输出
		max_tokens: 2000,
	})

	const content = response.choices[0]?.message?.content
	if (!content) {
		throw new Error('AI 分段返回空内容')
	}

	// 尝试解析 JSON 数组
	try {
		// 处理可能的 markdown 代码块
		let jsonStr = content.trim()
		if (jsonStr.startsWith('```json')) {
			jsonStr = jsonStr.slice(7)
		}
		if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.slice(3)
		}
		if (jsonStr.endsWith('```')) {
			jsonStr = jsonStr.slice(0, -3)
		}
		jsonStr = jsonStr.trim()

		const segments = JSON.parse(jsonStr)

		if (!Array.isArray(segments)) {
			throw new Error('AI 返回的不是数组')
		}

		// 过滤空段落
		const filtered = segments.filter((s: unknown) => typeof s === 'string' && s.trim().length > 0)

		if (filtered.length === 0) {
			throw new Error('分段结果为空')
		}

		return filtered
	} catch (parseErr) {
		console.error('解析 AI 分段结果失败:', parseErr)
		throw new Error(`解析分段结果失败: ${parseErr}`)
	}
}

/**
 * 智能分割文本（带重试）
 */
export async function splitText(text: string): Promise<string[]> {
	// 不需要分段
	if (!needsSplit(text)) {
		return [text]
	}

	// 尝试 AI 分段（带重试）
	for (let i = 0; i <= SPLIT_RETRY_COUNT; i++) {
		try {
			const segments = await aiSplit(text)
			console.log(`✂️  AI 分段成功: ${segments.length} 段`)
			return segments
		} catch (err) {
			console.error(`AI 分段失败 (第 ${i + 1} 次):`, err)

			if (i < SPLIT_RETRY_COUNT) {
				console.log('重试 AI 分段...')
			}
		}
	}

	// 所有重试都失败，返回原文
	console.warn('AI 分段全部失败，返回原文')
	return [text]
}

/**
 * 获取配置信息
 */
export function getSplitterConfig() {
	return {
		threshold: LONG_TEXT_THRESHOLD,
		retryCount: SPLIT_RETRY_COUNT,
	}
}
