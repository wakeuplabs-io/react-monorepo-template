import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("MyNFT", function () {
  async function deployNFTFixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();

    const NFT = await hre.ethers.getContractFactory("MyNFT");
    const myNFT = await NFT.connect(owner).deploy();
    await myNFT.waitForDeployment();

    return { myNFT, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should have the correct name and symbol", async function () {
      const { myNFT } = await loadFixture(deployNFTFixture);

      expect(await myNFT.name()).to.equal("MyNFT");
      expect(await myNFT.symbol()).to.equal("MNFT");
    });
  });

  describe("Minting", function () {
    it("Should allow the owner to mint NFTs", async function () {
      const { myNFT, addr1 } = await loadFixture(deployNFTFixture);

      await expect(myNFT.mint(addr1.address)).not.to.be.reverted;
      expect(await myNFT.ownerOf(0)).to.equal(addr1.address);
    });

    it("Should not allow non-owners to mint", async function () {
      const { myNFT, addr1, addr2 } = await loadFixture(deployNFTFixture);

      await expect(myNFT.connect(addr1).mint(addr2.address))
        .to.be.revertedWithCustomError(myNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Transfers", function () {
    it("Should allow transfers between accounts", async function () {
      const { myNFT, addr1, addr2 } = await loadFixture(deployNFTFixture);

      await myNFT.mint(addr1.address);
      await myNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0);

      expect(await myNFT.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should emit a Transfer event", async function () {
      const { myNFT, addr1, addr2 } = await loadFixture(deployNFTFixture);

      await myNFT.mint(addr1.address);

      await expect(myNFT.connect(addr1).transferFrom(addr1.address, addr2.address, 0))
        .to.emit(myNFT, "Transfer")
        .withArgs(addr1.address, addr2.address, 0);
    });

    it("Should revert if sender is not owner or approved", async function () {
      const { myNFT, addr1, addr2 } = await loadFixture(deployNFTFixture);

      await myNFT.mint(addr1.address);

      await expect(myNFT.connect(addr2).transferFrom(addr1.address, addr2.address, 0))
        .to.be.reverted;
    });
  });
});
