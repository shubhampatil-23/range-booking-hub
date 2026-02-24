// ── Location ──────────────────────────────────────────────

export interface LocationHours {
  day: string;
  /** Backend may send openTime or openingTime */
  openTime?: string;
  closeTime?: string;
  openingTime?: string;
  closingTime?: string;
  isClosed?: boolean;
}

export interface Location {
  id: string;
  locationName: string;
  capacity?: number | null;
  /** Backend may send any of these three field names */
  slotDuration?: number | null;
  slotDurationMinutes?: number | null;
  slotDurationInMinutes?: number | null;
  locationHours?: LocationHours[];
}

/** Find slotDuration (number) anywhere in object — handles nesting and snake_case */
function findSlotDurationInObject(obj: unknown): number | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const candidates = [
    record.slotDuration,
    record.slotDurationMinutes,
    record.slotDurationInMinutes,
    record.slot_duration,
    record.slot_duration_minutes,
  ];
  for (const c of candidates) {
    const n = typeof c === "string" ? parseInt(c, 10) : c;
    if (typeof n === "number" && !Number.isNaN(n) && n > 0) return Math.floor(n);
  }
  for (const v of Object.values(record)) {
    const found = findSlotDurationInObject(v);
    if (found != null) return found;
  }
  return null;
}

/** Helper to normalise whichever field the backend sends */
export function getSlotDuration(loc: Location): number {
  const found = findSlotDurationInObject(loc);
  return found ?? 60;
}

// ── Booking ──────────────────────────────────────────────

export interface BookingSchedule {
  startTime: string;
  endTime: string;
  totalMinutes: number;
  allDay?: boolean;
}

export interface ContactAddress {
  city?: string;
  line1?: string;
  line2?: string;
  state?: string;
  zip?: string;
}

export interface Contact {
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  address?: ContactAddress;
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
  noOfPersons: number | string;
  totalBillableAmount: number;
  urlToken: string;
  rRuleDetails?: RRuleDetails;
}

// ── Request / Response shapes ────────────────────────────

/** POST location/getbyurltoken/{token} */
export interface LocationListResponse {
  locations: Location[];
}

/** GET location/{id} — returns the Location object directly (or wrapped) */
export type LocationDetailResponse = Location;

/** POST booking/getbydates */
export interface AvailabilityRequest {
  fromDate: string;   // "YYYY-MM-DDT00:00:00.000+0000"
  toDate: string;     // "YYYY-MM-DDT23:59:59.999+0000"
  locationId: string;
}

export interface AvailablePeriod {
  start: string;
  end: string;
}

export interface AvailabilityResponse {
  slotDurationMinutes?: number;
  startTimes?: string[];                // e.g. ["09:00","09:30"]
  availablePeriods?: AvailablePeriod[];
  bookings?: BookingSchedule[];
  bookedPeriods?: AvailablePeriod[];
  bookingSchedule?: BookingSchedule[];
  totalAvailableMinutes?: number;
}

/** POST booking/create */
export interface CreateBookingRequest {
  locationId: string;
  locationName: string;
  contact: Contact;
  bookingSchedule: BookingSchedule[];
  reasonOfBooking: string;
  noOfPersons: number | string;
  totalBillableAmount: number;
  urlToken?: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  bookingNumber?: number;
  booking?: BookingModel;
}

/** POST booking/payment/create */
export interface PaymentRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  [key: string]: unknown;
}

export interface PaymentResponse {
  paymentId: string;
  status: string;
  [key: string]: unknown;
}
