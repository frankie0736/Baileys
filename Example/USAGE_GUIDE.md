# Baileys 使用指南

本文档记录 Baileys WhatsApp API 库的常用场景和使用方法。

## 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [使用场景](#使用场景)
- [架构模式](#架构模式)
- [API 参考](#api-参考)

---

## 环境要求

- **运行环境**：Node.js 20+ 或 Bun
- **不支持**：Cloudflare Workers、Vercel Edge
- **推荐部署**：VPS、Railway、Fly.io、Render

### 为什么不支持 Serverless？

Baileys 无法在 Cloudflare Workers / Vercel Edge 运行，原因：

1. **WebSocket 长连接** - Baileys 需要维持与 WhatsApp 服务器的持久连接，Workers 是无状态短请求
2. **Node.js 原生依赖** - crypto, ws, libsignal（Signal 协议加密库有原生绑定）
3. **会话状态** - 需要持久存储 Signal 协议的加密密钥，每条消息都会更新
4. **执行时间** - Workers 有时间限制，WhatsApp 连接需要一直保持

可行的架构：Cloudflare Workers 做 API 网关/鉴权，Baileys 跑在 VPS 上。

## 快速开始

### 安装依赖

```bash
bun install
```

### 运行示例

```bash
# 显示二维码，扫码登录
bun run example

# 使用配对码登录（不扫码）
bun run example --use-pairing-code
```

首次运行需要扫码/输入配对码，之后会话保存在 `baileys_auth_info/` 目录，重启自动登录。

### 作为依赖在其他项目使用

```bash
# 在你的项目中
bun add github:frankie0736/Baileys
```

```ts
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from 'baileys'

const { state, saveCreds } = await useMultiFileAuthState('auth')
const sock = makeWASocket({ auth: state })

sock.ev.on('creds.update', saveCreds)
sock.ev.on('messages.upsert', ({ messages }) => {
  // 处理收到的消息
})
```

### 多账号运行

```bash
# 账号 A
AUTH_DIR=auth_a bun run example

# 账号 B（新终端）
AUTH_DIR=auth_b bun run example
```

---

## Baileys 能力概览

基本上 WhatsApp 手机端能做的，Baileys 都能做：

### 常见应用场景

| 场景 | 说明 |
|------|------|
| 客服机器人 | 自动回复常见问题、关键词触发、转人工 |
| 通知系统 | 订单状态、发货提醒、预约确认、验证码 |
| 消息转发 | WhatsApp ↔ Telegram/微信/Slack 互通 |
| 群组管理 | 自动踢人、欢迎新成员、违规检测 |
| CRM 集成 | 消息存档、客户标签、对话记录 |
| 定时消息 | 生日祝福、节日问候、定时提醒 |

### 具体能力

**消息**
- 发送/接收文本、图片、视频、语音、文件
- 发送位置、联系人名片、投票
- 消息引用、转发、撤回、编辑
- 表情回应、已读回执

**群组**
- 创建/解散群组
- 添加/移除/提升/降级成员
- 修改群名、描述、头像
- 获取群成员列表

**用户**
- 检查号码是否注册 WhatsApp
- 获取头像、状态、在线状态
- 拉黑/取消拉黑
- 隐私设置

**其他**
- 发送/查看状态（朋友圈）
- 广播消息
- 拒接来电

---

## 使用场景

### 1. 简单的自动回复（ping-pong）

在 `Example/example.ts` 的 `messages.upsert` 事件中：

```ts
// ping-pong 测试
if (!msg.key.fromMe && text?.toLowerCase() === 'ping') {
  const randomDelay = 500 + Math.random() * 1500 // 0.5-2秒随机延迟
  await delay(randomDelay)
  await sock.sendMessage(msg.key.remoteJid!, { text: 'pong' })
}
```

### 2. 发送各种消息

```ts
// 文本
await sock.sendMessage(jid, { text: 'Hello!' })

// 图片
await sock.sendMessage(jid, {
  image: { url: './photo.jpg' },
  caption: '图片说明'
})

// 引用回复
await sock.sendMessage(jid, { text: '回复内容' }, { quoted: originalMessage })

// 位置
await sock.sendMessage(jid, {
  location: { degreesLatitude: 24.121, degreesLongitude: 55.112 }
})
```

### 3. 检查号码是否注册 WhatsApp

```ts
const [result] = await sock.onWhatsApp('8613800138000')
if (result.exists) {
  console.log('已注册，JID:', result.jid)
}
```

---

## 架构模式

### 模式 1：单体应用

直接在 Baileys 事件回调中处理业务逻辑。

```
WhatsApp ←→ Baileys (example.ts) ←→ 业务逻辑
```

适合简单场景，代码都在一个文件里。

### 模式 2：Gateway + Webhook（推荐）

将 Baileys 作为网关，业务逻辑独立成服务。

```
                    ┌──────────────────┐
WhatsApp ←→ Gateway │  POST /webhook   │→ 你的业务服务
           (3001)   │                  │   (任何语言)
                    │  POST /send      │←
                    └──────────────────┘
```

**优点：**
- 业务逻辑解耦，可以用任何语言
- Gateway 稳定运行，业务服务可以随时重启
- 方便扩展多个业务服务

#### 启动 Gateway

```bash
bun run ./Example/gateway.ts
```

环境变量：
- `PORT`：API 端口（默认 3001）
- `WEBHOOK_URL`：消息推送地址（默认 http://localhost:3002/webhook）
- `AUTH_DIR`：认证目录（默认 baileys_auth_info）
- `MEDIA_DIR`：媒体文件保存目录（默认 ./received_media）

#### 启动 Webhook 服务

```bash
bun run ./Example/webhook-server.ts
```

#### Gateway API

**发送文本消息**
```bash
curl -X POST http://localhost:3001/send \
  -H "Content-Type: application/json" \
  -d '{"to": "8613800138000", "message": "Hello!"}'
```

**发送图片**
```bash
curl -X POST http://localhost:3001/send-image \
  -H "Content-Type: application/json" \
  -d '{"to": "8613800138000", "imagePath": "./Example/brightex.jpg", "caption": "图片说明"}'
```

**发送视频**
```bash
curl -X POST http://localhost:3001/send-video \
  -H "Content-Type: application/json" \
  -d '{"to": "8613800138000", "videoPath": "./Example/video.mp4", "caption": "视频说明"}'
```

**发送文件/文档**
```bash
curl -X POST http://localhost:3001/send-file \
  -H "Content-Type: application/json" \
  -d '{"to": "8613800138000", "filePath": "./Example/PDF-file.pdf", "filename": "文档.pdf"}'
```

#### Webhook 接收格式

Gateway 收到消息后会 POST 到 WEBHOOK_URL。

**文本消息**
```json
{
  "from": "8613800138000@s.whatsapp.net",
  "type": "text",
  "text": "用户发送的消息",
  "pushName": "用户名",
  "messageId": "消息ID",
  "timestamp": 1234567890
}
```

**图片消息**
```json
{
  "from": "8613800138000@s.whatsapp.net",
  "type": "image",
  "caption": "图片说明",
  "mimetype": "image/jpeg",
  "filename": "image_1234567890.jpeg",
  "savedPath": "received_media/image_1234567890.jpeg",
  "pushName": "用户名",
  "messageId": "消息ID",
  "timestamp": 1234567890
}
```

**视频消息**
```json
{
  "from": "8613800138000@s.whatsapp.net",
  "type": "video",
  "caption": "视频说明",
  "mimetype": "video/mp4",
  "filename": "video_1234567890.mp4",
  "savedPath": "received_media/video_1234567890.mp4",
  "pushName": "用户名",
  "messageId": "消息ID",
  "timestamp": 1234567890
}
```

**文档消息**
```json
{
  "from": "8613800138000@s.whatsapp.net",
  "type": "document",
  "filename": "原始文件名.pdf",
  "mimetype": "application/pdf",
  "savedPath": "received_media/doc_1234567890_原始文件名.pdf",
  "pushName": "用户名",
  "messageId": "消息ID",
  "timestamp": 1234567890
}
```

**语音消息**
```json
{
  "from": "8613800138000@s.whatsapp.net",
  "type": "audio",
  "mimetype": "audio/ogg",
  "ptt": true,
  "filename": "audio_1234567890.ogg",
  "savedPath": "received_media/audio_1234567890.ogg",
  "pushName": "用户名",
  "messageId": "消息ID",
  "timestamp": 1234567890
}
```

#### 媒体文件存储

收到的媒体文件自动保存到 `received_media/` 目录（可通过 `MEDIA_DIR` 环境变量配置）。

#### 测试命令

启动 Gateway 和 Webhook 后，可以发送以下文字触发机器人回复媒体：

| 发送文字 | 机器人回复 |
|---------|-----------|
| `ping` | pong |
| `图片` 或 `image` | 测试图片 |
| `视频` 或 `video` | 测试视频 |
| `文件` 或 `pdf` | 测试 PDF |
| 发送图片/视频/文档 | 确认收到 + 保存路径 |

---

## API 参考

### 发送消息

```ts
// 文本
await sock.sendMessage(jid, { text: 'message' })

// 图片
await sock.sendMessage(jid, { image: { url: 'path' }, caption: 'text' })

// 视频
await sock.sendMessage(jid, { video: { url: 'path' }, caption: 'text' })

// 语音
await sock.sendMessage(jid, { audio: { url: 'path' }, mimetype: 'audio/mp4' })

// 文件
await sock.sendMessage(jid, { document: { url: 'path' }, fileName: 'file.pdf' })

// 位置
await sock.sendMessage(jid, { location: { degreesLatitude, degreesLongitude } })

// 表情回应
await sock.sendMessage(jid, { react: { text: '👍', key: msg.key } })
```

### 群组操作

```ts
// 创建群组
const group = await sock.groupCreate('群名', ['jid1', 'jid2'])

// 获取群信息
const metadata = await sock.groupMetadata(groupJid)

// 添加/移除成员
await sock.groupParticipantsUpdate(groupJid, ['jid'], 'add')    // add/remove/promote/demote

// 修改群设置
await sock.groupUpdateSubject(groupJid, '新群名')
await sock.groupUpdateDescription(groupJid, '新描述')
```

### 用户操作

```ts
// 检查号码是否注册
const [result] = await sock.onWhatsApp(phone)

// 获取头像
const url = await sock.profilePictureUrl(jid, 'image')

// 获取状态
const status = await sock.fetchStatus(jid)

// 拉黑/取消拉黑
await sock.updateBlockStatus(jid, 'block')   // block/unblock
```

### JID 格式

- 个人：`8613800138000@s.whatsapp.net`
- 群组：`123456789-123345@g.us`
- 广播：`timestamp@broadcast`
- 状态/动态：`status@broadcast`

---

## 文件结构

```
Example/
├── example.ts        # 完整示例，包含所有事件处理
├── gateway.ts        # Gateway 模式，暴露 HTTP API
├── webhook-server.ts # Webhook 接收服务示例
├── bot.ts            # 简单自动回复机器人
└── api.ts            # 纯 API 服务示例
```

## 注意事项

1. **会话必须保存**：`creds.update` 事件必须调用 `saveCreds()`，否则每次都要重新扫码
2. **同一认证目录只能运行一个实例**
3. **每个 WhatsApp 账号最多关联 4 个网页端设备**
4. **不要用于垃圾消息、批量营销等违反 WhatsApp 服务条款的行为**
