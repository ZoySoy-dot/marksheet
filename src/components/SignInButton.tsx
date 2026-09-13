"use client";

import { signIn } from "next-auth/react";

type Props = {
  className?: string;
  children?: React.ReactNode;
  /** Where to land after Google sends them back. Defaults to the current page. */
  callbackUrl?: string;
};

/** Google is the only way in, so there is nothing to choose between. */
export default function SignInButton({
  className = "btn btn-quiet",
  children = "Sign in with Google",
  callbackUrl,
}: Props) {
  return (
    <button className={className} type="button" onClick={() => signIn("google", { callbackUrl })}>
      {children}
    </button>
  );
}
