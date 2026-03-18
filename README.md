# FlowX 🚀

> **下一代 CEX+DEX 混合交易所** - 类 Binance 的体验，类 1inch 的聚合能力

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![Solidity](https://img.shields.io/badge/solidity-^0.8.19-blue.svg)](https://soliditylang.org)

---

## 📖 目录

- [项目介绍](#-项目介绍)
- [核心特性](#-核心特性)
- [技术架构](#-技术架构)
- [快速开始](#-快速开始)
- [模块说明](#-模块说明)
- [代币经济](#-代币经济)
- [开发指南](#-开发指南)
- [融资信息](#-融资信息)
- [联系方式](#-联系方式)

---

## 🎯 项目介绍

**FlowX** 是由**旭宁科技（Xuning Tech AI）**打造的创新型混合交易所，完美结合了：

| CEX 优势 | DEX 优势 |
|----------|----------|
| ⚡ 毫秒级撮合 | 🔓 自托管交易 |
| 💵 法币出入金 | 🌐 多链支持 |
| 📊 深度流动性 | 🔍 透明可验证 |
| 🛠️ 专业工具 | 🏦 无需许可 |

### 核心指标

- 🚀 撮合延迟 **<1ms**
- 💰 交易手续费 **0.1%**
- 🔗 支持 **5+** 主流公链
- 📈 做市年化 **15-35%**

---

## ✨ 核心特性

### 1. 混合交易引擎

```
┌─────────────────────────────────────────────────────────┐
│                    FlowX 混合引擎                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   CEX 模式          混合路由          DEX 模式          │
│   ┌─────┐          ┌─────┐          ┌─────┐           │
│   │订单簿│    ──▶   │智能  │    ──▶   │聚合  │           │
│   │撮合  │          │切换  │          │交换  │           │
│   └─────┘          └─────┘          └─────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. 多链聚合

支持区块链：
- 🟦 Ethereum (ERC-20)
- 🟨 BSC (BEP-20)
- 🟣 Polygon
- 🔵 Arbitrum
- 🔴 Optimism

### 3. 做市系统

| 策略类型 | 预期年化 | 风险等级 |
|----------|----------|----------|
| AMM 流动性 | 15-25% | 🟢 低 |
| 订单簿做市 | 20-35% | 🟡 中 |
| 跨所套利 | 10-20% | 🟢 低 |

### 4. 代币 FLX

```
总供应量：1,000,000,000 FLX

分配:
├── 团队 15% (3 年解锁)
├── 投资人 20% (2 年解锁)
├── 社区 30% (空投 + 挖矿)
├── 生态 25% (DAO 治理)
└── 流动性 10% (做市储备)
```

---

## 🏗️ 技术架构

### 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         FlowX 系统                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  前端层                    后端层                  基础设施层    │
│  ┌──────────┐             ┌──────────┐            ┌──────────┐ │
│  │   Web    │             │  API     │            │PostgreSQL│ │
│  │  (React) │◀───────────▶│  Gateway │◀──────────▶│          │ │
│  └──────────┘             └──────────┘            └──────────┘ │
│  ┌──────────┐             ┌──────────┐            ┌──────────┐ │
│  │  Mobile  │             │ Matching │            │  Redis   │ │
│  │   (RN)   │◀───────────▶│  Engine  │◀──────────▶│          │ │
│  └──────────┘             └──────────┘            └──────────┘ │
│  ┌──────────┐             ┌──────────┐            ┌──────────┐ │
│  │   API    │             │   DEX    │            │  Kafka   │ │
│  │ Clients  │◀───────────▶│Aggregator│◀──────────▶│          │ │
│  └──────────┘             └──────────┘            └──────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 项目结构

```
flowx/
├── backend/                # 后端服务
│   ├── matching-engine.ts  # 撮合引擎
│   ├── dex-aggregator.ts   # DEX 聚合器
│   ├── market-making.ts    # 做市系统
│   └── api/                # REST/WS API
├── frontend/               # 前端应用
│   ├── web/                # Web 端 (Next.js)
│   └── mobile/             # 移动端 (React Native)
├── contracts/              # 智能合约
│   ├── FlowXToken.sol      # FLX 代币合约
│   ├── FlowXSwap.sol       # 交换合约
│   └── tests/              # 合约测试
├── docs/                   # 文档
│   ├── WHITEPAPER.md       # 白皮书
│   └── API.md              # API 文档
└── scripts/                # 部署脚本
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL >= 14
- Redis >= 7

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/lliujan2000/flowx.git
cd flowx

# 安装依赖
pnpm install

# 安装合约依赖
cd contracts && pnpm install
```

### 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
# - DATABASE_URL: PostgreSQL 连接
# - REDIS_URL: Redis 连接
# - JWT_SECRET: JWT 密钥
```

### 启动服务

```bash
# 启动后端
cd backend && pnpm dev

# 启动前端
cd frontend/web && pnpm dev

# 启动做市机器人
cd backend && pnpm market-maker
```

### 部署合约

```bash
# 编译合约
cd contracts && pnpm build

# 测试合约
pnpm test

# 部署到测试网
pnpm deploy:goerli

# 部署到主网
pnpm deploy:mainnet
```

---

## 📦 模块说明

### 1. 撮合引擎 (Matching Engine)

**位置**: `backend/matching-engine.ts`

```typescript
// 创建撮合引擎
const engine = new MatchingEngine();

// 初始化交易对
engine.initOrderBook('BTC/USDT');

// 提交订单
const result = engine.submitOrder({
  orderId: 'ORD-001',
  userId: 'user-123',
  symbol: 'BTC/USDT',
  side: 'BUY',
  type: 'LIMIT',
  price: 50000,
  quantity: 0.1
});
```

**特性**:
- ⚡ 内存撮合 (<1ms)
- 📊 价格优先 + 时间优先
- 🔄 支持限价/市价单

### 2. DEX 聚合器 (DEX Aggregator)

**位置**: `backend/dex-aggregator.ts`

```typescript
// 创建聚合器
const aggregator = new DEXAggregator(provider, wallet);

// 获取报价
const quote = await aggregator.getQuote(
  USDC_ADDRESS,
  ETH_ADDRESS,
  '1000'  // 1000 USDC
);

// 执行交换
const result = await aggregator.swap(
  USDC_ADDRESS,
  ETH_ADDRESS,
  '1000',
  0.005  // 0.5% 滑点
);
```

**特性**:
- 🔍 多 DEX 比价
- 🛣️ 最优路径查找
- 💰 Gas 优化

### 3. 做市系统 (Market Making)

**位置**: `backend/market-making.ts`

```typescript
// 创建做市引擎
const mm = new MarketMakingEngine({
  strategy: MarketMakingStrategy.ORDER_BOOK_MM,
  symbol: 'BTC/USDT',
  spread: 0.002,  // 0.2% 点差
  layers: 5,      // 5 层挂单
  orderSize: 0.1  // 每单 0.1 BTC
});

// 生成挂单
const orders = mm.generateOrderBookLayers(50000, 0.1);
```

**特性**:
- 📈 自动化做市
- 🛡️ 风险控制
- 📊 实时统计

### 4. 智能合约

**FlowXToken.sol** - FLX 代币合约
- ERC-20 标准
- 投票治理
- 线性解锁

**FlowXSwap.sol** - 交换合约
- 多 DEX 路由
- 平台费收取
- 交易统计

---

## 💰 代币经济

### FLX 代币信息

| 属性 | 值 |
|------|-----|
| 名称 | FlowX Token |
| 符号 | FLX |
| 总量 | 1,000,000,000 |
| 链 | Ethereum (ERC-20) |
| 精度 | 18 |

### 代币效用

1. **交易费折扣** - 持有 FLX 享 50% 折扣
2. **治理投票** - 参与平台决策
3. **Staking 奖励** - 质押获得收益分成
4. **空投资格** - 优先获得新币空投

### 收益分配

```
平台月收入:
├── 40% → FLX 回购销毁 🔥
├── 30% → Staking 奖励 🎁
├── 20% → 团队运营 👥
└── 10% → 生态基金 🌱
```

---

## 🛠️ 开发指南

### API 示例

```bash
# 获取订单簿
curl https://api.flowx.io/api/v1/orderbook/BTC/USDT

# 提交订单
curl -X POST https://api.flowx.io/api/v1/order \
  -H "Authorization: Bearer <token>" \
  -d '{"symbol":"BTC/USDT","side":"BUY","price":50000,"quantity":0.1}'

# 获取交易历史
curl https://api.flowx.io/api/v1/trades?symbol=BTC/USDT
```

### WebSocket 订阅

```javascript
const ws = new WebSocket('wss://ws.flowx.io');

ws.onopen = () => {
  // 订阅订单簿
  ws.send(JSON.stringify({
    action: 'subscribe',
    channel: 'orderbook',
    symbol: 'BTC/USDT'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Order book update:', data);
};
```

### 合约交互

```javascript
import { ethers } from 'ethers';
import FlowXSwap from './abis/FlowXSwap.json';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const swap = new ethers.Contract(SWAP_ADDRESS, FlowXSwap.abi, wallet);

// 执行交换
await swap.swap(
  tokenIn,
  tokenOut,
  amountIn,
  minAmountOut,
  router,
  path
);
```

---

## 💼 融资信息

### 融资轮次

| 轮次 | 金额 | 估值 | 状态 |
|------|------|------|------|
| 种子轮 | $2M | $10M | 🟢 开放中 |
| 私募轮 | $5M | $25M | ⚪ 筹备中 |
| 公募轮 | $3M | $50M | ⚪ 计划中 |

### 投资亮点

✅ 混合交易所蓝海市场
✅ 顶级交易所团队背景
✅ 已验证的技术方案
✅ 清晰盈利模式
✅ 通缩代币经济

### 联系我们

📧 投资咨询：invest@flowx.io
📄 白皮书：[WHITEPAPER.md](WHITEPAPER.md)

---

## 📞 联系方式

| 渠道 | 链接 |
|------|------|
| 🌐 官网 | https://flowx.io |
| 🐦 Twitter | @FlowX_Exchange |
| 💬 Telegram | @flowx_official |
| 📧 邮箱 | contact@flowx.io |
| 📚 文档 | https://docs.flowx.io |

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## ⚠️ 风险提示

⚠️ **加密货币交易存在高风险**，可能导致本金损失。请在充分了解风险后参与。

本项目不构成投资建议。某些司法管辖区可能对加密货币交易有限制，请遵守当地法律法规。

---

**Built with ❤️ by 旭宁科技 (Xuning Tech AI)**

© 2026 FlowX. All rights reserved.
