// ── Location ──────────────────────────────────────────────

export interface LocationHours {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface Location {
  id: string;
  locationName: string;
  capacity: number;
  slotDurationMinutes: number;
  locationHours: LocationHours[];
}

// ── Booking ──────────────────────────────────────────────

export interface BookingSchedule {
  startTime: string;
  endTime: string;
  totalMinutes: number;
  allDay?: boolean;
}

export interface Contact {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
}

export interface RRuleDetails {
  freq?: string;
  interval?: number;
  until?: string;
  byDay?: string[];
}

export interface BookingModel {
  id: string;
  locationId: string;
  locationName: string;
  bookingSchedule: BookingSchedule[];
  contact: Contact;
  reasonOfBooking: string;
  noOfPersons: number;
  totalBillableAmount: number;
  urlToken: string;
  rRuleDetails?: RRuleDetails;
}

// ── Request / Response shapes ────────────────────────────

export interface AvailabilityRequest {
  fromDate: string;
  toDate: string;
  locationId: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface LocationListResponse {
  data: Location[];
  message?: string;
  success: boolean;
}

export interface AvailabilityResponse {
  data: AvailabilitySlot[];
  message?: string;
  success: boolean;
}

export interface BookingResponse {
  data: BookingModel;
  message?: string;
  success: boolean;
}

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  [key: string]: unknown;
}

export interface PaymentResponse {
  data: {
    paymentId: string;
    status: string;
    [key: string]: unknown;
  };
  message?: string;
  success: boolean;
}
