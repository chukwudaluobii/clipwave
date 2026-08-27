import { SocialPlatform } from "@prisma/client";
import { oauthConfig, isConfigured, type OAuthConfig } from "./oauth-config";

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface Identity {
  handle: string;
  externalId: string;
}

export interface PublishInput {
  videoUrl: string;
  videoPath?: string;
  title: string;
  description?: string;
  hashtags?: string[];
  tokens: TokenSet;
}

export interface PublishResult {
  externalId: string;
  url?: string;
}

/**
 * A real OAuth 2.0 authorization-code provider. Handles the standard flow for all platforms;
 * per-platform quirks (TikTok's `client_key`, identity endpoints) are handled inline.
 */
export class OAuthProvider {
  readonly config: OAuthConfig;
  constructor(public platform: SocialPlatform) {
    this.config = oauthConfig(platform);
  }

  isConfigured() {
    return isConfigured(this.platform);
  }

  /** The provider consent URL the user is redirected to. */
  authorizeUrl(state: string): string {
    const c = this.config;
    const u = new URL(c.authorizeUrl);
    u.searchParams.set(c.clientIdParam, c.clientId);
    u.searchParams.set("redirect_uri", c.redirectUri);
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", c.scopes.join(" "));
    u.searchParams.set("state", state);
    for (const [k, v] of Object.entries(c.extraAuthParams ?? {})) u.searchParams.set(k, v);
    return u.toString();
  }

  /** Exchange the authorization code for tokens, then load the account identity. */
  async connect(code: string): Promise<TokenSet & Identity> {
    const tokens = await this.exchangeCode(code);
    const identity = await this.fetchIdentity(tokens.accessToken);
    return { ...tokens, ...identity };
  }

  private async exchangeCode(code: string): Promise<TokenSet> {
    const c = this.config;
    const body = new URLSearchParams({
      [c.clientIdParam]: c.clientId,
      client_secret: c.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: c.redirectUri,
    });
    const res = await fetch(c.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`${this.platform} token exchange failed ${res.status}: ${await res.text()}`);
    const data: any = await res.json();
    // TikTok nests fields at the top level too; both shapes covered here.
    const accessToken = data.access_token;
    if (!accessToken) throw new Error(`${this.platform} returned no access_token: ${JSON.stringify(data)}`);
    return {
      accessToken,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  private async fetchIdentity(accessToken: string): Promise<Identity> {
    switch (this.platform) {
      case SocialPlatform.YOUTUBE: {
        const r = await fetch(
          "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
          { headers: { authorization: `Bearer ${accessToken}` } },
        );
        const d: any = await r.json();
        const ch = d.items?.[0];
        if (!ch) throw new Error("No YouTube channel found for this account.");
        return { handle: ch.snippet?.title ?? "YouTube channel", externalId: ch.id };
      }
      case SocialPlatform.TIKTOK: {
        const r = await fetch(
          "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
          { headers: { authorization: `Bearer ${accessToken}` } },
        );
        const d: any = await r.json();
        const user = d.data?.user;
        if (!user) throw new Error("Could not load TikTok profile.");
        return { handle: `@${user.display_name}`, externalId: user.open_id };
      }
      case SocialPlatform.INSTAGRAM: {
        // Identity via the Facebook user; the linked Instagram business account is resolved
        // at publish time from the user's Pages.
        // TODO(integration): resolve the IG business account id (me/accounts → instagram_business_account).
        const r = await fetch(
          `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${accessToken}`,
        );
        const d: any = await r.json();
        if (!d.id) throw new Error("Could not load Facebook/Instagram profile.");
        return { handle: d.name ?? "Instagram account", externalId: d.id };
      }
    }
  }

  /**
   * Publish a clip. Connecting accounts is fully implemented; the actual upload calls differ
   * a lot per platform and are left as clearly-marked integration points.
   * TODO(integration): YouTube videos.insert (resumable), TikTok /v2/post/publish/video/init,
   * Instagram media container + publish.
   */
  async publish(_input: PublishInput): Promise<PublishResult> {
    throw new Error(
      `Publishing to ${this.platform} is not implemented yet. OAuth connection works; wire up the upload API in oauth-provider.publish().`,
    );
  }
}
