import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { provisionNewUser } from "./provisioning";

/**
 * Auth config. Uses JWT sessions so it runs with no database session table.
 * - Credentials provider = simple email dev-login (creates the user on first sign-in).
 * - Google OAuth is enabled automatically when GOOGLE_CLIENT_ID/SECRET are set.
 *
 * TODO(integration): for production email auth, swap Credentials for an Email (magic-link)
 * provider + the Prisma adapter, or keep Credentials with a real password hash.
 */
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: { email: { label: "Email", type: "email" } },
    async authorize(creds) {
      const email = creds?.email?.toString().trim().toLowerCase();
      if (!email || !email.includes("@")) return null;
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name: email.split("@")[0] },
      });
      await provisionNewUser(user.id);
      return { id: user.id, email: user.email, name: user.name ?? undefined };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth, ensure a local user row exists keyed by email.
      if (account?.provider === "google" && user.email) {
        const u = await prisma.user.upsert({
          where: { email: user.email },
          update: { name: user.name ?? undefined, image: user.image ?? undefined },
          create: { email: user.email, name: user.name ?? undefined, image: user.image ?? undefined },
        });
        (user as any).id = u.id;
        await provisionNewUser(u.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).id = token.uid as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
