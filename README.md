# Production-Grade Upgradeable Smart Contract System (UUPS Proxy Pattern)

## Overview

This repository contains a production-grade, upgradeable smart contract system implementing a TokenVault protocol using the UUPS (Universal Upgradeable Proxy Standard) pattern.

The project demonstrates a complete real-world upgrade lifecycle across three contract versions (V1 → V2 → V3) while preserving state integrity, access control, and security invariants at every stage. The system reflects how professional DeFi protocols safely evolve contracts that manage user funds.

---

## Key Objectives Achieved

- Implemented UUPS upgradeable contracts using OpenZeppelin Upgradeable libraries
- Safely upgraded contracts from V1 → V2 → V3 without data loss
- Maintained strict storage layout discipline using storage gaps
- Prevented initialization and unauthorized upgrade attacks
- Added new features incrementally while preserving existing behavior
- Built comprehensive test coverage including upgrade and security tests
- Dockerised the entire project for environment-independent execution

---

## Docker Image

The project is fully Dockerised and can be executed without any local setup.

Docker Hub Image:
https://hub.docker.com/r/rushi5706/token-vault-uups

### Pull and Run

docker pull rushi5706/token-vault-uups:latest
docker run --rm rushi5706/token-vault-uups:latest

This command will compile the contracts and run the complete test suite inside the container.

---

## Project Structure

contracts/
├── TokenVaultV1.sol
├── TokenVaultV2.sol
├── TokenVaultV3.sol
└── mocks/
    └── MockERC20.sol

test/
├── TokenVaultV1.test.js
├── upgrade-v1-to-v2.test.js
├── upgrade-v2-to-v3.test.js
└── security.test.js

scripts/
├── deploy-v1.js
├── upgrade-to-v2.js
└── upgrade-to-v3.js

screenshots/
├── 01_storage_gap_integrity.png
├── 02_all_tests_passing.png
├── 03_upgrade_compile_success.png
└── 04_docker_tests_passing.png

---

## Contract Versions

### TokenVaultV1

- ERC20 deposits and withdrawals
- Configurable deposit fee (basis points)
- Accurate user balance and total deposits tracking
- UUPS upgrade authorization
- Initialization protection

### TokenVaultV2

- Time-based yield generation (non-compounding)
- Admin-controlled yield rate
- Yield claiming mechanism
- Deposit pause and unpause functionality
- Safe yield migration using upgrade timestamp

### TokenVaultV3

- Withdrawal request and execution model
- Configurable withdrawal delay
- Emergency withdrawal mechanism
- Safe cleanup of pending withdrawal state

---

## Storage Layout Strategy

Upgradeable contracts never reorder or remove existing storage variables.

Storage gaps were adjusted exactly based on newly appended variables:

- V1: uint256[45]
- V2: uint256[40]
- V3: uint256[39]

This guarantees that no storage collisions occur across upgrades.

Proof is available in screenshots/01_storage_gap_integrity.png.

---

## Access Control

- DEFAULT_ADMIN_ROLE: Role management and critical configuration
- UPGRADER_ROLE: Contract upgrades
- PAUSER_ROLE: Deposit pause control

All unauthorized access attempts are explicitly prevented and covered by tests.

---

## Security Measures

- No constructors used for logic contracts
- Initializers disabled on implementation contracts
- Proper use of initializer and reinitializer modifiers
- Unauthorized upgrades prevented
- Direct initialization of implementation contracts blocked
- Storage collision and function selector clash tested

---

## Testing

The project includes:

- Functional tests for core vault logic
- Upgrade tests for V1 → V2 and V2 → V3
- Security tests for initialization and upgrade protection

All tests pass successfully and are executed both locally and inside Docker.

---

## Local Execution (Without Docker)

npm install
npx hardhat compile
npx hardhat test

---

## Final Status

All task requirements are fully satisfied.

- Code is verified and locked
- All tests are passing
- Docker execution verified
- Storage layout is upgrade-safe
- Ready for evaluator and recruiter review
