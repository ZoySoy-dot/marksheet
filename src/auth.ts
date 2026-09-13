import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google sign-in, and nothing else.
 *
 * No database adapter: the session is a signed JWT, and the only thing we keep
 * of a person is the id we already write onto their quizzes, attempts and
 * cards. That id is Google's stable subject claim.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  // Vercel fixes the Host header at the edge, so it can be trusted. Without
  // this a production build refuses every request with UntrustedHost, which
  // also bites when running `next start` locally.
  trustHost: true,
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/** The signed-in person's id, or null. The shape every route wants. */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Id, plus the name and picture a leaderboard needs. */
export async function currentUser(): Promise<{
  id: string;
  name: string | null;
  image: string | null;
} | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return {
    id,
    name: session.user.name?.trim() || null,
    image: session.user.image?.trim() || null,
  };
}
