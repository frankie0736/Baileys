/**
 * AI 服务模块 - 调用 OpenAI API
 */

import OpenAI from 'openai'

// ============ 配置 ============
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://aihubmix.com/v1'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-api-key-here'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

// 系统提示词
const SYSTEM_PROMPT =
	process.env.AI_SYSTEM_PROMPT ||
	`你是一个友好的智能助手。
- 回复简洁明了，不要啰嗦
- 如果不确定答案，直接说"这个问题我不太确定，你可以换个方式问我"
- 使用中文回复`

// 创建 OpenAI 客户端
const openai = new OpenAI({
	baseURL: OPENAI_BASE_URL,
	apiKey: OPENAI_API_KEY
})

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system'
	content: string
}

/**
 * 调用 AI 生成回复
 * @param messages 对话历史
 * @returns AI 回复内容
 */
export async function generateReply(messages: ChatMessage[]): Promise<string> {
	try {
		// 添加系统提示词
		const fullMessages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]

		const response = await openai.chat.completions.create({
			model: OPENAI_MODEL,
			messages: fullMessages,
			temperature: 0.7,
			max_tokens: 1000
		})

		const content = response.choices[0]?.message?.content
		if (!content) {
			throw new Error('AI 返回空内容')
		}

		return content.trim()
	} catch (error) {
		console.error('AI 调用失败:', error)
		throw error
	}
}

/**
 * 获取配置信息（用于调试）
 */
export function getAIConfig() {
	return {
		baseURL: OPENAI_BASE_URL,
		model: OPENAI_MODEL,
		hasApiKey: OPENAI_API_KEY !== 'your-api-key-here'
	}
}
