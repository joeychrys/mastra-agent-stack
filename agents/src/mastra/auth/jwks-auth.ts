import type { MastraAuthProviderOptions } from "@mastra/core/server";
import { MastraAuthProvider } from "@mastra/core/server";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

interface JwksUser extends JWTPayload {
  id: string;
}

interface JwksAuthOptions extends MastraAuthProviderOptions<JwksUser> {
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
}

export class JwksAuth extends MastraAuthProvider<JwksUser> {
  protected jwksUrl: string;
  protected issuer: string;
  protected audience: string;
  private jwks: ReturnType<typeof createRemoteJWKSet>;

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
    this.jwks = createRemoteJWKSet(new URL(this.jwksUrl));

    this.registerOptions(options);
  }

  async authenticateToken(token: string): Promise<JwksUser | null> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer || undefined,
        audience: this.audience || undefined,
      });

      if (!payload.sub) {
        return null;
      }

      return { ...payload, id: payload.sub };
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
