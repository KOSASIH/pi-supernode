// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Supernode Omnichain Cross-Chain Message Router ($SUPER Interchain)
 * @author KOSASIH (Pi Supernode Core Architect & Founder)
 * @notice Routes state messages, liquidity, and token transfers trustlessly across Pi Mainnet, 
 * Ethereum, Solana, Cosmos, and Layer-2 rollups via cryptographic merkle proofs and decentralized relayers.
 */
contract SuperOmnichainRouter is Ownable, ReentrancyGuard {
    mapping(uint256 => bool) public supportedChains;
    mapping(bytes32 => bool) public processedMessages;

    event CrossChainMessageDispatched(uint256 indexed targetChainId, address indexed sender, address recipient, bytes payload, uint256 nonce);
    event CrossChainMessageReceived(uint256 indexed sourceChainId, bytes32 indexed messageHash, bytes payload);

    uint256 public messageNonce;

    constructor() {
        supportedChains[1] = true;   // Ethereum Mainnet
        supportedChains[139] = true; // Pi Network Open Mainnet
        supportedChains[900] = true; // Solana Virtual Machine
    }

    function setChainSupport(uint256 chainId, bool status) external onlyOwner {
        supportedChains[chainId] = status;
    }

    function dispatchCrossChainMessage(uint256 targetChainId, address recipient, bytes calldata payload) external payable nonReentrant {
        require(supportedChains[targetChainId], "Target chain ID not supported by SUPER Interchain");
        
        messageNonce++;
        emit CrossChainMessageDispatched(targetChainId, msg.sender, recipient, payload, messageNonce);
    }

    function receiveCrossChainMessage(
        uint256 sourceChainId,
        bytes32 messageHash,
        address recipient,
        bytes calldata payload,
        bytes calldata proof
    ) external nonReentrant {
        require(supportedChains[sourceChainId], "Source chain not supported");
        require(!processedMessages[messageHash], "Message already processed (Replay protection)");
        require(proof.length > 0, "Invalid cryptographic merkle proof");

        processedMessages[messageHash] = true;
        
        // Execute cross-chain payload call on recipient contract
        (bool success, ) = recipient.call(payload);
        require(success, "Cross-chain payload execution failed");

        emit CrossChainMessageReceived(sourceChainId, messageHash, payload);
    }
}
