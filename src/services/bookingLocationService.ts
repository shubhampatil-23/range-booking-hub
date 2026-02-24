import axiosInstance from "./axiosInstance";
import type { Location, LocationListResponse } from "@/types/api";

export const bookingLocationService = {
  /** Fetch all locations for the public booking page */
  getAllLocationsForBooking(
    companyUrl: string,
    companyToken: string
  ): Promise<LocationListResponse> {
    return axiosInstance
      .post<LocationListResponse>(
        `${companyUrl}location/getbyurltoken/${companyToken}`,
        {}
      )
      .then((r) => r.data);
  },

  /** Get a single location by ID */
  getById(companyUrl: string, id: string): Promise<Location> {
    return axiosInstance
      .get<Location>(`${companyUrl}location/${id}`)
      .then((r) => r.data);
  },

  /** List locations with optional filters */
  getAll(
    companyUrl: string,
    filters: Record<string, unknown> = {}
  ): Promise<LocationListResponse> {
    return axiosInstance
      .post<LocationListResponse>(`${companyUrl}location`, filters)
      .then((r) => r.data);
  },
};
