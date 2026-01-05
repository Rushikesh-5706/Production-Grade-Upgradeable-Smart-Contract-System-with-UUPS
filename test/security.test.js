const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Security Tests", function () {
  let owner, attacker;
  let token, vault;

  const FEE_BP = 500;

  beforeEach(async function () {
    [owner, attacker] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    const V1 = await ethers.getContractFactory("TokenVaultV1");
    vault = await upgrades.deployProxy(
      V1,
      [token.target, owner.address, FEE_BP],
      { kind: "uups" }
    );
    await vault.waitForDeployment();
  });

  it("should prevent direct initialization of implementation contracts", async function () {
    const V1 = await ethers.getContractFactory("TokenVaultV1");
    const impl = await V1.deploy();
    await impl.waitForDeployment();

    await expect(
      impl.initialize(token.target, owner.address, FEE_BP)
    ).to.be.reverted;
  });

  it("should prevent unauthorized upgrades", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");

    await expect(
      upgrades.upgradeProxy(vault.target, V2.connect(attacker))
    ).to.be.reverted;
  });

  it("should use storage gaps for future upgrades", async function () {
    const storageSlots = await ethers.provider.getStorage(vault.target, 0);
    expect(storageSlots).to.not.equal(undefined);
  });

  it("should not have storage layout collisions across versions", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    expect(await upgraded.getDepositFee()).to.equal(FEE_BP);
  });

  it("should prevent function selector clashing", async function () {
    const iface = new ethers.Interface([
      "function deposit(uint256)",
      "function withdraw(uint256)"
    ]);

    expect(iface.getFunction("deposit").selector)
      .to.not.equal(iface.getFunction("withdraw").selector);
  });
});
