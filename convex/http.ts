import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Exposes /.well-known/openid-configuration and /.well-known/jwks.json
// so Convex can verify JWTs issued by @convex-dev/auth.
auth.addHttpRoutes(http);

export default http;
