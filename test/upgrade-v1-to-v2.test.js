const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V1 to V2", function () {
  let owner, user;
  let token, vault;

  const FEE_BP = 500; // 5%
  const YIELD_BP = 500; // 5%

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    await token.mint(user.address, ethers.parseEther("1000"));

    const V1 = await ethers.getContractFactory("TokenVaultV1");
    vault = await upgrades.deployProxy(
      V1,
      [token.target, owner.address, FEE_BP],
      { kind: "uups" }
    );
    await vault.waitForDeployment();

    await token.connect(user).approve(vault.target, ethers.parseEther("1000"));
    await vault.connect(user).deposit(ethers.parseEther("100"));
  });

  it("should preserve user balances after upgrade", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    expect(await upgraded.balanceOf(user.address)).to.equal(
      ethers.parseEther("95")
    );
  });

  it("should preserve total deposits after upgrade", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    expect(await upgraded.totalDeposits()).to.equal(
      ethers.parseEther("95")
    );
  });

  it("should maintain admin access control after upgrade", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    await expect(
      upgraded.connect(user).setYieldRate(YIELD_BP)
    ).to.be.reverted;
  });

  it("should allow setting yield rate in V2", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    await upgraded.initializeV2(YIELD_BP);
    await upgraded.setYieldRate(YIELD_BP);
    expect(await upgraded.getYieldRate()).to.equal(YIELD_BP);
  });

  it("should calculate yield correctly", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    await upgraded.initializeV2(YIELD_BP);

    await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const yieldAmt = await upgraded.getUserYield(user.address);
    expect(yieldAmt).to.be.gt(0);
  });

  it("should prevent non-admin from setting yield rate", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    await expect(
      upgraded.connect(user).setYieldRate(100)
    ).to.be.reverted;
  });

  it("should allow pausing deposits in V2", async function () {
    const V2 = await ethers.getContractFactory("TokenVaultV2");
    const upgraded = await upgrades.upgradeProxy(vault.target, V2);
    await upgraded.initializeV2(YIELD_BP);

    await upgraded.pauseDeposits();
    await expect(
      upgraded.connect(user).deposit(ethers.parseEther("10"))
    ).to.be.revertedWith("deposits paused");
  });
});
