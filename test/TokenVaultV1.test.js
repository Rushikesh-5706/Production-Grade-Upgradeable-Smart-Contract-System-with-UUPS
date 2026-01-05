const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("TokenVaultV1", function () {
  let owner, user;
  let token, vault;

  const FEE_BP = 500; // 5%

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("Mock", "MOCK");
    await token.waitForDeployment();

    await token.mint(user.address, ethers.parseEther("1000"));

    const VaultV1 = await ethers.getContractFactory("TokenVaultV1");
    vault = await upgrades.deployProxy(
      VaultV1,
      [token.target, owner.address, FEE_BP],
      { kind: "uups" }
    );
    await vault.waitForDeployment();

    await token.connect(user).approve(vault.target, ethers.parseEther("1000"));
  });

  it("should initialize with correct parameters", async function () {
    expect(await vault.getDepositFee()).to.equal(FEE_BP);
  });

  it("should allow deposits and update balances", async function () {
    await vault.connect(user).deposit(ethers.parseEther("100"));
    expect(await vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("95")
    );
  });

  it("should deduct deposit fee correctly", async function () {
    await vault.connect(user).deposit(ethers.parseEther("200"));
    expect(await vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("190")
    );
  });

  it("should allow withdrawals and update balances", async function () {
    await vault.connect(user).deposit(ethers.parseEther("100"));
    await vault.connect(user).withdraw(ethers.parseEther("50"));
    expect(await vault.balanceOf(user.address)).to.equal(
      ethers.parseEther("45")
    );
  });

  it("should prevent withdrawal of more than balance", async function () {
    await expect(
      vault.connect(user).withdraw(ethers.parseEther("10"))
    ).to.be.revertedWith("insufficient balance");
  });

  it("should prevent reinitialization", async function () {
    await expect(
      vault.initialize(token.target, owner.address, 100)
    ).to.be.reverted;
  });
});
