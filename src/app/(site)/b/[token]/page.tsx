import type { Metadata } from "next";
import { PageHero } from "@/components/ui/Section";
import { prisma } from "@/lib/db";
import { verifyBookingAccessToken } from "@/lib/booking-access-token";
import { getBookingTerms } from "@/lib/content";
import { estimateSubmissionValue } from "@/lib/estimate-budget";
import { getPackageById } from "@/lib/booking-packages";
import { VERIFIED_SETTLED_PAYMENT_WHERE, dollarsFromCents } from "@/lib/payments";
import { ContractSignForm } from "@/components/booking-portal/ContractSignForm";
import { DepositSection } from "@/components/booking-portal/DepositSection";

export const metadata: Metadata = {
  title: "Your ÉLEVÉ Booking",
  robots: { index: false, follow: false },
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default async function BookingPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const submissionId = await verifyBookingAccessToken(token);

  if (!submissionId) {
    return (
      <section className="section-padding">
        <div className="container-narrow text-center">
          <h1 className="headline-md mb-4">Link expired</h1>
          <p className="body-md text-muted">
            This link is no longer valid. Please contact ÉLEVÉ Visuals for a new one.
          </p>
        </div>
      </section>
    );
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return (
      <section className="section-padding">
        <div className="container-narrow text-center">
          <h1 className="headline-md mb-4">Booking not found</h1>
        </div>
      </section>
    );
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    data = {};
  }

  const clientName = asString(data.fullName) || "there";
  const pkg = getPackageById(asString(data.packageId) || "");
  const packageName = pkg?.name || asString(data.packageId) || "ÉLEVÉ Experience";
  const totalValue = estimateSubmissionValue(data);
  const depositAmount = Math.round(totalValue * 0.5);
  const contract = data.contract as
    | { status?: string; signedAt?: string; signerName?: string }
    | undefined;
  const terms = await getBookingTerms();
  const payment = await prisma.payment.findFirst({
    where: { ...VERIFIED_SETTLED_PAYMENT_WHERE, submissionId },
    orderBy: { paidAt: "desc" },
  });

  return (
    <>
      <PageHero
        eyebrow="Your Booking"
        headline={`Welcome back, ${clientName}`}
        subheadline={`${packageName} — a secure, private link just for you.`}
        compact
      />

      <section className="section-padding pt-0">
        <div className="container-narrow space-y-10">
          <ContractSignForm
            submissionId={submissionId}
            token={token}
            terms={terms}
            clientName={clientName}
            packageName={packageName}
            preferredDate={asString(data.preferredDate) || undefined}
            totalValue={totalValue}
            depositAmount={depositAmount}
            initialStatus={contract?.status === "signed" ? "signed" : "unsigned"}
            signedAt={contract?.signedAt}
            signerName={contract?.signerName}
          />

          <DepositSection
            token={token}
            depositAmount={depositAmount}
            initialPaid={Boolean(payment)}
            paidAmount={payment ? dollarsFromCents(payment.amountCents) : undefined}
            paidAt={payment?.paidAt.toISOString()}
          />
        </div>
      </section>
    </>
  );
}
