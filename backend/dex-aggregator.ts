/**
 * FlowX DEX Aggregator - 多链聚合路由器
 * 类似 1inch 的最优路径查找
 * @author FlowX Team - Xuning Tech AI
 */

import { ethers } from 'ethers';

// ============ DEX 路由器接口 ============

interface DEXRouter {
  name: string;
  chainId: number;
  routerAddress: string;
  getSwapRate: (tokenIn: string, tokenOut: string, amount: string) => Promise<number>;
  getSwapTx: (tokenIn: string, tokenOut: string, amount: string, slippage: number) => Promise<any>;
}

interface SwapPath {
  dex: string;
  path: string[];
  expectedOutput: number;
  priceImpact: number;
  gasEstimate: number;
}

// ============ 支持的 DEX ============

const DEX_ROUTERS: Record<number, DEXRouter[]> = {
  1: [  // Ethereum
    {
      name: 'Uniswap V3',
      chainId: 1,
      routerAddress: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
      getSwapRate: async () => 0,
      getSwapTx: async () => ({})
    },
    {
      name: 'SushiSwap',
      chainId: 1,
      routerAddress: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      getSwapRate: async () => 0,
      getSwapTx: async () => ({})
    }
  ],
  56: [  // BSC
    {
      name: 'PancakeSwap V3',
      chainId: 56,
      routerAddress: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
      getSwapRate: async () => 0,
      getSwapTx: async () => ({})
    }
  ],
  137: [  // Polygon
    {
      name: 'QuickSwap',
      chainId: 137,
      routerAddress: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
      getSwapRate: async () => 0,
      getSwapTx: async () => ({})
    }
  ]
};

// ============ 路径查找器 ============

class PathFinder {
  private provider: ethers.Provider;
  private chainId: number;

  constructor(provider: ethers.Provider, chainId: number) {
    this.provider = provider;
    this.chainId = chainId;
  }

  // 查找最优交换路径
  async findBestPath(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<SwapPath | null> {
    const routers = DEX_ROUTERS[this.chainId] || [];
    if (routers.length === 0) {
      return null;
    }

    const paths: SwapPath[] = [];

    // 并行查询所有 DEX 的价格
    const promises = routers.map(async (router) => {
      try {
        const output = await this.estimateSwapOutput(
          router,
          tokenIn,
          tokenOut,
          amountIn
        );
        
        const gasEstimate = await this.estimateGas(router);
        const priceImpact = await this.calculatePriceImpact(
          tokenIn,
          tokenOut,
          amountIn,
          output
        );

        return {
          dex: router.name,
          path: [tokenIn, tokenOut],
          expectedOutput: output,
          priceImpact,
          gasEstimate
        };
      } catch (error) {
        console.error(`Failed to query ${router.name}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const validPaths = results.filter((p): p is SwapPath => p !== null);

    if (validPaths.length === 0) {
      return null;
    }

    // 选择最优路径（考虑输出和 gas）
    return this.selectBestPath(validPaths);
  }

  // 估算交换输出
  private async estimateSwapOutput(
    router: DEXRouter,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<number> {
    // 实际实现需要调用 DEX 合约的 getAmountsOut
    // 这里简化处理
    return parseFloat(amountIn) * 0.99;  // 假设 1% 滑点
  }

  // 估算 Gas
  private async estimateGas(router: DEXRouter): Promise<number> {
    // 实际实现需要调用 eth_estimateGas
    return 150000;  // 默认 150k gas
  }

  // 计算价格影响
  private async calculatePriceImpact(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOut: number
  ): Promise<number> {
    // 简化计算
    return 0.01;  // 1% 价格影响
  }

  // 选择最优路径
  private selectBestPath(paths: SwapPath[]): SwapPath {
    // 按净输出排序（输出 - gas 成本）
    return paths.reduce((best, current) => {
      const bestNet = best.expectedOutput - (best.gasEstimate * 0.00001);
      const currentNet = current.expectedOutput - (current.gasEstimate * 0.00001);
      return currentNet > bestNet ? current : best;
    });
  }

  // 分割大单到多个 DEX（减少价格影响）
  async splitOrder(
    tokenIn: string,
    tokenOut: string,
    totalAmount: string,
    maxPriceImpact: number = 0.02
  ): Promise<{ dex: string; amount: string }[]> {
    const paths = await this.findBestPath(tokenIn, tokenOut, totalAmount);
    if (!paths) {
      return [];
    }

    // 如果价格影响过大，分割订单
    if (paths.priceImpact > maxPriceImpact) {
      const splits = Math.ceil(paths.priceImpact / maxPriceImpact);
      const amountPerSplit = (parseFloat(totalAmount) / splits).toString();
      
      return Array(splits).fill({
        dex: paths.dex,
        amount: amountPerSplit
      });
    }

    return [{ dex: paths.dex, amount: totalAmount }];
  }
}

// ============ 聚合交换器 ============

class DEXAggregator {
  private pathFinder: PathFinder;
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;

  constructor(provider: ethers.Provider, wallet: ethers.Wallet) {
    this.provider = provider;
    this.wallet = wallet;
    this.pathFinder = new PathFinder(provider, (await provider.getNetwork()).chainId);
  }

  // 执行最优交换
  async swap(
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    slippage: number = 0.005  // 0.5% 滑点容忍
  ): Promise<{ txHash: string; expectedOutput: number }> {
    // 1. 查找最优路径
    const bestPath = await this.pathFinder.findBestPath(
      tokenIn,
      tokenOut,
      amountIn
    );

    if (!bestPath) {
      throw new Error('No valid swap path found');
    }

    // 2. 计算最小输出（考虑滑点）
    const minOutput = bestPath.expectedOutput * (1 - slippage);

    // 3. 构建交易
    const router = DEX_ROUTERS[this.wallet.provider._network.chainId]?.find(
      r => r.name === bestPath.dex
    );

    if (!router) {
      throw new Error('Router not found');
    }

    // 4. 发送交易
    const tx = await router.getSwapTx(tokenIn, tokenOut, amountIn, slippage);
    const receipt = await this.wallet.sendTransaction(tx);

    return {
      txHash: receipt.hash,
      expectedOutput: bestPath.expectedOutput
    };
  }

  // 获取报价
  async getQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ): Promise<{
    path: SwapPath | null;
    minOutput: number;
    priceImpact: number;
    gasEstimate: number;
  }> {
    const path = await this.pathFinder.findBestPath(tokenIn, tokenOut, amountIn);
    
    if (!path) {
      return {
        path: null,
        minOutput: 0,
        priceImpact: 0,
        gasEstimate: 0
      };
    }

    return {
      path,
      minOutput: path.expectedOutput * 0.995,  // 0.5% 滑点
      priceImpact: path.priceImpact,
      gasEstimate: path.gasEstimate
    };
  }
}

export { PathFinder, DEXAggregator, DEX_ROUTERS };
export type { SwapPath, DEXRouter };
