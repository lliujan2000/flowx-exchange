// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * FlowX Token - FlowX 生态系统治理代币
 * @author FlowX Team - Xuning Tech AI
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FlowXToken is ERC20, ERC20Burnable, ERC20Votes, Ownable {
    // 代币经济参数
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;  // 10 亿枚
    uint256 public constant TEAM_ALLOCATION = 150_000_000 * 10**18;  // 15% 团队
    uint256 public constant INVESTOR_ALLOCATION = 200_000_000 * 10**18;  // 20% 投资人
    uint256 public constant COMMUNITY_ALLOCATION = 300_000_000 * 10**18;  // 30% 社区
    uint256 public constant ECOSYSTEM_ALLOCATION = 250_000_000 * 10**18;  // 25% 生态
    uint256 public constant LIQUIDITY_ALLOCATION = 100_000_000 * 10**18;  // 10% 流动性

    // 解锁时间戳
    uint256 public constant TEAM_CLIFF = 365 days;  // 团队锁仓 1 年
    uint256 public constant TEAM_VESTING = 365 days * 3;  // 3 年线性解锁
    uint256 public constant INVESTOR_CLIFF = 180 days;  // 投资人锁仓 6 个月
    uint256 public constant INVESTOR_VESTING = 365 days * 2;  // 2 年线性解锁

    // 解锁追踪
    mapping(address => uint256) public teamVestedAmount;
    mapping(address => uint256) public investorVestedAmount;
    mapping(address => uint256) public teamClaimedAmount;
    mapping(address => uint256) public investorClaimedAmount;

    event TokensVested(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);

    constructor() ERC20("FlowX", "FLX") ERC20Permit("FlowX") Ownable(msg.sender) {
        // 铸造总供应量
        _mint(address(this), TOTAL_SUPPLY);

        // 转移分配
        _transfer(address(this), msg.sender, TEAM_ALLOCATION);  // 团队
        // 投资人、社区、生态、流动性分配通过其他函数分配
    }

    // 团队代币解锁
    function claimTeamVesting() external {
        require(teamVestedAmount[msg.sender] > 0, "No vested tokens");
        
        uint256 vested = calculateTeamVested(msg.sender);
        uint256 claimable = vested - teamClaimedAmount[msg.sender];
        
        require(claimable > 0, "No tokens to claim");
        
        teamClaimedAmount[msg.sender] += claimable;
        _transfer(address(this), msg.sender, claimable);
        
        emit TokensClaimed(msg.sender, claimable);
    }

    // 投资人代币解锁
    function claimInvestorVesting() external {
        require(investorVestedAmount[msg.sender] > 0, "No vested tokens");
        
        uint256 vested = calculateInvestorVested(msg.sender);
        uint256 claimable = vested - investorClaimedAmount[msg.sender];
        
        require(claimable > 0, "No tokens to claim");
        
        investorClaimedAmount[msg.sender] += claimable;
        _transfer(address(this), msg.sender, claimable);
        
        emit TokensClaimed(msg.sender, claimable);
    }

    // 计算团队已解锁代币
    function calculateTeamVested(address beneficiary) public view returns (uint256) {
        uint256 allocation = teamVestedAmount[beneficiary];
        if (allocation == 0) return 0;

        uint256 startTime = block.timestamp - TEAM_CLIFF;
        if (block.timestamp < startTime + TEAM_CLIFF) return 0;

        uint256 timePassed = block.timestamp - (startTime + TEAM_CLIFF);
        if (timePassed >= TEAM_VESTING) return allocation;

        return (allocation * timePassed) / TEAM_VESTING;
    }

    // 计算投资人已解锁代币
    function calculateInvestorVested(address beneficiary) public view returns (uint256) {
        uint256 allocation = investorVestedAmount[beneficiary];
        if (allocation == 0) return 0;

        uint256 startTime = block.timestamp - INVESTOR_CLIFF;
        if (block.timestamp < startTime + INVESTOR_CLIFF) return 0;

        uint256 timePassed = block.timestamp - (startTime + INVESTOR_CLIFF);
        if (timePassed >= INVESTOR_VESTING) return allocation;

        return (allocation * timePassed) / INVESTOR_VESTING;
    }

    // 设置团队解锁额度（仅 owner）
    function setTeamVesting(address beneficiary, uint256 amount) external onlyOwner {
        teamVestedAmount[beneficiary] = amount;
        emit TokensVested(beneficiary, amount);
    }

    // 设置投资人解锁额度（仅 owner）
    function setInvestorVesting(address beneficiary, uint256 amount) external onlyOwner {
        investorVestedAmount[beneficiary] = amount;
        emit TokensVested(beneficiary, amount);
    }

    // 提取生态基金（仅 owner）
    function withdrawEcosystem(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }

    // 提取流动性基金（仅 owner）
    function withdrawLiquidity(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }

    // 销毁未分配代币
    function burnUnallocated() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        _burn(address(this), balance);
    }

    // 覆盖 _update 以支持投票
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    // 覆盖 nonces 以支持投票
    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
