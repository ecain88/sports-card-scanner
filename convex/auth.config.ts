export default {
  providers: [
    {
      // Tell Convex to trust JWTs issued by @convex-dev/auth on this deployment.
      // The JWKS endpoint is at <CONVEX_SITE_URL>/.well-known/openid-configuration
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
