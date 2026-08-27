import { SocialPlatform } from "@prisma/client";
import { env } from "@/config/env";

/**
 * Real OAuth 2.0 configuration per platform, driven entirely by env credentials. A platform
 * is "configured" only when its client id + secret are present — otherwise the UI shows
 * "setup required" instead of connecting a fake account.
 *
 * Register each app in its developer console and set the redirect URI to:
 *   <APP_URL>/api/social/callback
 */
export interface OAuthConfig {
  platform: SocialPlatform;
  clientId: string;
  clientSecret: string;
  /** Some providers name the client id param differently (TikTok uses `client_key`). */
  clientIdParam: "client_id" | "client_key";
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /** Extra params appended to the authorize URL (e.g. Google offline access). */
  extraAuthParams?: Record<string, string>;
  redirectUri: string;
}

function redirectUri() {
  return `${env.appUrl}/api/social/callback`;
}

export function oauthConfig(platform: SocialPlatform): OAuthConfig {
  switch (platform) {
    case SocialPlatform.YOUTUBE:
      return {
        platform,
        // Reuse the Google app you may already have for login, or set YOUTUBE_CLIENT_ID/SECRET.
        clientId: process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
        clientIdParam: "client_id",
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scopes: [
          "https://www.googleapis.com/auth/youtube.readonly",
          "https://www.googleapis.com/auth/youtube.upload",
        ],
        extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
        redirectUri: redirectUri(),
      };
    case SocialPlatform.TIKTOK:
      return {
        platform,
        clientId: process.env.TIKTOK_CLIENT_KEY || "",
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
        clientIdParam: "client_key",
        authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
        tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
        scopes: ["user.info.basic", "video.upload", "video.publish"],
        redirectUri: redirectUri(),
      };
    case SocialPlatform.INSTAGRAM:
      return {
        platform,
        // Instagram publishing goes through the Facebook Graph API (Instagram Business account).
        clientId: process.env.FACEBOOK_APP_ID || "",
        clientSecret: process.env.FACEBOOK_APP_SECRET || "",
        clientIdParam: "client_id",
        authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
        tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
        scopes: [
          "instagram_basic",
          "instagram_content_publish",
          "pages_show_list",
          "business_management",
        ],
        redirectUri: redirectUri(),
      };
  }
}

export function isConfigured(platform: SocialPlatform): boolean {
  const c = oauthConfig(platform);
  return !!(c.clientId && c.clientSecret);
}

export function configuredPlatforms(): SocialPlatform[] {
  return (Object.values(SocialPlatform) as SocialPlatform[]).filter(isConfigured);
}
