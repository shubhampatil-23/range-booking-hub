import { http } from "./httpClient";
import type { Location, LocationListResponse, LocationDetailResponse } from "@/types/api";

let locationCache: Location[] | null = null;

export const bookingLocationService = {
  async getAllLocationsForBooking(
    companyBeUrl: string,
    companyToken: string
  ): Promise<Location[]> {
    if (locationCache) return locationCache;
    const res = await http.post<
      LocationListResponse | { data?: { locations?: Location[] } }
    >(companyBeUrl, `location/getbyurltoken/${companyToken}`, {});
    const list = res.locations ?? (res as { data?: { locations?: Location[] } }).data?.locations ?? [];
    locationCache = list;
    return locationCache;
  },

  async getById(companyBeUrl: string, id: string): Promise<Location> {
    const res = await http.get<LocationDetailResponse | { data: Location }>(
      companyBeUrl,
      `location/${id}`
    );
    // Unwrap common API response wrapper: { data: Location }
    const loc = (res as { data?: Location }).data ?? res;
    return loc as Location;
  },

  clearCache() {
    locationCache = null;
  },
};
