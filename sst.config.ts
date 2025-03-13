/// <reference path="./.sst/platform/config.d.ts" />
import { EC2Client, DescribeVpcsCommand } from "@aws-sdk/client-ec2";

// Project configuration constants
const PROJECT_NAME = "testing-monorepo-1";
const CUSTOMER = "testing";

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
 * Handles VPC creation or retrieval logic
 * This function will:
 * 1. Try to find an existing VPC by name tag
 * 2. If not found, check if we've reached max VPCs
 * 3. If we haven't reached max, create a new VPC
 */
async function getOrCreateVpc(ec2Client: EC2Client, vpcNameTag: string) {
  // Create a command to get the VPC information
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

export default $config({
  app(input) {
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
