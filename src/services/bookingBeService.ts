import axiosInstance from "./axiosInstance";
import type { BookingModel, BookingResponse } from "@/types/api";

export const bookingBeService = {
  /** Create a new booking */
  createBooking(
    companyBeUrl: string,
    data: Partial<BookingModel>
  ): Promise<BookingResponse> {
    return axiosInstance
      .post<BookingResponse>(`${companyBeUrl}booking/create`, data)
      .then((r) => r.data);
  },

  /** Update an existing booking */
  updateBooking(
    companyBeUrl: string,
    id: string,
    data: Partial<BookingModel>
  ): Promise<BookingResponse> {
    return axiosInstance
      .post<BookingResponse>(`${companyBeUrl}booking/update/${id}`, data)
      .then((r) => r.data);
  },

  /** Fetch a booking by ID */
  getBookingById(
    companyBeUrl: string,
    id: string
  ): Promise<BookingResponse> {
    return axiosInstance
      .get<BookingResponse>(`${companyBeUrl}booking/${id}`)
      .then((r) => r.data);
  },
};
