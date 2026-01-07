<h1 align='center'><img alt="Baileys logo" src="https://raw.githubusercontent.com/WhiskeySockets/Baileys/refs/heads/master/Media/logo.png" height="75"/></h1>

<div align='center'>Baileys 是一个基于 WebSocket 的 TypeScript 库，用于与 WhatsApp Web API 进行交互。</div>


> [!CAUTION]
> 破坏性变更通知
>
> 从 7.0.0 版本开始，库引入了多个破坏性变更。
>
> 请查看 https://whiskey.so/migrate-latest 获取更多信息。

# 重要说明
这是一个临时的 README.md，新指南正在开发中，此文件将被 .github/README.md 替换（已是 GitHub 默认）。

新指南链接：https://baileys.wiki

# 获取支持

如果您希望获得 Baileys 当前维护者 Rajeh 的商业到企业级支持，可以预约视频通话。通过 Discord 联系他或在[这里](https://purpshell.dev/book)预订 1 小时的时间段。越早预订越好，因为他的时间段通常很快就会被预订满。他每小时都能提供巨大的价值，并会在时间结束前回答您所有的问题。

如果您是企业，我们鼓励您回馈项目的高额开发成本，并支持每周在此项目上投入数十小时的维护者。您可以通过预约会议或下方赞助来做到这一点。欢迎各种规模的企业提供任何支持，包括善意/贡献时间。这并不是纵容或支持企业使用该库。请参阅下方的免责声明。

# 赞助
如果您想在经济上支持这个项目，可以在[这里](https://purpshell.dev/sponsor)支持当前维护者。

# 免责声明
本项目与 WhatsApp 或其任何子公司或关联公司没有任何关联、联系、授权、认可或官方联系。
WhatsApp 官方网站为 whatsapp.com。"WhatsApp" 及相关名称、标志、徽章和图像是其各自所有者的注册商标。

Baileys 的维护者绝不纵容将此应用程序用于违反 WhatsApp 服务条款的行为。本应用程序的维护者呼吁用户承担个人责任，以公平的方式使用此应用程序，正如其预期用途。
请自行斟酌使用。不要用它骚扰他人。我们不鼓励任何跟踪软件、批量或自动消息发送的使用。

##

- Baileys 不需要 Selenium 或任何其他浏览器来与 WhatsApp Web 交互，它直接使用 **WebSocket** 进行通信。
- 不运行 Selenium 或 Chromium 可以节省大约 **半个 GB** 的内存 :/
- Baileys 支持与 WhatsApp 的多设备版和网页版进行交互。
- 感谢 [@pokearaujo](https://github.com/pokearaujo/multidevice) 撰写了关于 WhatsApp 多设备工作原理的观察。同时感谢 [@Sigalor](https://github.com/sigalor/whatsapp-web-reveng) 撰写了关于 WhatsApp Web 工作原理的观察，以及感谢 [@Rhymen](https://github.com/Rhymen/go-whatsapp/) 提供的 __go__ 实现。

> [!IMPORTANT]
> 原始仓库已被原作者删除 - 我们现在在此仓库继续开发。
> 这是唯一的官方仓库，由社区维护。
> **加入 Discord [点击这里](https://discord.gg/WeJM5FP9GG)**

## 示例

请查看并运行 [example.ts](Example/example.ts) 来查看库的示例用法。
该脚本涵盖了大多数常见用例。
要运行示例脚本，请下载或克隆仓库，然后在终端中输入以下内容：
1. ``` cd path/to/Baileys ```
2. ``` bun install ```
3. ``` bun run example ```

## 安装

使用稳定版：
```
bun add @whiskeysockets/baileys
```

使用边缘版（不保证稳定性，但有最新的修复和功能）
```
bun add github:WhiskeySockets/Baileys
```

然后在代码中导入：
```ts
import makeWASocket from '@whiskeysockets/baileys'
```

# 链接

- [Discord](https://discord.gg/WeJM5FP9GG)
- [文档](https://guide.whiskeysockets.io/)

# 目录

- [连接账户](#连接账户)
    - [使用二维码连接](#使用二维码启动-socket)
    - [使用配对码连接](#使用配对码启动-socket)
    - [接收完整历史记录](#接收完整历史记录)
- [Socket 配置重要说明](#socket-配置重要说明)
    - [缓存群组元数据（推荐）](#缓存群组元数据推荐)
    - [改进重试系统和解密投票](#改进重试系统和解密投票)
    - [在 WhatsApp 应用中接收通知](#在-whatsapp-应用中接收通知)
- [保存认证信息](#保存和恢复会话)
- [处理事件](#处理事件)
    - [入门示例](#入门示例)
    - [解密投票](#解密投票)
    - [首次连接的事件摘要](#首次连接的事件摘要)
- [实现数据存储](#实现数据存储)
- [WhatsApp ID 说明](#whatsapp-id-说明)
- [实用函数](#实用函数)
- [发送消息](#发送消息)
    - [非媒体消息](#非媒体消息)
        - [文本消息](#文本消息)
        - [引用消息](#引用消息适用于所有类型)
        - [提及用户](#提及用户适用于大多数类型)
        - [转发消息](#转发消息)
        - [位置消息](#位置消息)
        - [联系人消息](#联系人消息)
        - [表情回应](#表情回应)
        - [置顶消息](#置顶消息)
        - [投票消息](#投票消息)
    - [发送带链接预览的消息](#发送带链接预览的消息)
    - [媒体消息](#媒体消息)
        - [GIF 消息](#gif-消息)
        - [视频消息](#视频消息)
        - [音频消息](#音频消息)
        - [图片消息](#图片消息)
        - [阅后即焚消息](#阅后即焚消息)
- [修改消息](#修改消息)
    - [删除消息（所有人可见）](#删除消息所有人可见)
    - [编辑消息](#编辑消息)
- [操作媒体消息](#操作媒体消息)
    - [媒体消息中的缩略图](#媒体消息中的缩略图)
    - [下载媒体消息](#下载媒体消息)
    - [重新上传媒体消息到 WhatsApp](#重新上传媒体消息到-whatsapp)
- [拒绝来电](#拒绝来电)
- [聊天状态](#聊天状态)
    - [已读消息](#已读消息)
    - [更新在线状态](#更新在线状态)
- [修改聊天](#修改聊天)
    - [归档聊天](#归档聊天)
    - [静音/取消静音聊天](#静音取消静音聊天)
    - [标记聊天已读/未读](#标记聊天已读未读)
    - [为自己删除消息](#为自己删除消息)
    - [删除聊天](#删除聊天)
    - [收藏/取消收藏消息](#收藏取消收藏消息)
    - [阅后即焚消息](#阅后即焚消息-1)
- [用户查询](#用户查询)
    - [检查 ID 是否存在于 WhatsApp](#检查-id-是否存在于-whatsapp)
    - [查询聊天历史（包括群组）](#查询聊天历史包括群组)
    - [获取状态](#获取状态)
    - [获取头像（包括群组）](#获取头像包括群组)
    - [获取商业资料（如描述或类别）](#获取商业资料如描述或类别)
    - [获取某人的在线状态（是否正在输入或在线）](#获取某人的在线状态是否正在输入或在线)
- [修改个人资料](#修改个人资料)
    - [修改个人状态](#修改个人状态)
    - [修改个人名称](#修改个人名称)
    - [修改头像（包括群组）](#修改头像包括群组)
    - [删除头像（包括群组）](#删除头像包括群组)
- [群组](#群组)
    - [创建群组](#创建群组)
    - [添加/移除或降级/提升](#添加移除或降级提升)
    - [修改群名](#修改群名)
    - [修改群描述](#修改群描述)
    - [修改群设置](#修改群设置)
    - [退出群组](#退出群组)
    - [获取邀请码](#获取邀请码)
    - [撤销邀请码](#撤销邀请码)
    - [使用邀请码加入](#使用邀请码加入)
    - [通过邀请码获取群信息](#通过邀请码获取群信息)
    - [查询元数据（成员、名称、描述等）](#查询元数据成员名称描述等)
    - [使用 groupInviteMessage 加入](#使用-groupinvitemessage-加入)
    - [获取加入请求列表](#获取加入请求列表)
    - [批准/拒绝加入请求](#批准拒绝加入请求)
    - [获取所有参与群组的元数据](#获取所有参与群组的元数据)
    - [切换阅后即焚](#切换阅后即焚)
    - [修改添加模式](#修改添加模式)
- [隐私](#隐私)
    - [拉黑/取消拉黑用户](#拉黑取消拉黑用户)
    - [获取隐私设置](#获取隐私设置)
    - [获取黑名单](#获取黑名单)
    - [更新最后上线隐私](#更新最后上线隐私)
    - [更新在线隐私](#更新在线隐私)
    - [更新头像隐私](#更新头像隐私)
    - [更新状态隐私](#更新状态隐私)
    - [更新已读回执隐私](#更新已读回执隐私)
    - [更新群组添加隐私](#更新群组添加隐私)
    - [更新默认阅后即焚模式](#更新默认阅后即焚模式)
- [广播列表和动态](#广播列表和动态)
    - [发送广播和动态](#发送广播和动态)
    - [查询广播列表的接收者和名称](#查询广播列表的接收者和名称)
- [编写自定义功能](#编写自定义功能)
    - [启用 Baileys 日志的调试级别](#启用-baileys-日志的调试级别)
    - [WhatsApp 如何与我们通信](#whatsapp-如何与我们通信)
    - [注册 WebSocket 事件回调](#注册-websocket-事件回调)

## 连接账户

WhatsApp 提供了多设备 API，允许 Baileys 通过在手机上的 WhatsApp 扫描 **二维码** 或 **配对码** 来作为第二个 WhatsApp 客户端进行认证。

> [!NOTE]
> **[这里](#入门示例)有一个简单的事件处理示例**

> [!TIP]
> **您可以在[这里](https://baileys.whiskeysockets.io/types/SocketConfig.html)查看所有支持的 socket 配置（推荐）**

### 使用**二维码**启动 socket

> [!TIP]
> 如果使用**二维码**连接，您可以自定义浏览器名称，使用 `Browser` 常量，我们有一些浏览器配置，**请参阅[这里](https://baileys.whiskeysockets.io/types/BrowsersMap.html)**

```ts
import makeWASocket from '@whiskeysockets/baileys'

const sock = makeWASocket({
    // 可以在这里提供额外配置
    browser: Browsers.ubuntu('My App'),
    printQRInTerminal: true
})
```

如果连接成功，您将在终端屏幕上看到打印的二维码，使用手机上的 WhatsApp 扫描它，您就登录了！

### 使用**配对码**启动 socket


> [!IMPORTANT]
> 配对码不是移动 API，它是一种无需二维码连接 WhatsApp Web 的方法，您只能连接一个设备，请参阅[这里](https://faq.whatsapp.com/1324084875126592/?cms_platform=web)

电话号码不能包含 `+` 或 `()` 或 `-`，只能是数字，必须提供国家代码

```ts
import makeWASocket from '@whiskeysockets/baileys'

const sock = makeWASocket({
    // 可以在这里提供额外配置
    printQRInTerminal: false // 需要设为 false
})

if (!sock.authState.creds.registered) {
    const number = 'XXXXXXXXXXX'
    const code = await sock.requestPairingCode(number)
    console.log(code)
}
```

### 接收完整历史记录

1. 将 `syncFullHistory` 设置为 `true`
2. Baileys 默认使用 Chrome 浏览器配置
    - 如果您想模拟桌面连接（并接收更多消息历史），请在 Socket 配置中使用此浏览器设置：

```ts
const sock = makeWASocket({
    ...otherOpts,
    // 也可以使用 Windows、Ubuntu
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: true
})
```

## Socket 配置重要说明

### 缓存群组元数据（推荐）
- 如果您使用 baileys 处理群组，我们建议您在 socket 配置中设置 `cachedGroupMetadata`，您需要像这样实现缓存：

    ```ts
    const groupCache = new NodeCache({stdTTL: 5 * 60, useClones: false})

    const sock = makeWASocket({
        cachedGroupMetadata: async (jid) => groupCache.get(jid)
    })

    sock.ev.on('groups.update', async ([event]) => {
        const metadata = await sock.groupMetadata(event.id)
        groupCache.set(event.id, metadata)
    })

    sock.ev.on('group-participants.update', async (event) => {
        const metadata = await sock.groupMetadata(event.id)
        groupCache.set(event.id, metadata)
    })
    ```

### 改进重试系统和解密投票
- 如果您想改进消息发送、错误重试和解密投票，您需要有一个存储并在 socket 中设置 `getMessage` 配置：
    ```ts
    const sock = makeWASocket({
        getMessage: async (key) => await getMessageFromStore(key)
    })
    ```

### 在 WhatsApp 应用中接收通知
- 如果您想在 WhatsApp 应用中接收通知，请将 `markOnlineOnConnect` 设置为 `false`
    ```ts
    const sock = makeWASocket({
        markOnlineOnConnect: false
    })
    ```

## 保存和恢复会话

您显然不想每次连接时都扫描二维码。

因此，您可以加载凭证以重新登录：
```ts
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys'

const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

// 将使用给定的状态进行连接
// 所以如果有有效的凭证 -- 它将无需二维码连接
const sock = makeWASocket({ auth: state })

// 一旦凭证更新就会调用此函数
sock.ev.on('creds.update', saveCreds)
```

> [!IMPORTANT]
> `useMultiFileAuthState` 是一个帮助将认证状态保存在单个文件夹中的实用函数，此函数可作为为 SQL/NoSQL 数据库编写认证和密钥状态的良好指南，我建议在任何生产级系统中使用。

> [!NOTE]
> 当收到/发送消息时，由于 signal 会话需要更新，认证密钥（`authState.keys`）将更新。每当发生这种情况时，您必须保存更新的密钥（调用 `authState.keys.set()`）。不这样做会阻止您的消息到达收件人并导致其他意外后果。`useMultiFileAuthState` 函数会自动处理这些，但对于任何其他严肃的实现——您需要非常小心密钥状态管理。

## 处理事件

- Baileys 使用 EventEmitter 语法处理事件。
它们都有良好的类型定义，所以在 VS Code 等智能感知编辑器中不应该有任何问题。

> [!IMPORTANT]
> **事件列表在[这里](https://baileys.whiskeysockets.io/types/BaileysEventMap.html)**，查看所有事件很重要

您可以像这样监听这些事件：
```ts
const sock = makeWASocket()
sock.ev.on('messages.upsert', ({ messages }) => {
    console.log('收到消息', messages)
})
```

### 入门示例

> [!NOTE]
> 此示例也包含基本的认证存储

> [!NOTE]
> 为了可靠地序列化认证状态，特别是存储为 JSON 时，请始终使用 BufferJSON 实用工具。

```ts
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        // 可以在这里提供额外配置
        auth: state,
        printQRInTerminal: true
    })
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('连接关闭，原因：', lastDisconnect.error, '，正在重连：', shouldReconnect)
            // 如果没有登出则重连
            if(shouldReconnect) {
                connectToWhatsApp()
            }
        } else if(connection === 'open') {
            console.log('连接已打开')
        }
    })
    sock.ev.on('messages.upsert', event => {
        for (const m of event.messages) {
            console.log(JSON.stringify(m, undefined, 2))

            console.log('回复给', m.key.remoteJid)
            await sock.sendMessage(m.key.remoteJid!, { text: 'Hello Word' })
        }
    })

    // 当凭证更新时保存（会话信息）
    sock.ev.on('creds.update', saveCreds)
}
// 在主文件中运行
connectToWhatsApp()
```

> [!IMPORTANT]
> 在 `messages.upsert` 中建议使用循环如 `for (const message of event.messages)` 来处理数组中的所有消息

### 解密投票

- 默认情况下投票是加密的，在 `messages.update` 中处理
- 这是一个简单的示例
```ts
sock.ev.on('messages.update', event => {
    for(const { key, update } of event) {
        if(update.pollUpdates) {
            const pollCreation = await getMessage(key)
            if(pollCreation) {
                console.log(
                    '收到投票更新，汇总：',
                    getAggregateVotesInPollMessage({
                        message: pollCreation,
                        pollUpdates: update.pollUpdates,
                    })
                )
            }
        }
    }
})
```

- `getMessage` 是[存储](#实现数据存储)实现（在您的端）

### 首次连接的事件摘要

1. 首次连接时，`connection.update` 将被触发，请求您重启 sock
2. 然后，历史消息将在 `messaging.history-set` 中接收

## 实现数据存储

- Baileys 没有自带聊天、联系人或消息的默认存储。但是，提供了一个简单的内存实现。存储监听聊天更新、新消息、消息更新等，以始终保持数据的最新版本。

> [!IMPORTANT]
> 我强烈建议构建您自己的数据存储，因为将某人的整个聊天历史存储在内存中是对 RAM 的极大浪费。

可以按如下方式使用：

```ts
import makeWASocket, { makeInMemoryStore } from '@whiskeysockets/baileys'
// 存储在内存中维护 WA 连接的数据
// 可以写入文件并从中读取
const store = makeInMemoryStore({ })
// 可以从文件读取
store.readFromFile('./baileys_store.json')
// 每 10 秒将状态保存到文件
setInterval(() => {
    store.writeToFile('./baileys_store.json')
}, 10_000)

const sock = makeWASocket({ })
// 将从此 socket 监听
// 一旦当前 socket 生命周期结束，存储可以从新 socket 监听
store.bind(sock.ev)

sock.ev.on('chats.upsert', () => {
    // 可以随意使用 'store.chats'，即使 socket 断开后也可以
    // 'chats' => 一个 KeyedDB 实例
    console.log('收到聊天', store.chats.all())
})

sock.ev.on('contacts.upsert', () => {
    console.log('收到联系人', Object.values(store.contacts))
})

```

存储还提供一些简单的函数，如 `loadMessages`，利用存储加速数据检索。

## WhatsApp ID 说明

- `id` 是 WhatsApp ID，也称为 `jid`，是您发送消息的人或群组的标识。
    - 格式必须是 ```[国家代码][电话号码]@s.whatsapp.net```
	    - 个人示例：```+19999999999@s.whatsapp.net```
	    - 群组格式必须是 ``` 123456789-123345@g.us ```
    - 广播列表格式是 `[创建时间戳]@broadcast`
    - 动态的 ID 是 `status@broadcast`

## 实用函数

- `getContentType`，返回任何消息的内容类型
- `getDevice`，从消息返回设备
- `makeCacheableSignalKeyStore`，使认证存储更快
- `downloadContentFromMessage`，从任何消息下载内容

## 发送消息

- 使用单个函数发送所有类型的消息
    - **在[这里](https://baileys.whiskeysockets.io/types/AnyMessageContent.html)可以看到所有支持的消息内容，如文本消息**
    - **在[这里](https://baileys.whiskeysockets.io/types/MiscMessageGenerationOptions.html)可以看到所有支持的选项，如引用消息**

    ```ts
    const jid: string
    const content: AnyMessageContent
    const options: MiscMessageGenerationOptions

    sock.sendMessage(jid, content, options)
    ```

### 非媒体消息

#### 文本消息
```ts
await sock.sendMessage(jid, { text: 'hello word' })
```

#### 引用消息（适用于所有类型）
```ts
await sock.sendMessage(jid, { text: 'hello word' }, { quoted: message })
```

#### 提及用户（适用于大多数类型）
- @number 用于在文本中提及，是可选的
```ts
await sock.sendMessage(
    jid,
    {
        text: '@12345678901',
        mentions: ['12345678901@s.whatsapp.net']
    }
)
```

#### 转发消息
- 您需要有消息对象，可以从[存储](#实现数据存储)检索或使用[消息](https://baileys.whiskeysockets.io/types/WAMessage.html)对象
```ts
const msg = getMessageFromStore() // 在您的端实现
await sock.sendMessage(jid, { forward: msg }) // WA 转发消息！
```

#### 位置消息
```ts
await sock.sendMessage(
    jid,
    {
        location: {
            degreesLatitude: 24.121231,
            degreesLongitude: 55.1121221
        }
    }
)
```

#### 联系人消息
```ts
const vcard = 'BEGIN:VCARD\n' // 联系人卡片的元数据
            + 'VERSION:3.0\n'
            + 'FN:Jeff Singh\n' // 全名
            + 'ORG:Ashoka Uni;\n' // 联系人的组织
            + 'TEL;type=CELL;type=VOICE;waid=911234567890:+91 12345 67890\n' // WhatsApp ID + 电话号码
            + 'END:VCARD'

await sock.sendMessage(
    id,
    {
        contacts: {
            displayName: 'Jeff',
            contacts: [{ vcard }]
        }
    }
)
```

#### 表情回应
- 您需要传递消息的 key，可以从[存储](#实现数据存储)检索或使用[key](https://baileys.whiskeysockets.io/types/WAMessageKey.html)对象
```ts
await sock.sendMessage(
    jid,
    {
        react: {
            text: '💖', // 使用空字符串移除表情
            key: message.key
        }
    }
)
```

#### 置顶消息
- 您需要传递消息的 key，可以从[存储](#实现数据存储)检索或使用[key](https://baileys.whiskeysockets.io/types/WAMessageKey.html)对象

- 时间可以是：

| 时间  | 秒数           |
|-------|----------------|
| 24小时 | 86.400        |
| 7天    | 604.800       |
| 30天   | 2.592.000     |

```ts
await sock.sendMessage(
    jid,
    {
        pin: {
            type: 1, // 0 取消置顶
            time: 86400
            key: message.key
        }
    }
)
```

#### 投票消息
```ts
await sock.sendMessage(
    jid,
    {
        poll: {
            name: '我的投票',
            values: ['选项 1', '选项 2', ...],
            selectableCount: 1,
            toAnnouncementGroup: false // 或 true
        }
    }
)
```

### 发送带链接预览的消息

1. 默认情况下，从网页发送时 WA 没有链接生成
2. Baileys 有一个函数来生成这些链接预览的内容
3. 要启用此功能，请使用 `bun add link-preview-js` 将 `link-preview-js` 添加为项目依赖
4. 发送链接：
```ts
await sock.sendMessage(
    jid,
    {
        text: '嗨，这是使用 https://github.com/whiskeysockets/baileys 发送的'
    }
)
```

### 媒体消息

发送媒体（视频、贴纸、图片）比以往更简单高效。

> [!NOTE]
> 在媒体消息中，您可以传递 `{ stream: Stream }` 或 `{ url: Url }` 或直接传递 `Buffer`，在[这里](https://baileys.whiskeysockets.io/types/WAMediaUpload.html)可以查看更多

- 指定媒体 URL 时，Baileys 永远不会将整个缓冲区加载到内存中；它甚至将媒体作为可读流加密。

> [!TIP]
> 建议使用 Stream 或 Url 以节省内存

#### GIF 消息
- WhatsApp 不支持 `.gif` 文件，所以我们将 gif 作为带有 `gifPlayback` 标志的普通 `.mp4` 视频发送
```ts
await sock.sendMessage(
    jid,
    {
        video: fs.readFileSync('Media/ma_gif.mp4'),
        caption: 'hello word',
        gifPlayback: true
    }
)
```

#### 视频消息
```ts
await sock.sendMessage(
    id,
    {
        video: {
            url: './Media/ma_gif.mp4'
        },
        caption: 'hello word',
	    ptv: false // 如果设为 true，将作为"视频笔记"发送
    }
)
```

#### 音频消息
- 要使音频消息在所有设备上工作，您需要使用 `ffmpeg` 等工具转换，使用以下参数：
    ```bash
        codec: libopus // ogg 文件
        ac: 1 // 单声道
        avoid_negative_ts
        make_zero
    ```
    - 示例：
    ```bash
    ffmpeg -i input.mp4 -avoid_negative_ts make_zero -ac 1 output.ogg
    ```
```ts
await sock.sendMessage(
    jid,
    {
        audio: {
            url: './Media/audio.mp3'
        },
        mimetype: 'audio/mp4'
    }
)
```

#### 图片消息
```ts
await sock.sendMessage(
    id,
    {
        image: {
            url: './Media/ma_img.png'
        },
        caption: 'hello word'
    }
)
```

#### 阅后即焚消息

- 您可以将上述所有消息作为 `viewOnce` 发送，只需在内容对象中传递 `viewOnce: true`

```ts
await sock.sendMessage(
    id,
    {
        image: {
            url: './Media/ma_img.png'
        },
        viewOnce: true, // 也适用于视频、音频
        caption: 'hello word'
    }
)
```

## 修改消息

### 删除消息（所有人可见）

```ts
const msg = await sock.sendMessage(jid, { text: 'hello word' })
await sock.sendMessage(jid, { delete: msg.key })
```

**注意：** 仅为自己删除通过 `chatModify` 支持，请参阅[这一节](#修改聊天)

### 编辑消息

- 您可以在这里传递所有可编辑的内容
```ts
await sock.sendMessage(jid, {
      text: '更新后的文本在这里',
      edit: response.key,
    });
```

## 操作媒体消息

### 媒体消息中的缩略图
- 对于媒体消息，如果您使用 `bun add jimp` 或 `bun add sharp` 添加 `jimp` 或 `sharp` 作为项目依赖，则可以自动为图片和贴纸生成缩略图。
- 视频的缩略图也可以自动生成，但您需要在系统上安装 `ffmpeg`。

### 下载媒体消息

如果您想保存收到的媒体
```ts
import { createWriteStream } from 'fs'
import { downloadMediaMessage, getContentType } from '@whiskeysockets/baileys'

sock.ev.on('messages.upsert', async ({ [m] }) => {
    if (!m.message) return // 如果没有文本或媒体消息
    const messageType = getContentType(m) // 获取消息类型（文本、图片、视频...）

    // 如果消息是图片
    if (messageType === 'imageMessage') {
        // 下载消息
        const stream = await downloadMediaMessage(
            m,
            'stream', // 也可以是 'buffer'
            { },
            {
                logger,
                // 传递这个以便 baileys 可以请求重新上传已删除的媒体
                reuploadRequest: sock.updateMediaMessage
            }
        )
        // 保存到文件
        const writeStream = createWriteStream('./my-download.jpeg')
        stream.pipe(writeStream)
    }
}
```

### 重新上传媒体消息到 WhatsApp

- WhatsApp 会自动从服务器删除旧媒体。设备要访问该媒体——需要由另一个拥有它的设备重新上传。可以使用：
```ts
await sock.updateMediaMessage(msg)
```

## 拒绝来电

- 您可以从 `call` 事件获取 `callId` 和 `callFrom`

```ts
await sock.rejectCall(callId, callFrom)
```

## 聊天状态

### 已读消息
- 现在必须显式标记一组消息[keys](https://baileys.whiskeysockets.io/types/WAMessageKey.html)为已读。
- 您不能像在 Baileys Web 中那样将整个"聊天"标记为已读。
这意味着您必须跟踪未读消息。

```ts
const key: WAMessageKey
// 也可以传递多个 keys 来将多条消息标记为已读
await sock.readMessages([key])
```

消息 ID 是您标记为已读的消息的唯一标识符。
在 `WAMessage` 上，可以使用 ```messageID = message.key.id``` 访问 `messageID`。

### 更新在线状态

- ``` presence ``` 可以是[这些](https://baileys.whiskeysockets.io/types/WAPresence.html)之一
- 在线状态大约 10 秒后过期。
- 这让具有 `jid` 的人/群组知道您是否在线、离线、正在输入等。

```ts
await sock.sendPresenceUpdate('available', jid)
```

> [!NOTE]
> 如果桌面客户端处于活动状态，WA 不会向设备发送推送通知。如果您想收到这些通知——使用 `sock.sendPresenceUpdate('unavailable')` 将 Baileys 客户端标记为离线

## 修改聊天

WA 使用加密形式的通信来发送聊天/应用更新。这已基本实现，您可以发送以下更新：

> [!IMPORTANT]
> 如果您搞砸了其中一个更新，WA 可能会将您从所有设备登出，您必须重新登录。

### 归档聊天
```ts
const lastMsgInChat = await getLastMessageInChat(jid) // 在您的端实现
await sock.chatModify({ archive: true, lastMessages: [lastMsgInChat] }, jid)
```

### 静音/取消静音聊天

- 支持的时间：

| 时间  | 毫秒            |
|-------|-----------------|
| 取消  | null            |
| 8小时 | 86.400.000      |
| 7天   | 604.800.000     |

```ts
// 静音 8 小时
await sock.chatModify({ mute: 8 * 60 * 60 * 1000 }, jid)
// 取消静音
await sock.chatModify({ mute: null }, jid)
```

### 标记聊天已读/未读
```ts
const lastMsgInChat = await getLastMessageInChat(jid) // 在您的端实现
// 标记为未读
await sock.chatModify({ markRead: false, lastMessages: [lastMsgInChat] }, jid)
```

### 为自己删除消息
```ts
await sock.chatModify(
    {
        clear: {
            messages: [
                {
                    id: 'ATWYHDNNWU81732J',
                    fromMe: true,
                    timestamp: '1654823909'
                }
            ]
        }
    },
    jid
)

```

### 删除聊天
```ts
const lastMsgInChat = await getLastMessageInChat(jid) // 在您的端实现
await sock.chatModify({
        delete: true,
        lastMessages: [
            {
                key: lastMsgInChat.key,
                messageTimestamp: lastMsgInChat.messageTimestamp
            }
        ]
    },
    jid
)
```

### 置顶/取消置顶聊天
```ts
await sock.chatModify({
        pin: true // 或 `false` 取消置顶
    },
    jid
)
```

### 收藏/取消收藏消息
```ts
await sock.chatModify({
        star: {
            messages: [
                {
                    id: 'messageID',
                    fromMe: true // 或 `false`
                }
            ],
            star: true // true: 收藏消息; false: 取消收藏
        }
    },
    jid
)
```

### 阅后即焚消息

- Ephemeral 可以是：

| 时间  | 秒数           |
|-------|----------------|
| 关闭  | 0              |
| 24小时| 86.400         |
| 7天   | 604.800        |
| 90天  | 7.776.000      |

- 您需要传入**秒数**，默认是 7 天

```ts
// 开启阅后即焚消息
await sock.sendMessage(
    jid,
    // 这是 1 周的秒数 -- 您希望消息显示多长时间
    { disappearingMessagesInChat: WA_DEFAULT_EPHEMERAL }
)

// 将作为阅后即焚消息发送
await sock.sendMessage(jid, { text: 'hello' }, { ephemeralExpiration: WA_DEFAULT_EPHEMERAL })

// 关闭阅后即焚消息
await sock.sendMessage(
    jid,
    { disappearingMessagesInChat: false }
)
```

## 用户查询

### 检查 ID 是否存在于 WhatsApp
```ts
const [result] = await sock.onWhatsApp(jid)
if (result.exists) console.log (`${jid} 存在于 WhatsApp，jid 为：${result.jid}`)
```

### 查询聊天历史（包括群组）

- 您需要有聊天中最旧的消息
```ts
const msg = await getOldestMessageInChat(jid) // 在您的端实现
await sock.fetchMessageHistory(
    50, // 数量（每次查询最多 50）
    msg.key,
    msg.messageTimestamp
)
```
- 消息将在 `messaging.history-set` 事件中接收

### 获取状态
```ts
const status = await sock.fetchStatus(jid)
console.log('状态：' + status)
```

### 获取头像（包括群组）
- 获取某人/群组的头像
```ts
// 获取低分辨率图片
const ppUrl = await sock.profilePictureUrl(jid)
console.log(ppUrl)

// 获取高分辨率图片
const ppUrl = await sock.profilePictureUrl(jid, 'image')
```

### 获取商业资料（如描述或类别）
```ts
const profile = await sock.getBusinessProfile(jid)
console.log('商业描述：' + profile.description + '，类别：' + profile.category)
```

### 获取某人的在线状态（是否正在输入或在线）
```ts
// 在这里获取并调用在线状态更新
sock.ev.on('presence.update', console.log)

// 请求聊天的更新
await sock.presenceSubscribe(jid)
```

## 修改个人资料

### 修改个人状态
```ts
await sock.updateProfileStatus('Hello World!')
```

### 修改个人名称
```ts
await sock.updateProfileName('我的名字')
```

### 修改头像（包括群组）
- 修改您或群组的头像

> [!NOTE]
> 与媒体消息一样，您可以传递 `{ stream: Stream }` 或 `{ url: Url }` 或直接传递 `Buffer`，在[这里](https://baileys.whiskeysockets.io/types/WAMediaUpload.html)可以查看更多

```ts
await sock.updateProfilePicture(jid, { url: './new-profile-picture.jpeg' })
```

### 删除头像（包括群组）
```ts
await sock.removeProfilePicture(jid)
```

## 群组

- 要修改群组属性，您需要是管理员

### 创建群组
```ts
// 标题和参与者
const group = await sock.groupCreate('我的群组', ['1234@s.whatsapp.net', '4564@s.whatsapp.net'])
console.log('创建的群组 ID：' + group.gid)
await sock.sendMessage(group.id, { text: '大家好' }) // 向群里所有人问好
```

### 添加/移除或降级/提升
```ts
// ID 和要添加到群组的人（如果失败会抛出错误）
await sock.groupParticipantsUpdate(
    jid,
    ['abcd@s.whatsapp.net', 'efgh@s.whatsapp.net'],
    'add' // 用 'remove' 或 'demote' 或 'promote' 替换此参数
)
```

### 修改群名
```ts
await sock.groupUpdateSubject(jid, '新群名！')
```

### 修改群描述
```ts
await sock.groupUpdateDescription(jid, '新描述！')
```

### 修改群设置
```ts
// 仅管理员可发消息
await sock.groupSettingUpdate(jid, 'announcement')
// 所有人可发消息
await sock.groupSettingUpdate(jid, 'not_announcement')
// 所有人可修改群设置 -- 如头像等
await sock.groupSettingUpdate(jid, 'unlocked')
// 仅管理员可修改群设置
await sock.groupSettingUpdate(jid, 'locked')
```

### 退出群组
```ts
// 如果失败会抛出错误
await sock.groupLeave(jid)
```

### 获取邀请码
- 要用代码创建链接，使用 `'https://chat.whatsapp.com/' + code`
```ts
const code = await sock.groupInviteCode(jid)
console.log('群邀请码：' + code)
```

### 撤销邀请码
```ts
const code = await sock.groupRevokeInvite(jid)
console.log('新群邀请码：' + code)
```

### 使用邀请码加入
- 代码不能包含 `https://chat.whatsapp.com/`，只能是代码
```ts
const response = await sock.groupAcceptInvite(code)
console.log('加入了：' + response)
```

### 通过邀请码获取群信息
```ts
const response = await sock.groupGetInviteInfo(code)
console.log('群信息：' + response)
```

### 查询元数据（成员、名称、描述等）
```ts
const metadata = await sock.groupMetadata(jid)
console.log(metadata.id + '，标题：' + metadata.subject + '，描述：' + metadata.desc)
```

### 使用 `groupInviteMessage` 加入
```ts
const response = await sock.groupAcceptInviteV4(jid, groupInviteMessage)
console.log('加入了：' + response)
```

### 获取加入请求列表
```ts
const response = await sock.groupRequestParticipantsList(jid)
console.log(response)
```

### 批准/拒绝加入请求
```ts
const response = await sock.groupRequestParticipantsUpdate(
    jid, // 群 ID
    ['abcd@s.whatsapp.net', 'efgh@s.whatsapp.net'],
    'approve' // 或 'reject'
)
console.log(response)
```

### 获取所有参与群组的元数据
```ts
const response = await sock.groupFetchAllParticipating()
console.log(response)
```

### 切换阅后即焚

- Ephemeral 可以是：

| 时间  | 秒数           |
|-------|----------------|
| 关闭  | 0              |
| 24小时| 86.400         |
| 7天   | 604.800        |
| 90天  | 7.776.000      |

```ts
await sock.groupToggleEphemeral(jid, 86400)
```

### 修改添加模式
```ts
await sock.groupMemberAddMode(
    jid,
    'all_member_add' // 或 'admin_add'
)
```

## 隐私

### 拉黑/取消拉黑用户
```ts
await sock.updateBlockStatus(jid, 'block') // 拉黑用户
await sock.updateBlockStatus(jid, 'unblock') // 取消拉黑
```

### 获取隐私设置
```ts
const privacySettings = await sock.fetchPrivacySettings(true)
console.log('隐私设置：' + privacySettings)
```

### 获取黑名单
```ts
const response = await sock.fetchBlocklist()
console.log(response)
```

### 更新最后上线隐私
```ts
const value = 'all' // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateLastSeenPrivacy(value)
```

### 更新在线隐私
```ts
const value = 'all' // 'match_last_seen'
await sock.updateOnlinePrivacy(value)
```

### 更新头像隐私
```ts
const value = 'all' // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateProfilePicturePrivacy(value)
```

### 更新状态隐私
```ts
const value = 'all' // 'contacts' | 'contact_blacklist' | 'none'
await sock.updateStatusPrivacy(value)
```

### 更新已读回执隐私
```ts
const value = 'all' // 'none'
await sock.updateReadReceiptsPrivacy(value)
```

### 更新群组添加隐私
```ts
const value = 'all' // 'contacts' | 'contact_blacklist'
await sock.updateGroupsAddPrivacy(value)
```

### 更新默认阅后即焚模式

- 如[这里](#阅后即焚消息-1)，ephemeral 可以是：

| 时间  | 秒数           |
|-------|----------------|
| 关闭  | 0              |
| 24小时| 86.400         |
| 7天   | 604.800        |
| 90天  | 7.776.000      |

```ts
const ephemeral = 86400
await sock.updateDefaultDisappearingMode(ephemeral)
```

## 广播列表和动态

### 发送广播和动态
- 消息可以发送到广播和动态。您需要在 sendMessage 中添加以下消息选项：
```ts
await sock.sendMessage(
    jid,
    {
        image: {
            url: url
        },
        caption: caption
    },
    {
        backgroundColor: backgroundColor,
        font: font,
        statusJidList: statusJidList,
        broadcast: true
    }
)
```
- 消息体可以是 `extendedTextMessage` 或 `imageMessage` 或 `videoMessage` 或 `voiceMessage`，请参阅[这里](https://baileys.whiskeysockets.io/types/AnyRegularMessageContent.html)
- 您可以在消息选项中添加 `backgroundColor` 和其他选项，请参阅[这里](https://baileys.whiskeysockets.io/types/MiscMessageGenerationOptions.html)
- `broadcast: true` 启用广播模式
- `statusJidList`：您需要提供的人员列表，这些人将收到此状态消息。

- 您可以像向群组和个人聊天发送消息一样向广播列表发送消息。
- 目前，WA Web 不支持创建广播列表，但您仍然可以删除它们。
- 广播 ID 格式为 `12345678@broadcast`

### 查询广播列表的接收者和名称
```ts
const bList = await sock.getBroadcastListInfo('1234@broadcast')
console.log (`列表名称：${bList.name}，接收者：${bList.recipients}`)
```

## 编写自定义功能
Baileys 在设计时就考虑了自定义功能。您无需 fork 项目并重写内部代码，只需编写自己的扩展即可。

### 启用 Baileys 日志的调试级别
首先，通过设置以下内容启用来自 WhatsApp 的未处理消息的日志记录：
```ts
const sock = makeWASocket({
    logger: P({ level: 'debug' }),
})
```
这将使您能够在控制台中看到 WhatsApp 发送的各种消息。

### WhatsApp 如何与我们通信

> [!TIP]
> 如果您想学习 WhatsApp 协议，我们建议学习 Libsignal 协议和 Noise 协议

- **示例：** 跟踪手机电池百分比的功能。启用日志记录后，您会在控制台中看到关于电池的消息：
    ```
    {
        "level": 10,
        "fromMe": false,
        "frame": {
            "tag": "ib",
            "attrs": {
                "from": "@s.whatsapp.net"
            },
            "content": [
                {
                    "tag": "edge_routing",
                    "attrs": {},
                    "content": [
                        {
                            "tag": "routing_info",
                            "attrs": {},
                            "content": {
                                "type": "Buffer",
                                "data": [8,2,8,5]
                            }
                        }
                    ]
                }
            ]
        },
        "msg":"communication"
    }
    ```

`'frame'` 是接收到的消息，它有三个组成部分：
- `tag` -- 此帧是关于什么的（例如，消息将有 'message'）
- `attrs` -- 包含一些元数据的字符串键值对（通常包含消息的 ID）
- `content` -- 实际数据（例如，消息节点将包含实际的消息内容）
- 在[这里](/src/WABinary/readme.md)阅读更多关于此格式的信息

### 注册 WebSocket 事件回调

> [!TIP]
> 建议查看 `socket.ts` 文件中的 `onMessageReceived` 函数以了解 WebSocket 事件是如何触发的

```ts
// 对于任何带有 'edge_routing' 标签的消息
sock.ws.on('CB:edge_routing', (node: BinaryNode) => { })

// 对于任何带有 'edge_routing' 标签且 id 属性 = abcd 的消息
sock.ws.on('CB:edge_routing,id:abcd', (node: BinaryNode) => { })

// 对于任何带有 'edge_routing' 标签、id 属性 = abcd 且第一个内容节点为 routing_info 的消息
sock.ws.on('CB:edge_routing,id:abcd,routing_info', (node: BinaryNode) => { })
```

# 许可证
版权所有 (c) 2025 Rajeh Taher/WhiskeySockets

根据 MIT 许可证授权：
特此免费授予任何获得本软件及相关文档文件（"软件"）副本的人，无限制地处理本软件的权利，包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或出售软件副本的权利，以及允许获得软件的人员这样做，但须符合以下条件：

上述版权声明和本许可声明应包含在软件的所有副本或主要部分中。

本软件按"原样"提供，不作任何明示或暗示的保证，包括但不限于对适销性、特定用途适用性和非侵权的保证。在任何情况下，作者或版权持有人均不对任何索赔、损害或其他责任负责，无论是在合同诉讼、侵权行为或其他方面，由软件或软件的使用或其他交易引起或与之相关。

因此，项目维护者对本项目的任何潜在滥用不承担任何责任。
