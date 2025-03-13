/// <reference path="./.sst/platform/config.d.ts" />
import { EC2Client, DescribeVpcsCommand } from "@aws-sdk/client-ec2";

// Project configuration constants
const PROJECT_NAME: string = "testing-monorepo-1";  // Must be set by developer
const CUSTOMER: string = "testing";      // Must be set by developer

// We can alternate between regions to create the VPC in a different region, take in mind that we can only use one region per VPC
// in case we want to use N.virginia we can use the secret SST_AWS_REGION_ALT
const AWS_REGION = `${process.env.SST_AWS_REGION}`;
const AVAILABILITY_ZONES = [`${AWS_REGION}a`, `${AWS_REGION}b`];

// VPC configuration
// You can leave these default values unless you need specific VPC settings
const VPC_NAME = "shared-vpc";
const VPC_ID = "vpc-00b7f7fb871e913fb"

/**
 * VPC Configuration Notes:
 * 
 * VPCs are not required for all AWS services:
 * - Not Required: Lambda functions, Static websites, S3 buckets
 * - Required: EC2 instances, RDS databases, ECS containers
 * 
 * We need VPC configuration when:
 * 1. Running containerized applications (ECS/EKS)
 * 2. Hosting databases (RDS, ElastiCache)
 * 3. Running EC2 instances
 * 4. Requiring specific network isolation or security
 * 
 * For serverless applications (Lambda + S3 + API Gateway), 
 * you can skip VPC configuration unless you need private network access.
 */

/**
 * Retrieves an existing VPC by its name tag or creates a new one if not found.
 * 
 * This function performs the following steps:
 * 1. Searches for a VPC using the provided name tag
 * 2. If found and matches the expected VPC_ID:
 *    - Returns the existing VPC instance
 * 3. If not found or VPC_ID doesn't match:
 *    - Creates a new VPC with the specified availability zones
 * 
 * @param {EC2Client} ec2Client - AWS EC2 client instance for making API calls
 * @param {string} vpcNameTag - The name tag to search for or use when creating a new VPC
 * @returns {Promise<sst.aws.Vpc>} Returns either the existing or newly created VPC
 * 
 * @example
 * const vpc = await getOrCreateVpc(ec2Client, "shared-vpc");
 * 
 * @remarks
 * - The function uses AWS SDK v3's EC2Client for VPC operations
 * - VPC creation is only needed for services requiring network isolation:
 *   - EC2 instances
 *   - RDS databases
 *   - ECS containers
 *   - Services requiring private network access
 * - Serverless services (Lambda, S3, API Gateway) don't require VPC by default
 */
async function getOrCreateVpc(ec2Client: EC2Client, vpcNameTag: string) {
  // Create a command to get the VPC information using name tag filter
  const commandToGetSpecificVpc = new DescribeVpcsCommand({
    Filters:[{
      Name: "tag:Name",
      Values: [vpcNameTag]
    }]
  });

  // Execute this command to get the VPC information
  const {Vpcs: specificVpc} = await ec2Client.send(commandToGetSpecificVpc);

  if(specificVpc.length > 0 && specificVpc[0].VpcId === VPC_ID) {
    console.log("VPC found")
    return sst.aws.Vpc.get(VPC_NAME, VPC_ID);
  } else {
    console.log("VPC not found & creating new VPC")
    return new sst.aws.Vpc(VPC_NAME, { az: AVAILABILITY_ZONES});
  }
}

// Validation function for project configuration
function validateConfig() {
  const errors: string[] = [];
  
  if (!PROJECT_NAME || PROJECT_NAME.trim() === "") {
    errors.push("PROJECT_NAME must be set (e.g., 'testing-monorepo-1')");
  }
  
  if (!CUSTOMER || CUSTOMER.trim() === "") {
    errors.push("CUSTOMER must be set (e.g., 'testing')");
  }

  if (errors.length > 0) {
    // Print error directly to console
    console.error("\n\n==============================================");
    console.error("⛔️ Configuration Error");
    console.error("==============================================");
    console.error("Missing required values in sst.config.ts:");
    errors.forEach(err => console.error(`  • ${err}`));
    console.error("\n❌ Deployment blocked until these values are set");
    console.error("==============================================\n\n");
    
    // Also throw error for SST to catch
    throw new Error("Configuration validation failed");
  }
}

export default $config({
  app(input) {
    // Validate configuration before proceeding
    validateConfig();

    return {
      name: PROJECT_NAME,
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          defaultTags: {
            tags: { customer: CUSTOMER },
          },
        },
      },
    };
  },
  async run() {
    // Validate configuration again in case run() is called directly
    validateConfig();
    
    const ec2Client = new EC2Client({ region: AWS_REGION });
    const vpc = await getOrCreateVpc(ec2Client, VPC_NAME);
   
    const api = new sst.aws.Function(`${PROJECT_NAME}-api`, {
      handler: "packages/api/src/app.handler",
      url: true
    });

    /**
     * Example: Setting up Custom Domains with SST
     * 
     * Below is an example of how to configure custom domains for different AWS services:
     * 
     * 1. ECS Service with API Gateway:
     * - Creates an ECS service with service discovery
     * - Exposes it through API Gateway with a custom domain
     * - Useful for containerized applications that need a custom domain
     * 
     * You can use this as a reference and modify/remove as needed.
     * @see https://sst.dev/docs/component/aws/service
     */
    // const service = new sst.aws.Service("MyService", {
    //   cluster,
    // Configure service discovery for ECS
    //   serviceRegistry: {
    //     port: 80
    //   }
    // });
    
    // Set up API Gateway with custom domain
    // const apiGateway = new sst.aws.ApiGatewayV2("MyApi", {
    //   domain: {
    //     // Example: Using stage in domain name for different environments
    //     name: `${$app.stage}-${PROJECT_NAME}-api.wakeuplabs.link`,
    //     // Optional: You can also specify hostedZone if domain is in Route53
    //     // hostedZone: "your-domain.com"
    //   },
    // });
    // Route all traffic to the ECS service
    // apiGateway.routePrivate("$default", service.nodes.cloudmapService.arn);

    const ui = new sst.aws.StaticSite(`${PROJECT_NAME}-ui`, {
      path: "packages/ui",
      domain: {
        name: `${$app.stage}-${PROJECT_NAME}.wakeuplabs.link`,
      },
      build: {
        command: "npm run build",
        output: "dist",
      },
      environment: {
        VITE_API_URL: api.url,
      },
      indexPage: "index.html",
      errorPage: "index.html",
    });
  
    return {
      api: api.url,
      ui: ui.url,
    };
  },
});
