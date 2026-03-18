/**
 * FlowX Matching Engine - 高性能订单撮合引擎
 * @author FlowX Team - Xuning Tech AI
 * @version 1.0.0
 */

// ============ 数据结构 ============

interface Order {
  orderId: string;
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: number;
  quantity: number;
  filled: number;
  timestamp: number;
}

interface OrderBook {
  symbol: string;
  bids: Map<number, Order[]>;  // 买单队列 (价格降序)
  asks: Map<number, Order[]>;  // 卖单队列 (价格升序)
  lastUpdate: number;
}

interface Trade {
  tradeId: string;
  symbol: string;
  buyerId: string;
  sellerId: string;
  price: number;
  quantity: number;
  timestamp: number;
}

// ============ 撮合引擎核心 ============

class MatchingEngine {
  private orderBooks: Map<string, OrderBook>;
  private tradeQueue: Trade[];
  private eventEmitter: any;

  constructor() {
    this.orderBooks = new Map();
    this.tradeQueue = [];
    this.eventEmitter = null;
  }

  // 初始化交易对
  initOrderBook(symbol: string): void {
    this.orderBooks.set(symbol, {
      symbol,
      bids: new Map(),
      asks: new Map(),
      lastUpdate: Date.now()
    });
  }

  // 提交订单
  submitOrder(order: Order): { filled: boolean; trades: Trade[] } {
    const orderBook = this.orderBooks.get(order.symbol);
    if (!orderBook) {
      throw new Error(`Order book ${order.symbol} not found`);
    }

    const trades: Trade[] = [];

    if (order.side === 'BUY') {
      // 买单：匹配卖单
      trades.push(...this.matchBuyOrder(order, orderBook));
    } else {
      // 卖单：匹配买单
      trades.push(...this.matchSellOrder(order, orderBook));
    }

    // 未完全成交的订单加入订单簿
    if (order.filled < order.quantity) {
      this.addToOrderBook(order, orderBook);
    }

    // 发送成交通知
    trades.forEach(trade => {
      this.emitTrade(trade);
    });

    return {
      filled: order.filled >= order.quantity,
      trades
    };
  }

  // 匹配买单
  private matchBuyOrder(order: Order, orderBook: OrderBook): Trade[] {
    const trades: Trade[] = [];
    const askPrices = Array.from(orderBook.asks.keys()).sort((a, b) => a - b);

    for (const price of askPrices) {
      if (order.filled >= order.quantity) break;

      const askQueue = orderBook.asks.get(price)!;
      
      for (let i = 0; i < askQueue.length; i++) {
        const askOrder = askQueue[i];
        const matchQty = Math.min(
          order.quantity - order.filled,
          askOrder.quantity - askOrder.filled
        );

        const trade: Trade = {
          tradeId: this.generateTradeId(),
          symbol: order.symbol,
          buyerId: order.userId,
          sellerId: askOrder.userId,
          price,
          quantity: matchQty,
          timestamp: Date.now()
        };

        trades.push(trade);
        order.filled += matchQty;
        askOrder.filled += matchQty;

        this.tradeQueue.push(trade);
      }

      // 清理已完成的卖单
      orderBook.asks.set(
        price,
        askQueue.filter(o => o.filled < o.quantity)
      );
    }

    return trades;
  }

  // 匹配卖单
  private matchSellOrder(order: Order, orderBook: OrderBook): Trade[] {
    const trades: Trade[] = [];
    const bidPrices = Array.from(orderBook.bids.keys()).sort((a, b) => b - a);

    for (const price of bidPrices) {
      if (price < order.price) break;  // 价格不匹配
      if (order.filled >= order.quantity) break;

      const bidQueue = orderBook.bids.get(price)!;
      
      for (let i = 0; i < bidQueue.length; i++) {
        const bidOrder = bidQueue[i];
        const matchQty = Math.min(
          order.quantity - order.filled,
          bidOrder.quantity - bidOrder.filled
        );

        const trade: Trade = {
          tradeId: this.generateTradeId(),
          symbol: order.symbol,
          buyerId: bidOrder.userId,
          sellerId: order.userId,
          price,
          quantity: matchQty,
          timestamp: Date.now()
        };

        trades.push(trade);
        order.filled += matchQty;
        bidOrder.filled += matchQty;

        this.tradeQueue.push(trade);
      }

      // 清理已完成的买单
      orderBook.bids.set(
        price,
        bidQueue.filter(o => o.filled < o.quantity)
      );
    }

    return trades;
  }

  // 添加订单到订单簿
  private addToOrderBook(order: Order, orderBook: OrderBook): void {
    const queue = order.side === 'BUY' ? orderBook.bids : orderBook.asks;
    
    if (!queue.has(order.price)) {
      queue.set(order.price, []);
    }
    
    queue.get(order.price)!.push(order);
    
    // 排序：买单降序，卖单升序
    if (order.side === 'BUY') {
      const prices = Array.from(queue.keys()).sort((a, b) => b - a);
      const sorted = new Map();
      prices.forEach(p => sorted.set(p, queue.get(p)!));
      orderBook.bids = sorted;
    } else {
      const prices = Array.from(queue.keys()).sort((a, b) => a - b);
      const sorted = new Map();
      prices.forEach(p => sorted.set(p, queue.get(p)!));
      orderBook.asks = sorted;
    }

    orderBook.lastUpdate = Date.now();
  }

  // 获取订单簿快照
  getOrderBook(symbol: string, depth: number = 10): { bids: [number, number][], asks: [number, number][] } {
    const orderBook = this.orderBooks.get(symbol);
    if (!orderBook) {
      return { bids: [], asks: [] };
    }

    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    for (const [price, orders] of orderBook.bids) {
      if (bids.length >= depth) break;
      const totalQty = orders.reduce((sum, o) => sum + (o.quantity - o.filled), 0);
      bids.push([price, totalQty]);
    }

    for (const [price, orders] of orderBook.asks) {
      if (asks.length >= depth) break;
      const totalQty = orders.reduce((sum, o) => sum + (o.quantity - o.filled), 0);
      asks.push([price, totalQty]);
    }

    return { bids, asks };
  }

  // 生成交易 ID
  private generateTradeId(): string {
    return `TRD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // 发送成交事件
  private emitTrade(trade: Trade): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit('trade', trade);
    }
  }

  // 设置事件发射器
  setEventEmitter(emitter: any): void {
    this.eventEmitter = emitter;
  }
}

export default MatchingEngine;
