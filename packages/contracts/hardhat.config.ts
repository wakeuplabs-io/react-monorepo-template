import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-chai-matchers";
import "solidity-coverage";
import "@nomicfoundation/hardhat-toolbox";
import { getNetwork, Networks } from "./networks";
import envParsed from "./envParsed";

const NETWORK_TESTNET = envParsed().NETWORK_TESTNET as Networks;
const NETWORK_MAINNET = envParsed().NETWORK_MAINNET as Networks;

const networkTestnet = getNetwork(NETWORK_TESTNET, true);
const networkMainnet = getNetwork(NETWORK_MAINNET, false);

const config: HardhatUserConfig = {
  solidity: {
    compilers: [{ version: "0.8.24" }],
  },
  networks: {
    testnet: networkTestnet ? networkTestnet.network : undefined,
    mainnet: networkMainnet ? networkMainnet.network : undefined,
  },
  typechain: {
    outDir: "typechain-types",
  },
  etherscan: {
    apiKey: networkTestnet ? networkTestnet.apiKeys : undefined,
    customChains: networkTestnet ? networkTestnet.customChains : undefined,
  },
  sourcify: {
    enabled: false,
  },
};


export default config;
