/// <reference path="./.sst/platform/config.d.ts" />

const PROJECT_NAME = "react-monorepo-template";
const CUSTOMER = "wakeuplabs";

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
