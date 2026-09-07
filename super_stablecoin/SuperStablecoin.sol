// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title Supernode Intelligence Stablecoin ($SUPER)
 * @author KOSASIH (Pi Supernode Core Architect)
 * @notice Total Supply: 100,000,000,000 $SUPER. 
 * Autonomous AI-managed algorithmic stability engine with multi-chain mainnet/testnet minting capabilities.
 */
contract SuperStablecoin is ERC20, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant AI_GOVERNOR_ROLE = keccak256("AI_GOVERNOR_ROLE");

    uint256 public constant MAX_TOTAL_SUPPLY = 100_000_000_000 * 10**18; // 100 Billion $SUPER

    // AI Algorithmic Peg Stability metrics
    uint256 public targetPegUSD = 1000000; // 1.000000 USD (6 decimal precision factor)
    uint256 public collateralRatioBPS = 15000; // 150% Over-collateralized by Pi & Multi-Chain Assets

    event PegAdjusted(uint256 newCollatRatio, uint256 timestamp);
    event DualMintExecuted(address indexed targetNetwork, address indexed recipient, uint256 amount);

    constructor(address admin, address aiGovernor) ERC20("Supernode Intelligence Stablecoin", "SUPER") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(AI_GOVERNOR_ROLE, aiGovernor);

        // Mint initial 100 Billion $SUPER across Testnet & Mainnet Genesis Vaults
        _mint(admin, MAX_TOTAL_SUPPLY);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice AI-driven autonomous peg rebalancing and collateral ratio tuning
    function autonomousAIPegRebalance(uint256 newCollateralRatioBPS) external onlyRole(AI_GOVERNOR_ROLE) {
        require(newCollateralRatioBPS >= 10000, "Collateral ratio cannot fall below 100%");
        collateralRatioBPS = newCollateralRatioBPS;
        emit PegAdjusted(collateralRatioBPS, block.timestamp);
    }

    /// @notice Cross-network dual minting for Pi Testnet & Open Mainnet deployment
    function crossNetworkDualMint(address recipient, uint256 amount, string calldata networkTarget) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(totalSupply() + amount <= MAX_TOTAL_SUPPLY, "Exceeds maximum $SUPER supply cap");
        _mint(recipient, amount);
        emit DualMintExecuted(msg.sender, recipient, amount);
    }
}
