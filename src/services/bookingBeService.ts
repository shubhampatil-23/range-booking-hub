import { http } from "./httpClient";
import type { CreateBookingRequest, CreateBookingResponse, BookingModel } from "@/types/api";

export const bookingBeService = {
  async createBooking(
    companyBeUrl: string,
    data: CreateBookingRequest
  ): Promise<CreateBookingResponse> {
    return http.post<CreateBookingResponse>(companyBeUrl, "booking/create", data);
  },

  async updateBooking(
    companyBeUrl: string,
    id: string,
    data: Partial<BookingModel>
  ): Promise<CreateBookingResponse> {
    return http.post<CreateBookingResponse>(companyBeUrl, `booking/update/${id}`, data);
  },

  async getBookingById(
    companyBeUrl: string,
    id: string
  ): Promise<BookingModel> {
    return http.get<BookingModel>(companyBeUrl, `booking/${id}`);
  },
};
