// SPDX-License-Identifier: MIT
pragma solidity ^0.7.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DAO {
    enum Side {Yes, No}
    enum Status {Undecided, Approved, Rejected}
    struct Proposal {
        address author;
        bytes32 hash;
        uint256 createdAt;
        uint256 votesYes;
        uint256 votesNo;
        Status status;
    }

    mapping(bytes32 => Proposal) public proposals; // hash -> proposal
    mapping(address => mapping(bytes32 => bool)) public votes; // address voter (investor) -> proposal hash -> voted?
    mapping(address => uint256) public shares; // address voter (investor) -> shares   [1 share per governance token]
    uint256 public totalShares;
    IERC20 public token;
    uint256 constant CREATE_PROPOSAL_MIN_SHARE = 100 * 10**18; // minimum number of shares to create a proposal (100 governance tokens)
    uint256 constant VOTING_PERIOD = 7 days;

    constructor(address _token) {
        token = IERC20(_token);
    }

    // deposit governance tokens
    function deposit(uint256 amount) external {
        shares[msg.sender] += amount;
        totalShares += amount;
        token.transferFrom(msg.sender, address(this), amount);
    }

    // withdraw governance tokens
    function withdraw(uint256 amount) external {
        require(shares[msg.sender] >= amount, "not enough shares");
        shares[msg.sender] -= amount;
        totalShares -= amount;
        token.transfer(msg.sender, amount);
    }

    // create a voting proposal
    function createProposal(bytes32 proposalHash) external {
        require(
            shares[msg.sender] >= CREATE_PROPOSAL_MIN_SHARE,
            "not enough shares to create proposal"
        );
        require(
            proposals[proposalHash].hash == bytes32(0),
            "proposal already exists"
        );
        proposals[proposalHash] = Proposal(
            msg.sender,
            proposalHash,
            block.timestamp,
            0,
            0,
            Status.Undecided
        );
    }

    function vote(bytes32 proposalHash, Side side) external {
        Proposal storage proposal = proposals[proposalHash];
        require(votes[msg.sender][proposalHash] == false, "already voted");
        require(
            proposals[proposalHash].hash != bytes32(0),
            "proposal already exist"
        );
        require(
            block.timestamp <= proposal.createdAt + VOTING_PERIOD,
            "voting period over"
        );
        votes[msg.sender][proposalHash] = true;
        if (side == Side.Yes) {
            proposal.votesYes += shares[msg.sender];
            // if > 50%  (proposal.votesYes / totalShares > 0.5)
            if ((proposal.votesYes * 100) / totalShares > 50) {
                proposal.status = Status.Approved;
            }
        } else {
            proposal.votesNo += shares[msg.sender];
            if ((proposal.votesNo * 100) / totalShares > 50) {
                proposal.status = Status.Rejected;
            }
        }
    }
}
