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
    mapping(address => mapping(bytes32 => bool)) public votes; // address investor -> proposal -> voted?
    mapping(address => uint256) public shares; // address investor -> shares
    uint256 public totalShares;
    IERC20 public token;
    uint256 constant CREATE_PROPOSAL_MIN_SHARE = 1000 * 10**18; // minimum number of shares to create a proposal (1000 governance tokens)
    uint256 constant VOTING_PERIOD = 7 days;
}
