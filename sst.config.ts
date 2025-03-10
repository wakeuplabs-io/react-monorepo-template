/// <reference path="./.sst/platform/config.d.ts" />
import { VPC_NAME, AVAILABILITY_ZONES, getOrCreateSharedVpc } from "./infrastructure/vpc";

// Project configuration constants
const PROJECT_NAME = "react-monorepo-template";
const CUSTOMER = "wakeuplabs";

export default $config({
  // App configuration - defines general settings for the SST application
  app(input) {
    return {
      name: PROJECT_NAME,
      // Retention policy: retain resources in production, remove in other environments
      removal: input?.stage === "production" ? "retain" : "remove",
      // Protect production resources from accidental deletion
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          // Add customer tag to all AWS resources for better organization and cost tracking
          defaultTags: {
            tags: { customer: CUSTOMER },
          },
        },
      },
    };
  },
  // Resource definition and deployment configuration
  async run() {
    // Step 1: Try to find an existing shared VPC
    // This is crucial for solving the VPC/security group limit problem
    const existingVpcId = await getOrCreateSharedVpc();

    // Step 2: Configure VPC settings based on whether we found an existing VPC
    const vpcConfig = {
      // If we found a VPC, don't create a new one (false); otherwise create one (true)
      create: existingVpcId ? false : true,
      name: VPC_NAME,
      availabilityZones: AVAILABILITY_ZONES,
      // If an existing VPC was found, add the importId property to use that VPC
      // This is the key to reusing the existing VPC instead of creating a new one
      ...(existingVpcId && { importId: existingVpcId }),
    };

    // Step 3: Define the API Lambda function with the shared VPC configuration
    // This ensures the function uses the shared VPC instead of creating its own
    const api = new sst.aws.Function(`${PROJECT_NAME}-api`, {
      handler: "packages/api/src/app.handler",
      url: true,
      // Associate the function with the shared VPC
      // This is where we apply our VPC reuse strategy
      vpc: vpcConfig,
    });

    // Step 4: Define the UI static site
    // Note: Static sites don't need VPC configuration as they're served from S3/CloudFront
    const ui = new sst.StaticSite(`${PROJECT_NAME}-ui`, {
      path: "packages/ui",
      buildCommand: "npm run build",
      buildOutput: "dist",
      environment: {
        VITE_API_URL: api.url,
      },
      indexPage: "index.html",
      errorPage: "index.html",
    });

    // Return the URLs of the deployed resources
    return {
      api: api.url,
      ui: ui.url,
    };
  },
});
