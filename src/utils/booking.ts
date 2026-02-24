// ── Types ────────────────────────────────────────────────

export interface Contact {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: { city?: string; line1?: string; line2?: string; pin?: string };
}

export interface BookingSchedule {
  startTime: string;
  endTime: string;
  totalMinutes: number;
  allDay?: boolean;
}

export interface CreateBookingPayload {
  locationId: string;
  locationName?: string;
  contact: Contact;
  bookingSchedule: BookingSchedule[];
  reasonOfBooking?: string;
  noOfPersons?: string | number;
  totalBillableAmount?: number;
  urlToken?: string;
}

// ── Helpers ──────────────────────────────────────────────

/** Format a Date to the backend's expected ISO pattern: 2026-02-21T09:00:00.000+0000 */
export function formatDateForApi(d: Date): string {
  return d.toISOString().replace("Z", "+0000");
}

/** Build a ready-to-POST booking payload from validated form values */
export function buildPayload(input: {
  locationId: string;
  locationName?: string;
  contact: Contact;
  reasonOfBooking?: string;
  noOfPersons?: string | number;
  totalBillableAmount?: number;
  start: Date;
  end: Date;
  urlToken?: string;
  companyEnrollmentCode?: string;
  companyToken?: string;
}): CreateBookingPayload {
  const {
    locationId,
    locationName,
    contact,
    reasonOfBooking,
    noOfPersons,
    totalBillableAmount,
    start,
    end,
    urlToken,
    companyEnrollmentCode,
    companyToken,
  } = input;

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  const token = urlToken ?? companyToken ?? companyEnrollmentCode;

  return {
    locationId,
    locationName,
    contact,
    bookingSchedule: [
      {
        startTime: formatDateForApi(start),
        endTime: formatDateForApi(end),
        totalMinutes,
        allDay: false,
      },
    ],
    reasonOfBooking,
    noOfPersons:
      typeof noOfPersons === "number" ? String(noOfPersons) : noOfPersons,
    totalBillableAmount,
    ...(token && { urlToken: token }),
  };
}
