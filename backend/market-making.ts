/**
 * FlowX Market Making System - 专业做市策略
 * 包含 AMM 做市、Order Book 做市、套利策略
 * @author FlowX Team - Xuning Tech AI
 */

// ============ 做市策略类型 ============

enum MarketMakingStrategy {
  AMM_LIQUIDITY = 'AMM_LIQUIDITY',      // AMM 流动性提供
  ORDER_BOOK_MM = 'ORDER_BOOK_MM',      // 订单簿做市
  ARBITRAGE = 'ARBITRAGE'               // 跨交易所套利
}

interface Position {
  symbol: string;
  baseAmount: number;
  quoteAmount: number;
  avgEntryPrice: number;
  timestamp: number;
}

interface MMConfig {
  strategy: MarketMakingStrategy;
  symbol: string;
  spread: number;           // 点差 (0.001 = 0.1%)
  maxInventory: number;     // 最大持仓
  minInventory: number;     // 最小持仓
  orderSize: number;        // 单笔订单大小
  layers: number;           // 挂单层次
  layerSpread: number;      // 层次间距
  stopLoss: number;         // 止损比例
  rebalanceThreshold: number; // 再平衡阈值
}

// ============ 做市引擎 ============

class MarketMakingEngine {
  private config: MMConfig;
  private position: Position | null;
  private activeOrders: Map<string, any>;
  private pnl: number;
  private tradeCount: number;

  constructor(config: MMConfig) {
    this.config = config;
    this.position = null;
    this.activeOrders = new Map();
    this.pnl = 0;
    this.tradeCount = 0;
  }

  // ============ AMM 做市策略 ============

  calculateAMMPrices(
    reserveBase: number,
    reserveQuote: number,
    amountIn: number,
    isInBase: boolean
  ): { price: number; amountOut: number; priceImpact: number } {
    // 恒定乘积公式: x * y = k
    const k = reserveBase * reserveQuote;
    
    if (isInBase) {
      const newReserveBase = reserveBase + amountIn;
      const newReserveQuote = k / newReserveBase;
      const amountOut = reserveQuote - newReserveQuote;
      const price = amountOut / amountIn;
      const spotPrice = reserveQuote / reserveBase;
      const priceImpact = (spotPrice - price) / spotPrice;
      
      return { price, amountOut, priceImpact };
    } else {
      const newReserveQuote = reserveQuote + amountIn;
      const newReserveBase = k / newReserveQuote;
      const amountOut = reserveBase - newReserveBase;
      const price = amountIn / amountOut;
      const spotPrice = reserveQuote / reserveBase;
      const priceImpact = (price - spotPrice) / spotPrice;
      
      return { price, amountOut, priceImpact };
    }
  }

  // 计算最优流动性范围（集中流动性）
  calculateOptimalLiquidityRange(
    currentPrice: number,
    volatility: number,
    confidenceLevel: number = 0.95
  ): { lowerPrice: number; upperPrice: number } {
    // 基于波动率计算价格区间
    const zScore = 1.96;  // 95% 置信区间
    const priceRange = volatility * zScore;
    
    return {
      lowerPrice: currentPrice * (1 - priceRange),
      upperPrice: currentPrice * (1 + priceRange)
    };
  }

  // ============ Order Book 做市策略 ============

  generateOrderBookLayers(
    midPrice: number,
    baseSize: number
  ): { bids: [number, number][], asks: [number, number][] } {
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    // 库存调整因子
    const inventoryFactor = this.getInventoryFactor();

    for (let i = 0; i < this.config.layers; i++) {
      const spread = this.config.spread * (1 + i * this.config.layerSpread);
      const size = baseSize * (1 + i * 0.5);  // 每层增加 50%

      // 买单：根据库存调整
      const bidPrice = midPrice * (1 - spread);
      const bidSize = size * (1 + inventoryFactor);  // 库存少时多买
      bids.push([bidPrice, bidSize]);

      // 卖单：根据库存调整
      const askPrice = midPrice * (1 + spread);
      const askSize = size * (1 - inventoryFactor);  // 库存多时多卖
      asks.push([askPrice, askSize]);
    }

    return { bids, asks };
  }

  // 库存调整因子 (-1 到 1)
  private getInventoryFactor(): number {
    if (!this.position) return 0;

    const totalValue = this.position.baseAmount + this.position.quoteAmount;
    if (totalValue === 0) return 0;

    const baseRatio = this.position.baseAmount / totalValue;
    const targetRatio = 0.5;  // 目标 50/50

    // 标准化到 -1 到 1
    return (baseRatio - targetRatio) * 2;
  }

  // ============ 套利策略 ============

  detectArbitrageOpportunity(
    prices: Map<string, number>,  // exchange -> price
    fees: Map<string, number>     // exchange -> fee
  ): { buyExchange: string; sellExchange: string; profit: number } | null {
    let bestOpportunity = null;
    let maxProfit = 0;

    const exchanges = Array.from(prices.keys());

    for (let i = 0; i < exchanges.length; i++) {
      for (let j = 0; j < exchanges.length; j++) {
        if (i === j) continue;

        const buyExchange = exchanges[i];
        const sellExchange = exchanges[j];
        const buyPrice = prices.get(buyExchange)!;
        const sellPrice = prices.get(sellExchange)!;
        const buyFee = fees.get(buyExchange)!;
        const sellFee = fees.get(sellExchange)!;

        // 计算净利润（扣除手续费）
        const grossProfit = (sellPrice - buyPrice) / buyPrice;
        const totalFee = buyFee + sellFee;
        const netProfit = grossProfit - totalFee;

        if (netProfit > maxProfit && netProfit > 0.001) {  // 最小 0.1% 利润
          maxProfit = netProfit;
          bestOpportunity = {
            buyExchange,
            sellExchange,
            profit: netProfit
          };
        }
      }
    }

    return bestOpportunity;
  }

  // 执行套利
  async executeArbitrage(
    opportunity: { buyExchange: string; sellExchange: string; profit: number },
    amount: number
  ): Promise<{ success: boolean; actualProfit: number }> {
    // 实际实现需要调用交易所 API
    // 这里返回模拟结果
    const estimatedProfit = amount * opportunity.profit;
    
    // 风险控制：检查滑点和执行风险
    if (estimatedProfit < 10) {  // 最小利润$10
      return { success: false, actualProfit: 0 };
    }

    return {
      success: true,
      actualProfit: estimatedProfit * 0.9  // 10% 执行误差
    };
  }

  // ============ 风险管理 ============

  checkRiskLimits(): { canTrade: boolean; reason?: string } {
    if (!this.position) {
      return { canTrade: true };
    }

    // 检查持仓限制
    if (this.position.baseAmount > this.config.maxInventory) {
      return {
        canTrade: false,
        reason: 'Exceeded maximum inventory limit'
      };
    }

    if (this.position.baseAmount < this.config.minInventory) {
      return {
        canTrade: false,
        reason: 'Below minimum inventory limit'
      };
    }

    // 检查止损
    if (this.position.avgEntryPrice > 0) {
      const currentPnL = this.calculatePnL();
      if (currentPnL < -this.config.stopLoss * this.position.baseAmount) {
        return {
          canTrade: false,
          reason: 'Stop loss triggered'
        };
      }
    }

    return { canTrade: true };
  }

  // 计算未实现盈亏
  calculatePnL(currentPrice?: number): number {
    if (!this.position || !currentPrice) return 0;
    
    const currentValue = this.position.baseAmount * currentPrice + this.position.quoteAmount;
    const initialValue = this.position.baseAmount * this.position.avgEntryPrice + this.position.quoteAmount;
    
    return currentValue - initialValue;
  }

  // 再平衡持仓
  rebalance(currentPrice: number): { action: 'BUY' | 'SELL'; amount: number } | null {
    if (!this.position) return null;

    const totalValue = this.position.baseAmount * currentPrice + this.position.quoteAmount;
    const targetBaseValue = totalValue * 0.5;  // 50/50 目标
    const currentBaseValue = this.position.baseAmount * currentPrice;

    const deviation = Math.abs(currentBaseValue - targetBaseValue) / totalValue;

    if (deviation > this.config.rebalanceThreshold) {
      if (currentBaseValue > targetBaseValue) {
        // 卖出多余的 base
        const sellAmount = (currentBaseValue - targetBaseValue) / currentPrice;
        return { action: 'SELL', amount: sellAmount };
      } else {
        // 买入不足的 base
        const buyAmount = (targetBaseValue - currentBaseValue) / currentPrice;
        return { action: 'BUY', amount: buyAmount };
      }
    }

    return null;
  }

  // ============ 性能统计 ============

  getStats(): {
    totalTrades: number;
    totalPnL: number;
    winRate: number;
    avgProfit: number;
    sharpeRatio: number;
  } {
    return {
      totalTrades: this.tradeCount,
      totalPnL: this.pnl,
      winRate: 0.65,  // 模拟数据
      avgProfit: this.tradeCount > 0 ? this.pnl / this.tradeCount : 0,
      sharpeRatio: 1.5  // 模拟数据
    };
  }
}

export { MarketMakingEngine, MarketMakingStrategy };
export type { MMConfig, Position };
