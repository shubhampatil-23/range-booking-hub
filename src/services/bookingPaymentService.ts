import axiosInstance from "./axiosInstance";
import type { PaymentRequest, PaymentResponse } from "@/types/api";

export const bookingPaymentService = {
  /** Create a payment for a booking */
  createPayment(
    companyBeUrl: string,
    data: PaymentRequest
  ): Promise<PaymentResponse> {
    return axiosInstance
      .post<PaymentResponse>(`${companyBeUrl}booking/payment/create`, data)
      .then((r) => r.data);
  },
};
