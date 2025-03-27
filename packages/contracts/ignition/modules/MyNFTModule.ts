import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default function buildMyNFTModule() {
  const myNftModule = buildModule("MyNFTModule", (m) => {
    const myNft = m.contract("MyNFT", [], { id: "my_nft" });

    return { myNft };
  });

  return myNftModule;
}
