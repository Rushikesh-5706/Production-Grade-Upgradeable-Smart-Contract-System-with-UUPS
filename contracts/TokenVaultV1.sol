// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenVaultV1 is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    IERC20 internal token;
    uint256 internal depositFee;
    uint256 internal _totalDeposits;

    mapping(address => uint256) internal balances;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _token,
        address _admin,
        uint256 _depositFee
    ) external initializer {
        require(_token != address(0), "invalid token");
        require(_admin != address(0), "invalid admin");
        require(_depositFee <= 10000, "fee too high");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        token = IERC20(_token);
        depositFee = _depositFee;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    function _authorizeUpgrade(address)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /* ===== FIXED ===== */
    function deposit(uint256 amount) public virtual {
        require(amount > 0, "amount zero");

        uint256 fee = (amount * depositFee) / 10000;
        uint256 credited = amount - fee;

        balances[msg.sender] += credited;
        _totalDeposits += credited;

        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount zero");
        require(balances[msg.sender] >= amount, "insufficient balance");

        balances[msg.sender] -= amount;
        _totalDeposits -= amount;

        require(token.transfer(msg.sender, amount), "transfer failed");
    }

    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    function totalDeposits() external view returns (uint256) {
        return _totalDeposits;
    }

    function getDepositFee() external view returns (uint256) {
        return depositFee;
    }

    function getImplementationVersion()
        external
        pure
        virtual
        returns (string memory)
    {
        return "V1";
    }

    uint256[45] private __gap;
}
