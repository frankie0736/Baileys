# Baileys 部署指南

本文档介绍如何在生产环境部署 Baileys WhatsApp Gateway。

## 目录

- [服务器要求](#服务器要求)
- [环境安装](#环境安装)
- [项目部署](#项目部署)
- [进程管理](#进程管理)
- [多账号部署](#多账号部署)
- [反向代理](#反向代理)
- [监控与维护](#监控与维护)
- [常见问题](#常见问题)

---

## 服务器要求

### 配置推荐

| 账号数 | CPU | 内存 | 月费参考 |
|-------|-----|------|---------|
| 1-10 | 1核 | 2G | $5-10 |
| 10-50 | 2核 | 4G | $20-30 |
| 50-100 | 4核 | 8G | $40-60 |
| 100+ | 分布式部署 | - | - |

### 服务商推荐

- **海外**：Vultr、DigitalOcean、Linode（$5-6/月起）
- **国内**：腾讯云轻量、阿里云轻量（注意：需要稳定的国际网络连接 WhatsApp）

### 系统要求

- Ubuntu 22.04 LTS（推荐）或 Debian 12
- 开放端口：22（SSH）、3001（Gateway API，可改）

---

## 环境安装

### 1. 更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. 安装 Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# 验证安装
bun --version
```

### 3. 安装 pm2

```bash
bun add -g pm2

# 验证安装
pm2 --version
```

### 4. 安装 Git

```bash
sudo apt install git -y
```

---

## 项目部署

### 1. 克隆项目

```bash
cd ~
git clone https://github.com/frankie0736/Baileys.git
cd Baileys
```

### 2. 安装依赖

```bash
bun install
```

### 3. 首次登录（获取认证凭证）

有两种方式：

#### 方式 A：配对码登录（推荐，服务器上直接操作）

```bash
bun run example --use-pairing-code
```

按提示输入手机号，然后在 WhatsApp 手机端：
设置 → 已关联的设备 → 关联设备 → 输入配对码

#### 方式 B：本地登录后上传

```bash
# 本地电脑
bun run example
# 扫码登录后，Ctrl+C 停止

# 上传认证目录到服务器
scp -r baileys_auth_info user@your-server:~/Baileys/
```

### 4. 测试运行

```bash
bun run ./Example/gateway.ts
```

看到 `✅ WhatsApp 已连接!` 表示成功。按 Ctrl+C 停止。

---

## 进程管理

### 使用 pm2 启动

```bash
cd ~/Baileys

# 启动 Gateway
pm2 start "bun run ./Example/gateway.ts" --name wa-gateway

# 启动 Webhook 服务（如果需要）
pm2 start "bun run ./Example/webhook-server.ts" --name wa-webhook
```

### pm2 常用命令

```bash
pm2 list                  # 查看所有进程
pm2 logs wa-gateway       # 查看日志
pm2 logs wa-gateway --lines 100  # 查看最近100行日志

pm2 restart wa-gateway    # 重启
pm2 stop wa-gateway       # 停止
pm2 delete wa-gateway     # 删除

pm2 monit                 # 实时监控面板
```

### 设置开机自启

```bash
pm2 startup
# 按提示执行输出的命令

pm2 save   # 保存当前进程列表
```

---

## 多账号部署

### 方案 1：单机多账号

使用环境变量区分不同账号：

```bash
# 账号 A - 端口 3001
AUTH_DIR=auth_account_a PORT=3001 pm2 start "bun run ./Example/gateway.ts" --name wa-a

# 账号 B - 端口 3002
AUTH_DIR=auth_account_b PORT=3002 pm2 start "bun run ./Example/gateway.ts" --name wa-b

# 账号 C - 端口 3003
AUTH_DIR=auth_account_c PORT=3003 pm2 start "bun run ./Example/gateway.ts" --name wa-c
```

### 方案 2：使用 ecosystem 配置文件

创建 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      name: 'wa-account-1',
      script: './Example/gateway.ts',
      interpreter: 'bun',
      env: {
        AUTH_DIR: 'auth_account_1',
        PORT: 3001,
        WEBHOOK_URL: 'http://localhost:4000/webhook'
      }
    },
    {
      name: 'wa-account-2',
      script: './Example/gateway.ts',
      interpreter: 'bun',
      env: {
        AUTH_DIR: 'auth_account_2',
        PORT: 3002,
        WEBHOOK_URL: 'http://localhost:4000/webhook'
      }
    },
    {
      name: 'wa-account-3',
      script: './Example/gateway.ts',
      interpreter: 'bun',
      env: {
        AUTH_DIR: 'auth_account_3',
        PORT: 3003,
        WEBHOOK_URL: 'http://localhost:4000/webhook'
      }
    }
  ]
}
```

启动所有账号：

```bash
pm2 start ecosystem.config.cjs
```

### 方案 3：批量启动脚本

创建 `scripts/start-accounts.sh`：

```bash
#!/bin/bash

# 账号数量
ACCOUNT_COUNT=10
BASE_PORT=3001

for i in $(seq 1 $ACCOUNT_COUNT); do
  PORT=$((BASE_PORT + i - 1))
  AUTH_DIR="auth_account_$i"
  NAME="wa-$i"

  AUTH_DIR=$AUTH_DIR PORT=$PORT pm2 start "bun run ./Example/gateway.ts" --name $NAME

  echo "Started $NAME on port $PORT with auth dir $AUTH_DIR"
done

pm2 save
```

运行：

```bash
chmod +x scripts/start-accounts.sh
./scripts/start-accounts.sh
```

---

## 反向代理

### 使用 Nginx（推荐用于外网访问）

#### 安装 Nginx

```bash
sudo apt install nginx -y
```

#### 配置反向代理

创建 `/etc/nginx/sites-available/wa-gateway`：

```nginx
# 单账号配置
server {
    listen 80;
    server_name wa-api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# 多账号配置（按路径区分）
server {
    listen 80;
    server_name wa-api.yourdomain.com;

    location /account1/ {
        rewrite ^/account1/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3001;
    }

    location /account2/ {
        rewrite ^/account2/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3002;
    }

    location /account3/ {
        rewrite ^/account3/(.*) /$1 break;
        proxy_pass http://127.0.0.1:3003;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/wa-gateway /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 添加 HTTPS（使用 Certbot）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d wa-api.yourdomain.com
```

### 使用 Cloudflare Tunnel（无需开放端口）

```bash
# 安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# 登录
cloudflared tunnel login

# 创建隧道
cloudflared tunnel create wa-gateway

# 配置隧道
cloudflared tunnel route dns wa-gateway wa-api.yourdomain.com

# 运行
cloudflared tunnel run --url http://localhost:3001 wa-gateway
```

---

## 监控与维护

### 日志管理

```bash
# 实时查看日志
pm2 logs

# 查看特定进程
pm2 logs wa-gateway --lines 200

# 日志文件位置
ls ~/.pm2/logs/
```

### 内存监控

```bash
# 实时监控
pm2 monit

# 查看资源使用
pm2 list
```

### 设置内存限制自动重启

```bash
pm2 start "bun run ./Example/gateway.ts" --name wa-gateway --max-memory-restart 500M
```

### 定时重启（可选）

```bash
# 每天凌晨 4 点重启
pm2 start "bun run ./Example/gateway.ts" --name wa-gateway --cron-restart="0 4 * * *"
```

### 健康检查

创建 `scripts/health-check.sh`：

```bash
#!/bin/bash

GATEWAY_URL="http://localhost:3001"

response=$(curl -s -o /dev/null -w "%{http_code}" $GATEWAY_URL)

if [ $response -eq 200 ]; then
    echo "Gateway is healthy"
else
    echo "Gateway is down, restarting..."
    pm2 restart wa-gateway
fi
```

添加到 crontab：

```bash
crontab -e
# 添加：每 5 分钟检查一次
*/5 * * * * /root/Baileys/scripts/health-check.sh >> /var/log/wa-health.log 2>&1
```

---

## 常见问题

### 1. 连接不上 WhatsApp

**可能原因：**
- 服务器网络无法访问 WhatsApp 服务器
- 防火墙阻止了出站连接

**解决方案：**
```bash
# 测试连接
curl -I https://web.whatsapp.com

# 如果不通，检查防火墙
sudo ufw status
```

### 2. 频繁断线重连

**可能原因：**
- 网络不稳定
- 内存不足

**解决方案：**
```bash
# 检查内存
free -h

# 检查日志
pm2 logs wa-gateway --lines 500
```

### 3. 被 WhatsApp 封号

**预防措施：**
- 不要发送垃圾消息
- 控制发送频率（建议每条消息间隔 1-3 秒）
- 不要批量添加联系人
- 使用真实的业务场景

### 4. 认证失效需要重新登录

```bash
# 停止进程
pm2 stop wa-gateway

# 删除旧认证
rm -rf auth_account_xxx/

# 重新登录
bun run example --use-pairing-code
# 登录成功后 Ctrl+C

# 重启
pm2 start wa-gateway
```

### 5. 更新项目

```bash
cd ~/Baileys
pm2 stop all
git pull
bun install
pm2 start all
```

---

## 目录结构参考

```
~/Baileys/
├── Example/
│   ├── gateway.ts          # Gateway 服务
│   ├── webhook-server.ts   # Webhook 接收服务
│   └── example.ts          # 完整示例
├── auth_account_1/         # 账号 1 认证数据
├── auth_account_2/         # 账号 2 认证数据
├── auth_account_3/         # 账号 3 认证数据
├── ecosystem.config.cjs    # pm2 配置文件
├── scripts/
│   ├── start-accounts.sh   # 批量启动脚本
│   └── health-check.sh     # 健康检查脚本
└── docs/
    ├── USAGE_GUIDE.md      # 使用指南
    └── DEPLOYMENT_GUIDE.md # 部署指南（本文档）
```

---

## 快速命令参考

```bash
# 启动
pm2 start ecosystem.config.cjs

# 查看状态
pm2 list

# 查看日志
pm2 logs

# 重启所有
pm2 restart all

# 停止所有
pm2 stop all

# 保存配置
pm2 save

# 开机自启
pm2 startup && pm2 save
```
