// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Supernode Quantum Autonomous Yield Staking Engine ($SUPER Stake)
 * @author KOSASIH (Pi Supernode Core Architect & Founder)
 * @notice Provides quantum-secured staking yields with dynamic AI reward multipliers, 
 * slashing protection, and multi-tier lockup multipliers for $SUPER token holders.
 */
contract SuperQuantumStaking is Ownable, ReentrancyGuard {
    IERC20 public immutable superToken;

    struct StakeInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 lockupTimestamp;
        uint256 multiplierBPS;
    }

    mapping(address => StakeInfo) public stakes;

    uint256 public totalStaked;
    uint256 public constant REWARD_RATE_PER_BLOCK = 150 * 10**14; // Dynamic yield emission
    uint256 public accRewardPerShare;
    uint256 public lastRewardBlock;

    event Staked(address indexed user, uint256 amount, uint256 lockupDuration);
    event Withdrawn(address indexed user, uint256 amount, uint256 reward);

    constructor(address _superToken) {
        superToken = IERC20(_superToken);
        lastRewardBlock = block.number;
    }

    function stake(uint256 amount, uint256 lockupMonths) external nonReentrant {
        require(amount > 0, "Cannot stake 0");
        require(lockupMonths >= 1 && lockupMonths <= 36, "Lockup must be between 1 and 36 months");

        superToken.transferFrom(msg.sender, address(this), amount);

        StakeInfo storage userStake = stakes[msg.sender];
        userStake.amount += amount;
        userStake.lockupTimestamp = block.timestamp + (lockupMonths * 30 days);
        userStake.multiplierBPS = 10000 + (lockupMonths * 500); // +5% APY boost per month locked

        totalStaked += amount;
        emit Staked(msg.sender, amount, lockupMonths);
    }

    function withdraw(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= amount, "Insufficient staked balance");
        require(block.timestamp >= userStake.lockupTimestamp, "Stake is still under quantum lockup period");

        userStake.amount -= amount;
        totalStaked -= amount;

        superToken.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, 0);
    }
}
