const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Upgrade V2 to V3", function () {
  let owner, user;
  let token, vault;

  const FEE_BP = 500;
  const YIELD_BP = 500;
  const DELAY = 7 * 24 * 60 * 60; // 7 days

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

    const V2 = await ethers.getContractFactory("TokenVaultV2");
    vault = await upgrades.upgradeProxy(vault.target, V2);
    await vault.initializeV2(YIELD_BP);

    const V3 = await ethers.getContractFactory("TokenVaultV3");
    vault = await upgrades.upgradeProxy(vault.target, V3);
    await vault.initializeV3(DELAY);
  });

  it("should preserve all V2 state after upgrade", async function () {
    expect(await vault.getYieldRate()).to.equal(YIELD_BP);
    expect(await vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("95")
    );
  });

  it("should allow setting withdrawal delay", async function () {
    await vault.setWithdrawalDelay(100);
    expect(await vault.getWithdrawalDelay()).to.equal(100);
  });

  it("should handle withdrawal requests correctly", async function () {
    await vault.connect(user).requestWithdrawal(ethers.parseEther("10"));
    const req = await vault.getWithdrawalRequest(user.address);
    expect(req.amount).to.equal(ethers.parseEther("10"));
  });

  it("should enforce withdrawal delay", async function () {
    await vault.connect(user).requestWithdrawal(ethers.parseEther("10"));
    await expect(
      vault.connect(user).executeWithdrawal()
    ).to.be.revertedWith("delay not passed");
  });

  it("should prevent premature withdrawal execution", async function () {
    await vault.connect(user).requestWithdrawal(ethers.parseEther("10"));
    await expect(
      vault.connect(user).executeWithdrawal()
    ).to.be.reverted;
  });

  it("should allow emergency withdrawals", async function () {
    const before = await token.balanceOf(user.address);
    await vault.connect(user).emergencyWithdraw();
    const after = await token.balanceOf(user.address);
    expect(after).to.be.gt(before);
  });
});
