const { assert, expect } = require("chai");
const { deployments, ethers } = require("hardhat");

describe("FundMe", async function () {
  let fundMe;
  let deployer;
  let mockV3Aggregator;
  beforeEach(async function () {
    // deploy FundMe contract using hardhat-deploy
    // const accounts = await ethers.getSigners();
    // const accountZero = accounts[0];
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("constructor", async function () {
    it("Should set the aggregator address correctly", async function () {
      const response = await fundMe.getPriceFeed();
      assert.equal(response, mockV3Aggregator.address);
    });
  });

  describe("fund", async function () {
    it("Fails if you don't send enough ETH", async function () {
      await expect(fundMe.fund()).to.be.reverted;
    });

    it("Should update the address to amount mapping", async function () {
      const fundAmount = ethers.utils.parseEther("1"); // converts 1 ETH to wei, which has 18 zeros
      await fundMe.fund({
        value: fundAmount,
      });
      const addressToAmount = await fundMe.getAddressToAmountFunded(deployer);
      assert.equal(addressToAmount.toString(), fundAmount.toString());
    });

    it("Should add to funders array", async function () {
      const fundAmount = ethers.utils.parseEther("1");
      await fundMe.fund({
        value: fundAmount,
      });
      const funder = await fundMe.getFunder(0);
      assert.equal(funder, deployer);
    });
  });

  describe("withdraw", async function () {
    beforeEach(async function () {
      const fundAmount = ethers.utils.parseEther("1");
      await fundMe.fund({ value: fundAmount });
    });

    it("Withdraw ETH from a single funder", async function () {
      // Arrange
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      // Act
      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );

      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
      // Assert

      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });
  });
});
