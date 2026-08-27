import { SocialPlatform } from "@prisma/client";
import { OAuthProvider } from "./oauth-provider";

export type { PublishInput, PublishResult, TokenSet, Identity } from "./oauth-provider";
export { isConfigured, configuredPlatforms } from "./oauth-config";

/**
 * Real OAuth-backed social providers. Connecting an account performs a genuine OAuth 2.0
 * authorization-code flow and stores real access/refresh tokens. Platforms without configured
 * credentials report `isConfigured() === false` so the UI can prompt for setup instead of
 * connecting a fake account.
 */
const registry: Record<SocialPlatform, OAuthProvider> = {
  TIKTOK: new OAuthProvider("TIKTOK"),
  YOUTUBE: new OAuthProvider("YOUTUBE"),
  INSTAGRAM: new OAuthProvider("INSTAGRAM"),
};

export function publisher(platform: SocialPlatform): OAuthProvider {
  return registry[platform];
}
