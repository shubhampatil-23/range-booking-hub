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
    const res = await http.get<
      BookingModel | { data?: BookingModel; booking?: BookingModel }
    >(companyBeUrl, `booking/getbyid/${id}`);
    const raw = res as { data?: BookingModel; booking?: BookingModel };
    const booking = raw?.data ?? raw?.booking ?? (res as BookingModel);
    return booking as BookingModel;
  },
};
