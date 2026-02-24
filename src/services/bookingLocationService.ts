import { http } from "./httpClient";
import type { Location, LocationListResponse, LocationDetailResponse } from "@/types/api";

let locationCache: Location[] | null = null;

export const bookingLocationService = {
  async getAllLocationsForBooking(
    companyBeUrl: string,
    companyToken: string
  ): Promise<Location[]> {
    if (locationCache) return locationCache;
    const res = await http.post<LocationListResponse>(
      companyBeUrl,
      `location/getbyurltoken/${companyToken}`,
      {}
    );
    locationCache = res.locations ?? [];
    return locationCache;
  },

  async getById(companyBeUrl: string, id: string): Promise<Location> {
    return http.get<LocationDetailResponse>(companyBeUrl, `location/${id}`);
  },

  clearCache() {
    locationCache = null;
  },
};
