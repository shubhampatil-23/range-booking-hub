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

/** Convert to ISO 8601 UTC string for API (YYYY-MM-DDTHH:mm:ss.000+0000). Accepts Date or ISO string. */
function toISODateString(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
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
  start: Date | string;
  end: Date | string;
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

  const startDate = typeof start === "string" ? new Date(start) : start;
  const endDate = typeof end === "string" ? new Date(end) : end;
  const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

  const token = urlToken ?? companyToken ?? companyEnrollmentCode;

  // Ensure lastName, email, city are null (not empty string) when not provided
  const contactPayload = {
    ...contact,
    lastName: contact.lastName?.trim() || null,
    email: contact.email?.trim() || null,
    address: {
      ...(contact.address ?? {}),
      city: contact.address?.city?.trim() || null,
    },
  };

  return {
    locationId,
    locationName,
    contact: contactPayload,
    bookingSchedule: [
      {
        startTime: toISODateString(start),
        endTime: toISODateString(end),
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
