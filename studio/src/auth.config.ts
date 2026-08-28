import type { NextAuthConfig } from "next-auth";

// Edge-safe config (no Prisma / Node-only APIs) used by middleware for
// session-cookie checks. The Credentials provider itself (which needs
// Prisma) is only added in auth.ts, used by route handlers and server
// components that run on the Node.js runtime.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Belt-and-suspenders alongside AUTH_TRUST_HOST=true in .env: trusts the
  // incoming Host header so auth works behind any deployment platform's
  // proxy (Vercel, Railway, etc.) without per-platform config.
  trustHost: true,
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
