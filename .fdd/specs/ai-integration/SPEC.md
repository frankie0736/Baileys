# AI Integration Spec

> WhatsApp 机器人接入 AI 能力，实现智能客服功能

## Intent

为 WhatsApp 机器人添加 AI 对话能力：
1. 收到文字消息时调用 AI 生成回复
2. 支持多轮对话记忆
3. 长回复智能分段发送
4. 连续消息合并处理
5. 延迟时间与内容长度相关，模拟真人

## Documents

| 文档 | 内容 |
|------|------|
| [stories.md](stories.md) | 用户故事 |
| [flows.md](flows.md) | 核心流程 |
| [context.md](context.md) | 技术决策 |
| [constraints.md](constraints.md) | 范围约束 |

## Key Decisions

| 决策 | 结论 |
|------|------|
| AI 服务 | aihubmix + gpt-4o-mini |
| API 地址 | https://aihubmix.com/v1 |
| 分段策略 | AI 智能分割 + 失败重试 |
| 对话存储 | 文件系统 JSON |
| 消息合并 | 5 秒防抖（可配置） |
| 并发控制 | 队列序列化（每用户一个队列） |

## 行为决策（评审确认）

| 场景 | 行为 |
|------|------|
| 等待合并期间 | 无反馈 |
| AI 分段失败 | 重试一次 |
| 用户打断回复 | 发完当前再处理 |
| 历史裁剪 | 按轮数（20 轮） |

## Implementation Checklist

- [x] 安装 openai SDK
- [x] 创建 AI 服务模块 (ai-service.ts)
- [x] 实现消息合并逻辑 (message-queue.ts)
- [x] 实现对话历史管理 (chat-history.ts)
- [x] 实现智能分段逻辑 (text-splitter.ts)
- [x] 重构 webhook-server.ts 集成 AI
- [x] 优化 gateway.ts 智能延迟
- [x] 测试完整流程

## 新增文件

| 文件 | 功能 |
|------|------|
| `Example/ai-service.ts` | AI 服务模块，调用 OpenAI API |
| `Example/chat-history.ts` | 对话历史管理，文件系统存储 |
| `Example/message-queue.ts` | 消息队列，5 秒防抖合并 |
| `Example/text-splitter.ts` | 智能文本分段，使用 AI |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OPENAI_BASE_URL` | `https://aihubmix.com/v1` | API 地址 |
| `OPENAI_API_KEY` | - | **必须配置** |
| `OPENAI_MODEL` | `gpt-4o-mini` | 模型名称 |
| `MESSAGE_MERGE_TIMEOUT` | `5000` | 消息合并等待时间 (ms) |
| `MAX_HISTORY_LENGTH` | `20` | 保留对话轮数 |
| `LONG_TEXT_THRESHOLD` | `200` | 触发分段的字数 |
| `CHAT_HISTORY_DIR` | `./chat_history` | 历史记录目录 |

## Related Pits

_暂无_

---

**Status**: 已完成
**Created**: 2026-01-08
