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

    return {
      api: api.url
    }
  },
});
