// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * FlowX Swap - 去中心化交换合约
 * 支持多链聚合和最优路径路由
 * @author FlowX Team - Xuning Tech AI
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IDexRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract FlowXSwap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // 支持的 DEX 路由器
    mapping(uint256 => mapping(address => bool)) public supportedRouters;
    
    // 手续费配置
    uint256 public platformFeeBps = 10;  // 0.1% 平台费
    address public feeRecipient;
    
    // 交易统计
    struct TradeStats {
        uint256 totalTrades;
        uint256 totalVolume;
        uint256 totalFees;
    }
    mapping(address => TradeStats) public userStats;
    TradeStats public globalStats;

    // 事件
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address router,
        uint256 fee
    );

    event RouterAdded(uint256 chainId, address router);
    event RouterRemoved(uint256 chainId, address router);
    event FeeUpdated(uint256 newFeeBps);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    // 添加支持的 DEX 路由器
    function addSupportedRouter(uint256 chainId, address router) external onlyOwner {
        supportedRouters[chainId][router] = true;
        emit RouterAdded(chainId, router);
    }

    // 移除支持的 DEX 路由器
    function removeSupportedRouter(uint256 chainId, address router) external onlyOwner {
        supportedRouters[chainId][router] = false;
        emit RouterRemoved(chainId, router);
    }

    // 更新手续费
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 50, "Fee too high");  // 最大 0.5%
        platformFeeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    // 更新手续费接收地址
    function setFeeRecipient(address newRecipient) external onlyOwner {
        feeRecipient = newRecipient;
    }

    /**
     * 执行代币交换
     * @param tokenIn 输入代币地址
     * @param tokenOut 输出代币地址
     * @param amountIn 输入数量
     * @param minAmountOut 最小输出数量（滑点保护）
     * @param router DEX 路由器地址
     * @param path 交换路径
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address router,
        address[] calldata path
    ) external nonReentrant returns (uint256 amountOut) {
        require(supportedRouters[block.chainid][router], "Unsupported router");
        require(amountIn > 0, "Amount must be > 0");

        // 计算手续费
        uint256 fee = (amountIn * platformFeeBps) / 10000;
        uint256 amountAfterFee = amountIn - fee;

        // 转移输入代币
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // 收取手续费
        if (fee > 0) {
            IERC20(tokenIn).safeTransfer(feeRecipient, fee);
        }

        // 授权 DEX 路由器
        IERC20(tokenIn).safeApprove(router, amountAfterFee);

        // 执行交换
        uint256[] memory amounts = IDexRouter(router).swapExactTokensForTokens(
            amountAfterFee,
            minAmountOut,
            path,
            msg.sender,
            block.timestamp + 300  // 5 分钟过期
        );

        amountOut = amounts[amounts.length - 1];

        // 更新统计
        _updateStats(msg.sender, amountIn, fee);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, router, fee);
    }

    /**
     * 批量交换（支持多 DEX 分割）
     */
    function batchSwap(
        address[] calldata tokenIns,
        address[] calldata tokenOuts,
        uint256[] calldata amountIns,
        uint256[] calldata minAmountOuts,
        address[] calldata routers,
        address[][] calldata paths
    ) external nonReentrant returns (uint256[] memory amountOuts) {
        require(tokenIns.length == tokenOuts.length, "Length mismatch");
        require(tokenIns.length == amountIns.length, "Length mismatch");
        require(tokenIns.length == routers.length, "Length mismatch");

        amountOuts = new uint256[](tokenIns.length);

        for (uint256 i = 0; i < tokenIns.length; i++) {
            amountOuts[i] = swap(
                tokenIns[i],
                tokenOuts[i],
                amountIns[i],
                minAmountOuts[i],
                routers[i],
                paths[i]
            );
        }
    }

    // 更新统计
    function _updateStats(address user, uint256 volume, uint256 fee) internal {
        userStats[user].totalTrades++;
        userStats[user].totalVolume += volume;
        userStats[user].totalFees += fee;

        globalStats.totalTrades++;
        globalStats.totalVolume += volume;
        globalStats.totalFees += fee;
    }

    // 提取意外发送的代币
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    // 获取用户统计
    function getUserStats(address user) external view returns (TradeStats memory) {
        return userStats[user];
    }

    // 获取全局统计
    function getGlobalStats() external view returns (TradeStats memory) {
        return globalStats;
    }
}
