// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Supernode Quantum Decentralized Autonomous Organization ($SUPER DAO)
 * @author KOSASIH (Pi Supernode Core Architect & Founder / CEO)
 * @notice On-chain governance engine allowing $SUPER / $stSUPER holders to create, 
 * vote on, and execute protocol upgrades, treasury grants, and AI parameter changes.
 */
contract SuperGovernanceDAO is Ownable, ReentrancyGuard {
    IERC20 public immutable superToken;
    IERC20 public immutable stakedSuperToken;

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        bool executed;
        bytes callData;
        address target;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    uint256 public proposalCount;

    uint256 public constant VOTING_DELAY = 1; // blocks
    uint256 public constant VOTING_PERIOD = 45818; // ~1 week in blocks
    uint256 public constant QUORUM_THRESHOLD = 1_000_000 * 10**18; // 1M $SUPER quorum

    event ProposalCreated(uint256 indexed proposalId, address proposer, string description);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _superToken, address _stakedSuperToken) {
        superToken = IERC20(_superToken);
        stakedSuperToken = IERC20(_stakedSuperToken);
    }

    function getVotingPower(address account) public view returns (uint256) {
        return superToken.balanceOf(account) + stakedSuperToken.balanceOf(account);
    }

    function createProposal(string calldata description, address target, bytes calldata callData) external returns (uint256) {
        require(getVotingPower(msg.sender) >= 10_000 * 10**18, "Must hold at least 10,000 SUPER to propose");

        proposalCount++;
        uint256 proposalId = proposalCount;

        Proposal storage prop = proposals[proposalId];
        prop.id = proposalId;
        prop.proposer = msg.sender;
        prop.description = description;
        prop.startBlock = block.number + VOTING_DELAY;
        prop.endBlock = prop.startBlock + VOTING_PERIOD;
        prop.target = target;
        prop.callData = callData;

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external nonReentrant {
        Proposal storage prop = proposals[proposalId];
        require(block.number >= prop.startBlock && block.number <= prop.endBlock, "Voting is not active");
        require(!hasVoted[proposalId][msg.sender], "Already voted on this proposal");

        uint256 weight = getVotingPower(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            prop.forVotes += weight;
        } else {
            prop.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage prop = proposals[proposalId];
        require(block.number > prop.endBlock, "Voting period has not ended");
        require(!prop.executed, "Proposal already executed");
        require(prop.forVotes + prop.againstVotes >= QUORUM_THRESHOLD, "Quorum not reached");
        require(prop.forVotes > prop.againstVotes, "Proposal did not pass");

        prop.executed = true;

        (bool success, ) = prop.target.call(prop.callData);
        require(success, "Proposal execution failed");

        emit ProposalExecuted(proposalId);
    }
}
