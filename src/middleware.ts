import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Reads the signed-in user onto every request. Nothing is protected here on
 * purpose: share links, the take page and the attempts endpoint have to work
 * for people who are not signed in, and for people with no account at all.
 * Ownership is enforced per-route instead.
 *
 * On Next 16 this file is named proxy.ts. We are on 15.5, so it is middleware.ts.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
