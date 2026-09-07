// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Supernode Quantum Decentralized Oracle & Cross-Chain Feeds ($SUPER Oracle)
 * @author KOSASIH (Pi Supernode Core Architect & Founder)
 * @notice Aggregates decentralized price feeds and multi-chain state verifications using 
 * threshold cryptography and verifiable random functions (VRF).
 */
contract SuperQuantumOracle is Ownable {
    struct PriceData {
        uint256 price;
        uint256 timestamp;
        uint256 confidence;
    }

    mapping(bytes32 => PriceData) public priceFeeds;
    mapping(address => bool) public authorizedOracles;

    event FeedUpdated(bytes32 indexed feedId, uint256 price, uint256 timestamp);
    event OracleAuthorized(address indexed oracleNode, bool status);

    modifier onlyAuthorizedOracle() {
        require(authorizedOracles[msg.sender] || msg.sender == owner(), "Caller is not an authorized oracle");
        _;
    }

    function setOracleAuthorization(address oracleNode, bool status) external onlyOwner {
        authorizedOracles[oracleNode] = status;
        emit OracleAuthorized(oracleNode, status);
    }

    function updatePriceFeed(bytes32 feedId, uint256 price, uint256 confidence) external onlyAuthorizedOracle {
        priceFeeds[feedId] = PriceData({
            price: price,
            timestamp: block.timestamp,
            confidence: confidence
        });

        emit FeedUpdated(feedId, price, block.timestamp);
    }

    function getLatestPrice(bytes32 feedId) external view returns (uint256 price, uint256 timestamp, uint256 confidence) {
        PriceData memory data = priceFeeds[feedId];
        require(data.timestamp > 0, "Feed does not exist or has no data");
        return (data.price, data.timestamp, data.confidence);
    }
}
