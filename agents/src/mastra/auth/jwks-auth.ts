import type { JwtPayload } from "@mastra/auth";
import { verifyJwks } from "@mastra/auth";
import type { MastraAuthProviderOptions } from "@mastra/core/server";
import { MastraAuthProvider } from "@mastra/core/server";

type JwksUser = JwtPayload;

interface JwksAuthOptions extends MastraAuthProviderOptions<JwksUser> {
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
}

export class JwksAuth extends MastraAuthProvider<JwksUser> {
  protected jwksUrl: string;
  protected issuer: string;
  protected audience: string;

  constructor(options?: JwksAuthOptions) {
    super({ name: options?.name ?? "jwks-auth" });

    const jwksUrl = options?.jwksUrl ?? process.env.JWKS_URL;
    const issuer = options?.issuer ?? process.env.JWT_ISSUER;
    const audience = options?.audience ?? process.env.JWT_AUDIENCE;

    if (!jwksUrl) {
      throw new Error(
        "JWKS URL is required. Provide it in options or set the JWKS_URL environment variable.",
      );
    }

    this.jwksUrl = jwksUrl;
    this.issuer = issuer ?? "";
    this.audience = audience ?? "";

    this.registerOptions(options);
  }

  async authenticateToken(token: string): Promise<JwksUser | null> {
    try {
      const payload = await verifyJwks(token, this.jwksUrl);

      if (this.issuer && payload.iss !== this.issuer) {
        return null;
      }

      if (this.audience && payload.aud !== this.audience) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  async authorizeUser(user: JwksUser): Promise<boolean> {
    if (user.exp && user.exp * 1000 < Date.now()) {
      return false;
    }
    return !!user.sub;
  }
}
