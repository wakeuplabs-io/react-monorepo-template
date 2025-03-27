import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default function buildMyTokenModule(initialSupply: bigint) {
  const myTokenModule = buildModule("MyTokenModule", (m) => {
    const myToken = m.contract("MyToken", [initialSupply], { id: "my_token" });

    return { myToken };
  });

  return myTokenModule;
}
