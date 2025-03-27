import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const INITIAL_SUPPLY = 1000n * 10n ** 18n;
const MINT_AMOUNT = 500n * 10n ** 18n;
const TRANSFER_AMOUNT = 100n * 10n ** 18n;

describe("MyToken", function () {
  async function deployTokenFixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const Token = await hre.ethers.getContractFactory("MyToken");
    const myToken = await Token.connect(owner).deploy(INITIAL_SUPPLY);
    await myToken.waitForDeployment();

    return { myToken, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should assign the initial supply to the owner", async function () {
      const { myToken, owner } = await loadFixture(deployTokenFixture);
      expect(await myToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should have the correct name", async function () {
      const { myToken } = await loadFixture(deployTokenFixture);
      expect(await myToken.name()).to.equal("MyToken");
    });

    it("Should have the correct symbol", async function () {
      const { myToken } = await loadFixture(deployTokenFixture);
      expect(await myToken.symbol()).to.equal("MTK");
    });
  });

  describe("Minting", function () {
    it("Should allow the owner to mint tokens", async function () {
      const { myToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.mint(addr1.address, MINT_AMOUNT))
        .not.to.be.reverted;

      expect(await myToken.balanceOf(addr1.address)).to.equal(MINT_AMOUNT);
    });

    it("Should not allow non-owners to mint tokens", async function () {
      const { myToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.connect(addr1).mint(addr1.address, MINT_AMOUNT))
        .to.be.revertedWithCustomError(myToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Transfers", function () {
    it("Should allow transfers between accounts", async function () {
      const { myToken, owner, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.transfer(addr1.address, TRANSFER_AMOUNT))
        .not.to.be.reverted;

      expect(await myToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - TRANSFER_AMOUNT);
      expect(await myToken.balanceOf(addr1.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should emit a Transfer event", async function () {
      const { myToken, owner, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.transfer(addr1.address, TRANSFER_AMOUNT))
        .to.emit(myToken, "Transfer")
        .withArgs(owner.address, addr1.address, TRANSFER_AMOUNT);
    });

    it("Should revert if the sender has insufficient balance", async function () {
      const { myToken, addr1, addr2 } = await loadFixture(deployTokenFixture);

      await expect(myToken.connect(addr1).transfer(addr2.address, TRANSFER_AMOUNT))
        .to.be.reverted;
    });
  });

  describe("Allowance and transferFrom", function () {
    it("Should allow approval and transfer by a third party", async function () {
      const { myToken, owner, addr1, addr2 } = await loadFixture(deployTokenFixture);

      await expect(myToken.approve(addr1.address, TRANSFER_AMOUNT))
        .not.to.be.reverted;

      expect(await myToken.allowance(owner.address, addr1.address)).to.equal(TRANSFER_AMOUNT);

      await expect(myToken.connect(addr1).transferFrom(owner.address, addr2.address, TRANSFER_AMOUNT))
        .not.to.be.reverted;

      expect(await myToken.balanceOf(addr2.address)).to.equal(TRANSFER_AMOUNT);
    });

    it("Should emit an Approval event", async function () {
      const { myToken, owner, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.approve(addr1.address, TRANSFER_AMOUNT))
        .to.emit(myToken, "Approval")
        .withArgs(owner.address, addr1.address, TRANSFER_AMOUNT);
    });

    it("Should revert if there is not enough allowance", async function () {
      const { myToken, addr1, addr2 } = await loadFixture(deployTokenFixture);

      await expect(myToken.connect(addr1).transferFrom(addr1.address, addr2.address, TRANSFER_AMOUNT))
        .to.be.reverted;
    });
  });

  describe("Burn", function () {
    it("Should allow the owner to burn tokens", async function () {
      const { myToken, owner } = await loadFixture(deployTokenFixture);

      await expect(myToken.transfer(owner.address, TRANSFER_AMOUNT))
        .not.to.be.reverted;

      expect(await myToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
      await expect(myToken.burn(TRANSFER_AMOUNT)).not.to.be.reverted;

      expect(await myToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - TRANSFER_AMOUNT);
    });

    it("Should revert if burning more than the available balance", async function () {
      const { myToken, addr1 } = await loadFixture(deployTokenFixture);

      await expect(myToken.connect(addr1).transfer(hre.ethers.ZeroAddress, TRANSFER_AMOUNT))
        .to.be.reverted;
    });
  });
});
