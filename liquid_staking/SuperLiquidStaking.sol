// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Supernode Quantum Liquid Staking Token ($stSUPER)
 * @author KOSASIH (Pi Supernode Core Architect & Founder)
 * @notice Allows users to stake $SUPER and receive liquid compounding derivative $stSUPER 
 * representing staked shares plus auto-compounding rewards across Pi Mainnet and EVM layers.
 */
interface ISuperToken is IERC20 {
    function burn(address account, uint256 amount) external;
}

contract SuperLiquidStaking is ERC20, Ownable, ReentrancyGuard {
    ISuperToken public immutable superToken;

    event SuperStaked(address indexed user, uint256 superAmount, uint256 stSuperMinted);
    event SuperUnstaked(address indexed user, uint256 stSuperBurned, uint256 superAmountReturned);

    constructor(address _superToken) ERC20("Staked Supernode Token", "stSUPER") {
        superToken = ISuperToken(_superToken);
    }

    function deposit(uint256 superAmount) external nonReentrant returns (uint256 stSuperAmount) {
        require(superAmount > 0, "Cannot deposit 0 SUPER");

        uint256 totalSuperInPool = superToken.balanceOf(address(this));
        uint256 totalShares = totalSupply();

        if (totalShares == 0 || totalSuperInPool == 0) {
            stSuperAmount = superAmount;
        } else {
            stSuperAmount = (superAmount * totalShares) / totalSuperInPool;
        }

        superToken.transferFrom(msg.sender, address(this), superAmount);
        _mint(msg.sender, stSuperAmount);

        emit SuperStaked(msg.sender, superAmount, stSuperAmount);
        return stSuperAmount;
    }

    function withdraw(uint256 stSuperAmount) external nonReentrant returns (uint256 superAmountOut) {
        require(stSuperAmount > 0, "Cannot withdraw 0 stSUPER");

        uint256 totalShares = totalSupply();
        uint256 totalSuperInPool = superToken.balanceOf(address(this));

        superAmountOut = (stSuperAmount * totalSuperInPool) / totalShares;

        _burn(msg.sender, stSuperAmount);
        superToken.transfer(msg.sender, superAmountOut);

        emit SuperUnstaked(msg.sender, stSuperAmount, superAmountOut);
        return superAmountOut;
    }
}
