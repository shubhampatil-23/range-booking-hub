import { http } from "./httpClient";
import type { PaymentRequest, PaymentResponse } from "@/types/api";

export const bookingPaymentService = {
  async createPayment(
    companyBeUrl: string,
    data: PaymentRequest
  ): Promise<PaymentResponse> {
    return http.post<PaymentResponse>(companyBeUrl, "booking/payment/create", data);
  },
};
