import { http } from "./httpClient";
import type { AvailabilityRequest, AvailabilityResponse } from "@/types/api";

export const bookingAvailabilityService = {
  async getByDates(
    companyBeUrl: string,
    data: AvailabilityRequest
  ): Promise<AvailabilityResponse> {
    return http.post<AvailabilityResponse>(companyBeUrl, "booking/getbydates", data);
  },
};
