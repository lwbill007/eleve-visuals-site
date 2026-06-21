import { bookingSchema } from "@/lib/validation";
import { handleFormSubmit } from "@/lib/submit-handler";

export async function POST(request: Request) {
  return handleFormSubmit({
    request,
    route: "submit:booking",
    conversionType: "booking",
    schema: bookingSchema,
  });
}
