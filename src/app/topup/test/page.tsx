import type { Metadata } from "next";
import { auth } from "@/auth";
import TestPay from "@/components/TestPay";
import { isConfigured } from "@/lib/paymongo";
import { testPackEnabled, TEST_PACK } from "@/lib/usage";

/**
 * A one peso payment, for proving the path works before charging anyone.
 *
 * Not linked from anywhere and kept out of every index. The page being hard to
 * find is not what protects it, though: the pack itself is refused unless
 * SAGOT_TEST_PACK is set, so this renders as a dead end on any deployment that
 * has not switched it on.
 */
export const metadata: Metadata = {
  title: "Test payment",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TestPayPage() {
  const session = await auth();
  const enabled = testPackEnabled() && isConfigured();

  return (
    <div className="screen screen-narrow">
      <h1 className="display display-md">Test payment</h1>
      <p className="deck">
        Buys the ₱{TEST_PACK.php} pack, {TEST_PACK.tokens.toLocaleString()} tokens, through Maya
        or QR Ph. Real money, in the smallest amount PayMongo will take, so the whole path can be
        watched end to end.
      </p>

      {!session?.user?.id ? (
        <p className="note">Sign in first. A payment has to land on an account.</p>
      ) : !enabled ? (
        <p className="note">
          Switched off here. This needs SAGOT_TEST_PACK=1 and both PayMongo keys on the
          deployment.
        </p>
      ) : (
        <TestPay />
      )}
    </div>
  );
}
