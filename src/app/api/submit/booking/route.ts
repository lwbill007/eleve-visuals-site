import { createBookingSchema } from "@/lib/validation";
import { getBookingOptions } from "@/lib/content";
import { handleFormSubmit } from "@/lib/submit-handler";

export async function POST(request: Request) {
  const bookingOptions = await getBookingOptions();

  return handleFormSubmit({
    request,
    route: "submit:booking",
    conversionType: "booking",
    schema: createBookingSchema(bookingOptions),
    analyticsPath: "/book",
  });
}
