// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenVaultV1.sol";

contract TokenVaultV2 is TokenVaultV1 {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 internal yieldRate;
    bool internal depositsPaused;

    mapping(address => uint256) internal lastYieldClaim;
    mapping(address => uint256) internal accruedYield;

    uint256 internal v2StartTime; // ✅ NEW (appended)

    function initializeV2(uint256 _yieldRate) external reinitializer(2) {
        require(_yieldRate <= 10000, "invalid yield rate");

        yieldRate = _yieldRate;
        v2StartTime = block.timestamp;

        _grantRole(PAUSER_ROLE, msg.sender);
    }

    function setYieldRate(uint256 _yieldRate)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_yieldRate <= 10000, "invalid yield rate");
        yieldRate = _yieldRate;
    }

    function getYieldRate() external view returns (uint256) {
        return yieldRate;
    }

    function _calculateYield(address user) internal view returns (uint256) {
        uint256 start = lastYieldClaim[user];
        if (start == 0) {
            start = v2StartTime;
        }

        uint256 timeElapsed = block.timestamp - start;
        uint256 balance = balances[user];

        return (balance * yieldRate * timeElapsed) / (365 days * 10000);
    }

    function claimYield() external returns (uint256) {
        uint256 yieldAmount = _calculateYield(msg.sender);

        lastYieldClaim[msg.sender] = block.timestamp;
        accruedYield[msg.sender] += yieldAmount;

        return yieldAmount;
    }

    function getUserYield(address user) external view returns (uint256) {
        return accruedYield[user] + _calculateYield(user);
    }

    function pauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = true;
    }

    function unpauseDeposits() external onlyRole(PAUSER_ROLE) {
        depositsPaused = false;
    }

    function isDepositsPaused() external view returns (bool) {
        return depositsPaused;
    }

    function deposit(uint256 amount) public override {
        require(!depositsPaused, "deposits paused");

        if (lastYieldClaim[msg.sender] == 0) {
            lastYieldClaim[msg.sender] = block.timestamp;
        }

        super.deposit(amount);
    }

    function getImplementationVersion()
        external
        pure
        virtual
        override
        returns (string memory)
    {
        return "V2";
    }

    uint256[40] private __gap; // reduced from 41 → 40
}
