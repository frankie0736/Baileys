# Baileys API 参考

Baileys 库提供的完整 API 能力列表。

---

## 连接与认证

```ts
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

// 创建连接
const { state, saveCreds } = await useMultiFileAuthState('auth_dir')
const sock = makeWASocket({
  auth: state,
  syncFullHistory: false,
})

// 必须监听凭证更新
sock.ev.on('creds.update', saveCreds)

// 登出
await sock.logout()

// 获取配对码（替代扫码）
const code = await sock.requestPairingCode('8613800138000')

// 关闭连接
sock.ws.close()
```

---

## 消息发送

### 文本消息

```ts
await sock.sendMessage(jid, { text: 'Hello!' })
```

### 图片

```ts
// 本地文件
await sock.sendMessage(jid, {
  image: { url: './photo.jpg' },
  caption: '图片说明'
})

// Buffer
await sock.sendMessage(jid, {
  image: imageBuffer,
  caption: '图片说明'
})

// URL（会自动下载）
await sock.sendMessage(jid, {
  image: { url: 'https://example.com/photo.jpg' },
  caption: '图片说明'
})
```

### 视频

```ts
await sock.sendMessage(jid, {
  video: { url: './video.mp4' },
  caption: '视频说明'
})
```

### 语音

```ts
await sock.sendMessage(jid, {
  audio: { url: './audio.mp3' },
  mimetype: 'audio/mp4',
  ptt: true  // true = 语音消息，false = 音频文件
})
```

### 文件/文档

```ts
await sock.sendMessage(jid, {
  document: { url: './file.pdf' },
  fileName: 'document.pdf',
  mimetype: 'application/pdf'
})
```

### 位置

```ts
await sock.sendMessage(jid, {
  location: {
    degreesLatitude: 24.121,
    degreesLongitude: 55.112
  }
})
```

### 联系人名片

```ts
await sock.sendMessage(jid, {
  contacts: {
    displayName: 'John Doe',
    contacts: [{
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:John Doe
TEL;type=CELL:+1234567890
END:VCARD`
    }]
  }
})
```

### 表情回应

```ts
await sock.sendMessage(jid, {
  react: {
    text: '👍',  // 空字符串 '' 取消回应
    key: msg.key
  }
})
```

### 引用回复

```ts
await sock.sendMessage(jid,
  { text: '这是回复内容' },
  { quoted: originalMessage }
)
```

### 转发消息

```ts
await sock.sendMessage(jid, {
  forward: originalMessage
})
```

### 撤回消息

```ts
await sock.sendMessage(jid, {
  delete: msgKey
})
```

### 编辑消息

```ts
await sock.sendMessage(jid, {
  text: '编辑后的内容',
  edit: msgKey
})
```

---

## 消息操作

```ts
// 标记消息已读
await sock.readMessages([msg.key])

// 发送回执（已读、已收到等）
await sock.sendMessageReceipt(jid, participant, [msgId], type)
// type: 'read' | 'read-self' | 'played'
```

---

## 群组管理

### 创建群组

```ts
const group = await sock.groupCreate('群组名称', ['jid1', 'jid2'])
console.log('群组 ID:', group.id)
```

### 获取群信息

```ts
const metadata = await sock.groupMetadata(groupJid)
// metadata.subject - 群名
// metadata.desc - 群描述
// metadata.participants - 成员列表
// metadata.owner - 群主
```

### 成员管理

```ts
// 添加成员
await sock.groupParticipantsUpdate(groupJid, ['jid1', 'jid2'], 'add')

// 移除成员
await sock.groupParticipantsUpdate(groupJid, ['jid'], 'remove')

// 设为管理员
await sock.groupParticipantsUpdate(groupJid, ['jid'], 'promote')

// 取消管理员
await sock.groupParticipantsUpdate(groupJid, ['jid'], 'demote')
```

### 修改群设置

```ts
// 修改群名
await sock.groupUpdateSubject(groupJid, '新群名')

// 修改群描述
await sock.groupUpdateDescription(groupJid, '新描述')

// 修改群头像
await sock.updateProfilePicture(groupJid, { url: './avatar.jpg' })

// 仅管理员可发消息
await sock.groupSettingUpdate(groupJid, 'announcement')

// 所有人可发消息
await sock.groupSettingUpdate(groupJid, 'not_announcement')

// 仅管理员可修改群信息
await sock.groupSettingUpdate(groupJid, 'locked')

// 所有人可修改群信息
await sock.groupSettingUpdate(groupJid, 'unlocked')
```

### 邀请链接

```ts
// 获取邀请码
const code = await sock.groupInviteCode(groupJid)
const link = `https://chat.whatsapp.com/${code}`

// 重置邀请码
await sock.groupRevokeInvite(groupJid)

// 通过邀请码加入
await sock.groupAcceptInvite(code)

// 通过邀请码获取群信息（不加入）
const info = await sock.groupGetInviteInfo(code)
```

### 退出群组

```ts
await sock.groupLeave(groupJid)
```

---

## 用户与联系人

### 检查号码是否注册

```ts
const [result] = await sock.onWhatsApp('8613800138000')
if (result?.exists) {
  console.log('已注册，JID:', result.jid)
}

// 批量检查
const results = await sock.onWhatsApp('861380001', '861380002', '861380003')
```

### 获取头像

```ts
// 获取高清头像
const url = await sock.profilePictureUrl(jid, 'image')

// 获取预览图（小图）
const previewUrl = await sock.profilePictureUrl(jid, 'preview')
```

### 获取用户状态/签名

```ts
const status = await sock.fetchStatus(jid)
console.log(status?.status)  // 签名文字
```

### 拉黑/取消拉黑

```ts
// 拉黑
await sock.updateBlockStatus(jid, 'block')

// 取消拉黑
await sock.updateBlockStatus(jid, 'unblock')

// 获取黑名单
const blocklist = await sock.fetchBlocklist()
```

### 获取商业资料

```ts
const profile = await sock.getBusinessProfile(jid)
// profile.description - 商业描述
// profile.category - 类别
// profile.email - 邮箱
// profile.website - 网站
```

---

## 状态/朋友圈

### 发布状态

```ts
// 文字状态
await sock.sendMessage('status@broadcast', {
  text: '这是我的状态'
})

// 图片状态
await sock.sendMessage('status@broadcast', {
  image: { url: './photo.jpg' },
  caption: '状态说明'
})

// 视频状态
await sock.sendMessage('status@broadcast', {
  video: { url: './video.mp4' },
  caption: '状态说明'
})
```

---

## 隐私设置

```ts
// 最后在线时间可见性
await sock.updateLastSeenPrivacy('all')        // 所有人
await sock.updateLastSeenPrivacy('contacts')   // 仅联系人
await sock.updateLastSeenPrivacy('none')       // 没有人

// 头像可见性
await sock.updateProfilePicturePrivacy('all')
await sock.updateProfilePicturePrivacy('contacts')
await sock.updateProfilePicturePrivacy('none')

// 签名/状态可见性
await sock.updateStatusPrivacy('all')
await sock.updateStatusPrivacy('contacts')
await sock.updateStatusPrivacy('none')

// 已读回执
await sock.updateReadReceiptsPrivacy('all')
await sock.updateReadReceiptsPrivacy('none')

// 谁能拉我进群
await sock.updateGroupsAddPrivacy('all')
await sock.updateGroupsAddPrivacy('contacts')
```

---

## 事件监听

### 连接状态

```ts
sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr } = update

  if (qr) {
    // 显示二维码
  }

  if (connection === 'open') {
    console.log('已连接')
  }

  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode
    if (code !== DisconnectReason.loggedOut) {
      // 重连
    }
  }
})
```

### 凭证更新（必须监听）

```ts
sock.ev.on('creds.update', saveCreds)
```

### 收到消息

```ts
sock.ev.on('messages.upsert', ({ messages, type }) => {
  if (type === 'notify') {
    for (const msg of messages) {
      const text = msg.message?.conversation
                || msg.message?.extendedTextMessage?.text
      const from = msg.key.remoteJid
      const isFromMe = msg.key.fromMe

      console.log(`收到消息: ${text}`)
    }
  }
})
```

### 消息状态更新

```ts
sock.ev.on('messages.update', (updates) => {
  for (const { key, update } of updates) {
    if (update.status) {
      // 1 = pending, 2 = sent, 3 = delivered, 4 = read
      console.log(`消息 ${key.id} 状态: ${update.status}`)
    }
  }
})
```

### 回执更新

```ts
sock.ev.on('message-receipt.update', (updates) => {
  for (const { key, receipt } of updates) {
    console.log(`消息 ${key.id} 被 ${receipt.userJid} 已读`)
  }
})
```

### 在线状态

```ts
// 订阅某人的在线状态
await sock.presenceSubscribe(jid)

sock.ev.on('presence.update', ({ id, presences }) => {
  const presence = presences[id]
  // presence.lastKnownPresence: 'available' | 'unavailable' | 'composing' | 'recording'
})
```

### 会话更新

```ts
sock.ev.on('chats.update', (chats) => {
  for (const chat of chats) {
    console.log(`会话 ${chat.id} 更新`)
  }
})

sock.ev.on('chats.delete', (deletedChats) => {
  console.log('会话被删除:', deletedChats)
})
```

### 联系人更新

```ts
sock.ev.on('contacts.update', (contacts) => {
  for (const contact of contacts) {
    console.log(`联系人 ${contact.id} 更新`)
  }
})
```

### 群组更新

```ts
sock.ev.on('groups.update', (updates) => {
  for (const update of updates) {
    console.log(`群组 ${update.id} 信息更新`)
  }
})

sock.ev.on('group-participants.update', ({ id, participants, action }) => {
  // action: 'add' | 'remove' | 'promote' | 'demote'
  console.log(`群组 ${id}: ${participants} 被 ${action}`)
})
```

### 来电

```ts
sock.ev.on('call', (calls) => {
  for (const call of calls) {
    console.log(`来电: ${call.from}, 类型: ${call.isVideo ? '视频' : '语音'}`)

    // 拒接
    await sock.rejectCall(call.id, call.from)
  }
})
```

---

## JID 格式

| 类型 | 格式 | 示例 |
|------|------|------|
| 个人 | `{phone}@s.whatsapp.net` | `8613800138000@s.whatsapp.net` |
| 群组 | `{id}@g.us` | `123456789-123345@g.us` |
| 广播 | `{timestamp}@broadcast` | `1234567890@broadcast` |
| 状态 | `status@broadcast` | `status@broadcast` |

---

## 工具函数

```ts
import {
  jidDecode,           // 解析 JID
  jidNormalizedUser,   // 标准化 JID
  isJidGroup,          // 是否群组
  isJidUser,           // 是否个人
  isJidBroadcast,      // 是否广播
  isJidNewsletter,     // 是否频道
  delay,               // 延迟函数
  generateMessageID,   // 生成消息 ID
} from '@whiskeysockets/baileys'

// 解析 JID
const { user, server } = jidDecode('8613800138000@s.whatsapp.net')
// user: '8613800138000', server: 's.whatsapp.net'

// 延迟
await delay(1000)  // 等待 1 秒
```
