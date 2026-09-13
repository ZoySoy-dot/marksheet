"use client";

import { SessionProvider as AuthSessionProvider } from "next-auth/react";

/** Auth.js needs a client boundary for useSession; the layout is a server component. */
export default function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthSessionProvider>{children}</AuthSessionProvider>;
}
