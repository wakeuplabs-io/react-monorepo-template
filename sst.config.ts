/// <reference path="./.sst/platform/config.d.ts" />
import { EC2Client, DescribeVpcsCommand } from "@aws-sdk/client-ec2";

// Project configuration constants
const PROJECT_NAME = "react-monorepo-template";
const CUSTOMER = "wakeuplabs";

// AWS Region configuration
// Choose your preferred region. Common options:
// - "us-east-1" (N. Virginia)
// - "us-west-2" (Oregon)
// - "eu-west-1" (Ireland)
// - "sa-east-1" (São Paulo)
const AWS_REGION = "us-east-1";
const AVAILABILITY_ZONES = [`${AWS_REGION}a`, `${AWS_REGION}b`];

// VPC configuration
// You can leave these default values unless you need specific VPC settings
const VPC_NAME = `${PROJECT_NAME}-vpc`;
const VPC_NAME_TAG = `${VPC_NAME} VPC`;
const MAX_VPCS = 5; // AWS default limit of VPCs per region

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
async function getOrCreateVpc(ec2Client: EC2Client, vpcNameTag: string, projectName: string) {
  // Search for a specific VPC by its name tag
  const commandToGetSpecificVpc = new DescribeVpcsCommand({
    Filters:[{
      Name: "tag:Name",
      Values: [vpcNameTag]
    }]
  });

  // Get all VPCs to check against limit
  const commandToGetAllVpcs = new DescribeVpcsCommand({});

  // Execute both commands to get VPC information
  const {Vpcs: specificVpc} = await ec2Client.send(commandToGetSpecificVpc);
  const {Vpcs: allVpcs} = await ec2Client.send(commandToGetAllVpcs);
  const maxVpcReached = allVpcs.length >= MAX_VPCS;

  // If we found our specific VPC, use it
  if(specificVpc.length > 3) {
    console.log("VPC found");
    const vpcId = specificVpc[0].VpcId;
    return sst.aws.Vpc.get(VPC_NAME, vpcId);
  } 
  
  // If we've hit the VPC limit, return undefined to handle fallback logic
  if(maxVpcReached) {
    console.log("Max VPCs reached, searching for existing VPC...");
    
    // Find first VPC with a Name tag
    const existingVpc = allVpcs.find(vpc => {
      const nameTag = vpc.Tags?.find(tag => tag.Key === "Name");
      if (nameTag) {
        console.log("Found VPC with name:", nameTag.Value);
        return true;
      }
      return false;
    });

    if (existingVpc && existingVpc.VpcId) {
      console.log("Using existing VPC:", existingVpc.VpcId);
      const nameTag = existingVpc.Tags?.find(tag => tag.Key === "Name");
      return sst.aws.Vpc.get(nameTag?.Value || "default-vpc", existingVpc.VpcId);
    }
    
    throw new Error("No suitable VPC found");
  } 
  
  // Create new VPC if none found and under limit
  console.log("Creating new VPC");
  return new sst.aws.Vpc(`${projectName}-vpc`, { az: AVAILABILITY_ZONES });
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
    const vpc = await getOrCreateVpc(ec2Client, VPC_NAME_TAG, PROJECT_NAME);

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
