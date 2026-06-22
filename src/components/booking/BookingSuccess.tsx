"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FormSuccess } from "@/components/ui/Form";
import { formatInquiryId } from "@/lib/booking";

export function BookingSuccess({
  title,
  message,
  nextSteps,
  inquiryId,
}: {
  title: string;
  message: string;
  nextSteps: string[];
  inquiryId?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-none border border-stone/30 bg-charcoal/20 p-8 backdrop-blur-sm md:p-12"
    >
      {inquiryId && (
        <p className="label-caps mb-6 text-center text-accent">
          Inquiry #{formatInquiryId(inquiryId)}
        </p>
      )}
      <FormSuccess
        title={title}
        message={message}
        nextSteps={nextSteps}
        actionLabel="Back to home"
        actionHref="/"
      />
      <p className="mt-8 text-center text-xs text-muted">
        Questions?{" "}
        <Link href="/contact" className="text-accent link-underline hover:text-cream">
          Contact us directly
        </Link>
      </p>
    </motion.div>
  );
}
