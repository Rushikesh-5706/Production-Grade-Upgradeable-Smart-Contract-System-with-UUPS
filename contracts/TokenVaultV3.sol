// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./TokenVaultV2.sol";

contract TokenVaultV3 is TokenVaultV2 {
    uint256 internal withdrawalDelay;

    mapping(address => uint256) internal withdrawalAmount;
    mapping(address => uint256) internal withdrawalRequestTime;

    function initializeV3(uint256 _delaySeconds) external reinitializer(3) {
        withdrawalDelay = _delaySeconds;
    }

    /* ========== Withdrawal Delay Logic ========== */

    function setWithdrawalDelay(uint256 _delaySeconds)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        withdrawalDelay = _delaySeconds;
    }

    function getWithdrawalDelay() external view returns (uint256) {
        return withdrawalDelay;
    }

    function requestWithdrawal(uint256 amount) external {
        require(amount > 0, "amount zero");
        require(balances[msg.sender] >= amount, "insufficient balance");

        withdrawalAmount[msg.sender] = amount;
        withdrawalRequestTime[msg.sender] = block.timestamp;
    }

    function executeWithdrawal() external returns (uint256) {
        uint256 amount = withdrawalAmount[msg.sender];
        uint256 requestTime = withdrawalRequestTime[msg.sender];

        require(amount > 0, "no request");
        require(
            block.timestamp >= requestTime + withdrawalDelay,
            "delay not passed"
        );

        withdrawalAmount[msg.sender] = 0;
        withdrawalRequestTime[msg.sender] = 0;

        balances[msg.sender] -= amount;
        _totalDeposits -= amount;

        require(token.transfer(msg.sender, amount), "transfer failed");

        return amount;
    }

    function getWithdrawalRequest(address user)
        external
        view
        returns (uint256 amount, uint256 requestTime)
    {
        return (withdrawalAmount[user], withdrawalRequestTime[user]);
    }

    /* ========== Emergency ========== */

    function emergencyWithdraw() external returns (uint256) {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "no balance");

        balances[msg.sender] = 0;
        _totalDeposits -= amount;

        withdrawalAmount[msg.sender] = 0;
        withdrawalRequestTime[msg.sender] = 0;

        require(token.transfer(msg.sender, amount), "transfer failed");
        return amount;
    }

    function getImplementationVersion()
        external
        pure
        override
        returns (string memory)
    {
        return "V3";
    }

    uint256[39] private __gap;
}
