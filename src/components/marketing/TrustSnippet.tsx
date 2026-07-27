import type { TestimonialDTO } from "@/lib/types";

export function TrustSnippet({
  testimonial,
  responseTime,
  serviceArea,
}: {
  testimonial: TestimonialDTO | null;
  responseTime?: string;
  serviceArea?: string;
}) {
  if (!testimonial && !responseTime && !serviceArea) return null;

  return (
    <div className="space-y-6 border border-stone/40 p-6">
      {testimonial && (
        <div>
          <p className="body-lg text-cream-dim italic">&ldquo;{testimonial.quote}&rdquo;</p>
          <p className="mt-3 text-xs tracking-[0.15em] text-fog uppercase">
            {testimonial.name}
            {testimonial.role ? ` — ${testimonial.role}` : ""}
          </p>
        </div>
      )}
      {(responseTime || serviceArea) && (
        <div className="space-y-3 border-t border-stone/30 pt-6">
          {responseTime && (
            <div>
              <p className="label-caps mb-1">Response Time</p>
              <p className="text-sm text-fog">{responseTime}</p>
            </div>
          )}
          {serviceArea && (
            <div>
              <p className="label-caps mb-1">Service Area</p>
              <p className="text-sm text-fog">{serviceArea}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
