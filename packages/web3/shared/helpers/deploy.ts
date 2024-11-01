import { Address } from "viem";

import { Clients, getClient } from "./client";
import { DEFAULT_PRICE } from "../constants";

// Ignition
import { ignition } from "hardhat";
import tokenModule from "../../../ignition/token";
import paymentTokenModule from "../../../ignition/paymentToken";
import getMarketplaceModule from "../../../ignition/marketplace";

// Services
import { LabitConfTokenService } from "../../labitConfToken/service";
import { MarketplaceService } from "../../marketplace/service";
import { PaymentTokenService } from "../../paymentToken/service";

/**
 * Interface for the result of a token deployment.
 */
interface DeployResult {
  address: Address;
}

/**
 * Deploys the LabitConf token contract using the Ignition deployment framework.
 *
 * @returns A promise that resolves with the address of the deployed token.
 * @throws If the deployment fails.
 */
export const deployToken = async (): Promise<Address> => {
  try {
    const { labitConfToken } = await ignition.deploy(tokenModule);
    if (!labitConfToken) throw new Error("Token deployment failed.");

    return (labitConfToken as DeployResult).address;
  } catch (error) {
    console.error("Error deploying token:", error);
    throw error;
  }
};

/**
 * Deploys the mock of the payment token contract using the Ignition deployment framework.
 *
 * @returns A promise that resolves with the address of the deployed token.
 * @throws If the deployment fails.
 */
export const deployPaymentToken = async (): Promise<Address> => {
  try {
    const { paymentToken } = await ignition.deploy(paymentTokenModule);
    if (!paymentToken) throw new Error("Token deployment failed.");

    return (paymentToken as DeployResult).address;
  } catch (error) {
    console.error("Error deploying token:", error);
    throw error;
  }
};

/**
 * Deploys the marketplace contract using the Ignition deployment framework.
 *
 * @param paymentToken - The address of the payment token to be used in the marketplace.
 * @returns A promise that resolves with the address of the deployed marketplace contract.
 * @throws If the deployment fails.
 */
export const deployMarketplace = async (
  paymentToken: Address
): Promise<Address> => {
  try {
    const marketplaceModule = getMarketplaceModule(paymentToken, DEFAULT_PRICE);
    const { marketplace } = await ignition.deploy(marketplaceModule);
    if (!marketplace) throw new Error("Token deployment failed.");

    return (marketplace as DeployResult).address;
  } catch (error) {
    console.error("Error deploying token:", error);
    throw error;
  }
};

/**
 * Type representing the test environment for LabitConf token interactions.
 */
export type TestEnv = {
  marketplace: Address;
  labitConfToken: Address;
  paymentToken: Address;
  clients: Clients;
  labitConfTokenService: LabitConfTokenService;
  paymentTokenService: PaymentTokenService;
  marketplaceService: MarketplaceService;
};

/**
 * Generates a test environment for LabitConf token interactions.
 *
 * @returns A promise that resolves with a TestEnv object containing the token address, clients, and service.
 * @throws If the test environment setup fails.
 */
export const generateTestEnv = async (): Promise<TestEnv> => {
  try {
    const clients = await getClient();

    const labitConfToken = await deployToken();
    const paymentToken = await deployPaymentToken();
    const marketplace = await deployMarketplace(paymentToken);

    const labitConfTokenService = new LabitConfTokenService(
      clients.publicClient,
      clients.owner,
      labitConfToken
    );

    const paymentTokenService = new PaymentTokenService(
      clients.publicClient,
      clients.owner,
      paymentToken
    );

    const marketplaceService = new MarketplaceService(
      clients.publicClient,
      clients.owner,
      marketplace
    );

    return {
      marketplace,
      labitConfToken,
      paymentToken,
      clients,
      labitConfTokenService,
      paymentTokenService,
      marketplaceService,
    };
  } catch (error) {
    console.error("Error generating test environment:", error);
    throw error;
  }
};
