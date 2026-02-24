import axiosInstance from "./axiosInstance";
import type { AvailabilityRequest, AvailabilityResponse } from "@/types/api";

export const bookingAvailabilityService = {
  /** Fetch available slots between two dates for a location */
  getByDates(
    companyUrl: string,
    data: AvailabilityRequest
  ): Promise<AvailabilityResponse> {
    const base = companyUrl.replace(/\/?$/, "/");
    return axiosInstance
      .post<AvailabilityResponse>(`${base}booking/getbydates`, data)
      .then((r) => r.data);
  },
};
