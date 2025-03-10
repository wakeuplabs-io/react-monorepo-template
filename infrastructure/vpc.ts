import { EC2Client, DescribeVpcsCommand } from "@aws-sdk/client-ec2";

// Configuration for the shared VPC
export const VPC_NAME = "shared-vpc";
// Define availability zones for the VPC
export const AVAILABILITY_ZONES = ["sa-east-1a", "sa-east-1b"]; 

/**
 * Function to check if a shared VPC already exists and return its ID
 * This helps solve the AWS limit on VPCs and security groups by reusing existing resources
 * @returns VPC ID if found, null if not found
 */
export async function getOrCreateSharedVpc() {
  // Create an EC2 client to interact with AWS EC2 API
  const ec2Client = new EC2Client({
    region: "sa-east-1",
  });

  // Command to describe VPCs and filter by name tag
  // This allows us to find a specific VPC by its name tag
  const command = new DescribeVpcsCommand({
    Filters: [
      { Name: "tag:Name", Values: [VPC_NAME] },
    ],
  });

  try {
    // Send the command to AWS to get VPC information
    const data = await ec2Client.send(command);

    if (data.Vpcs && data.Vpcs.length > 0) {
      // If we find an existing VPC with the specified name, use it
      // This is the key to resource reuse - we'll import this VPC instead of creating a new one
      const vpc = data.Vpcs[0];
      console.log("Existing VPC found:", vpc.VpcId);
      return vpc.VpcId;
    } else {
      // If no VPC is found, return null - a new one will be created during deployment
      console.log("VPC not found. A new one will be created automatically during deployment.");
      return null;
    }
  } catch (error) {
    // Handle any errors that occur during the AWS API call
    console.error("Error retrieving VPCs:", error);
    throw error;
  }
} 