// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Governance is Ownable {
    struct Proposal {
        uint id;
        string description;
        uint voteCount;
        uint endTime;
        bool executed;
        mapping(address => bool) voters;
    }

    IERC20 public token;
    uint public proposalCount;
    mapping(uint => Proposal) public proposals;

    event ProposalCreated(uint id, string description, uint endTime);
    event Voted(uint proposalId, address voter);
    event ProposalExecuted(uint proposalId);

    constructor(address _tokenAddress) {
        token = IERC20(_tokenAddress);
    }

    function createProposal(string memory _description, uint _duration) external onlyOwner {
        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.description = _description;
        newProposal.endTime = block.timestamp + _duration;
        emit ProposalCreated(proposalCount, _description, newProposal.endTime);
    }

    function vote(uint _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp < proposal.endTime, "Voting has ended");
        require(!proposal.voters[msg.sender], "You have already voted");

        uint256 voterBalance = token.balanceOf(msg.sender);
        require(voterBalance > 0, "You must hold tokens to vote");

        proposal.voters[msg.sender] = true;
        proposal.voteCount += voterBalance;

        emit Voted(_proposalId, msg.sender);
    }

    function executeProposal(uint _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp >= proposal.endTime, "Voting is still ongoing");
        require(!proposal.executed, "Proposal already executed");

        if (proposal.voteCount > 0) {
            // Logic to change parameters based on proposal description
            // For example, if the proposal is to change the pegging value
            // Implement the logic here based on your requirements
        }

        proposal.executed = true;
        emit ProposalExecuted(_proposalId);
    }
}
