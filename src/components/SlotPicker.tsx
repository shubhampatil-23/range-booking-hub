import { useEffect, useState, useRef } from "react";
import { format, isToday } from "date-fns";
import { enUS } from "date-fns/locale";
import { Clock, X, Loader2 } from "lucide-react";
import { bookingAvailabilityService } from "@/services/bookingAvailabilityService";
import { bookingLocationService } from "@/services/bookingLocationService";
import type {
  AvailabilityResponse,
  AvailablePeriod,
  BookingSchedule as BookingScheduleType,
  Location,
  LocationHours,
} from "@/types/api";
import { getSlotDuration } from "@/types/api";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  startISO: string;
  endISO: string;
  totalMinutes: number;
  booked: boolean;
}

/** Format a date for the backend: YYYY-MM-DDT00:00:00.000+0000 */
function toBackendDate(d: Date, end?: boolean): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return end
    ? `${yyyy}-${mm}-${dd}T23:59:59.999+0000`
    : `${yyyy}-${mm}-${dd}T00:00:00.000+0000`;
}

function formatTime12(hour: number, min: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")} ${suffix}`;
}

/** Create UTC ISO string from local date + time. Slot times (e.g. 10:00) are local; API expects UTC. */
function localToUTCISO(date: Date, hour: number, min: number): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, min, 0, 0);
  return d.toISOString().replace("Z", "+0000");
}

/** Parse "HH:mm" or "H:mm" to minutes since midnight */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Normalize day name for matching (supports "Monday", "Mon", "MON", etc.) */
function normalizeDayName(day: string): string {
  return day?.trim().toLowerCase().slice(0, 3) ?? "";
}

/** Recursively find array that looks like locationHours (objects with day + openingTime) */
function findLocationHoursInObject(obj: unknown): LocationHours[] | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const candidates = [
    record.locationHours,
    record.location_hours,
    record.hours,
    record.operatingHours,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const first = c[0] as Record<string, unknown>;
      if (first && (first.day || first.openingTime || first.opening_time)) {
        return c as LocationHours[];
      }
    }
  }
  for (const v of Object.values(record)) {
    const found = findLocationHoursInObject(v);
    if (found) return found;
  }
  return null;
}

/** Normalize LocationHours[] from API — handles various field names and nesting */
function getLocationHoursArray(loc: Location | null): LocationHours[] {
  if (!loc) return [];
  const found = findLocationHoursInObject(loc);
  return found ?? [];
}

/** Extract open/close time from a LocationHours entry — handles camelCase and snake_case */
function getOpenCloseFromEntry(
  h: LocationHours | Record<string, unknown>
): { openTime: string; closeTime: string } | null {
  const r = h as Record<string, unknown>;
  const openTime =
    (r.openingTime as string) ??
    (r.opening_time as string) ??
    (r.openTime as string) ??
    (r.open_time as string);
  const closeTime =
    (r.closingTime as string) ??
    (r.closing_time as string) ??
    (r.closeTime as string) ??
    (r.close_time as string);
  return openTime && closeTime ? { openTime, closeTime } : null;
}

/** Get open/close minutes for a date from location hours.
 * Uses locationHours array (per-day); falls back to root-level openingTime/closingTime from /v1/location/{id} response. */
function getOpenCloseForDate(
  date: Date,
  locationHours: (LocationHours | Record<string, unknown>)[],
  loc?: Location | null
): { openMin: number; closeMin: number } | null {
  const dayName = format(date, "EEEE", { locale: enUS });
  const targetNorm = normalizeDayName(dayName);
  const hoursForDay = locationHours.find((h) => {
    const r = h as Record<string, unknown>;
    const day = (r.day as string) ?? "";
    if (!day || (r.isClosed as boolean) === true) return false;
    return normalizeDayName(day) === targetNorm;
  });
  if (hoursForDay) {
    const times = getOpenCloseFromEntry(hoursForDay);
    if (times)
      return {
        openMin: parseTimeToMinutes(times.openTime),
        closeMin: parseTimeToMinutes(times.closeTime),
      };
  }
  // Fallback: root-level openingTime/closingTime (API returns these on location object)
  if (loc) {
    const r = loc as Record<string, unknown>;
    const root = (r.data ?? r.result ?? r.content ?? r) as Record<string, unknown>;
    const times = getOpenCloseFromEntry(root as LocationHours);
    if (times)
      return {
        openMin: parseTimeToMinutes(times.openTime),
        closeMin: parseTimeToMinutes(times.closeTime),
      };
  }
  return null;
}

/** Build slots from API startTimes (e.g. ["09:00","09:30"]) */
function slotsFromStartTimes(
  date: Date,
  startTimes: string[],
  duration: number
): TimeSlot[] {
  return startTimes.map((st, idx) => {
    const [h, m] = st.split(":").map(Number);
    const startH = h ?? 0;
    const startM = m ?? 0;
    const startTotal = startH * 60 + startM;
    const endTotal = startTotal + duration;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;

    const startISO = localToUTCISO(date, startH, startM);
    const endISO = localToUTCISO(date, endH, endM);

    return {
      id: `slot-${idx}`,
      startTime: formatTime12(startH, startM),
      endTime: formatTime12(endH, endM),
      startISO,
      endISO,
      totalMinutes: duration,
      booked: false,
    };
  });
}

/** Build slots from API availablePeriods */
function slotsFromAvailablePeriods(
  periods: AvailablePeriod[],
  slotDurationMinutes: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let idx = 0;
  for (const p of periods) {
    const start = new Date(p.start);
    const end = new Date(p.end);
    let current = start.getTime();
    const endMs = end.getTime();
    const durationMs = slotDurationMinutes * 60 * 1000;

    while (current + durationMs <= endMs) {
      const s = new Date(current);
      const e = new Date(current + durationMs);
      const startH = s.getHours();
      const startM = s.getMinutes();
      const endH = e.getHours();
      const endM = e.getMinutes();

      slots.push({
        id: `slot-${idx++}`,
        startTime: formatTime12(startH, startM),
        endTime: formatTime12(endH, endM),
        startISO: s.toISOString().replace("Z", "+0000"),
        endISO: e.toISOString().replace("Z", "+0000"),
        totalMinutes: slotDurationMinutes,
        booked: false,
      });
      current += durationMs;
    }
  }
  return slots;
}

/** Generate slots from open/close times (from location hours) */
function generateSlotsFromDuration(
  date: Date,
  slotDurationMinutes: number,
  openMin: number,
  closeMin: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  let currentMin = openMin;
  let idx = 0;

  while (currentMin + slotDurationMinutes <= closeMin) {
    const startH = Math.floor(currentMin / 60);
    const startM = currentMin % 60;
    const endTotal = currentMin + slotDurationMinutes;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;

    const startISO = localToUTCISO(date, startH, startM);
    const endISO = localToUTCISO(date, endH, endM);

    slots.push({
      id: `slot-${idx}`,
      startTime: formatTime12(startH, startM),
      endTime: formatTime12(endH, endM),
      startISO,
      endISO,
      totalMinutes: slotDurationMinutes,
      booked: false,
    });

    currentMin = endTotal;
    idx++;
  }

  return slots;
}

/** When date is today, filter out slots whose start time has already passed */
function filterPastSlotsIfToday(date: Date, slots: TimeSlot[]): TimeSlot[] {
  if (!isToday(date)) return slots;
  const now = new Date();
  return slots.filter((slot) => new Date(slot.startISO) > now);
}

function isSlotBooked(
  slot: TimeSlot,
  bookedPeriods: AvailablePeriod[],
  bookings: BookingScheduleType[]
): boolean {
  const sStart = new Date(slot.startISO).getTime();
  const sEnd = new Date(slot.endISO).getTime();

  for (const bp of bookedPeriods) {
    const bStart = new Date(bp.start).getTime();
    const bEnd = new Date(bp.end).getTime();
    if (sStart < bEnd && sEnd > bStart) return true;
  }

  for (const bk of bookings) {
    const bStart = new Date(bk.startTime).getTime();
    const bEnd = new Date(bk.endTime).getTime();
    if (sStart < bEnd && sEnd > bStart) return true;
  }

  return false;
}

interface SlotPickerProps {
  date: Date;
  locationId: string | null;
  location: Location | null;
  companyBeUrl: string;
  slotDurationMinutes: number;
  selectedSlot: string | null;
  onSelectSlot: (slotId: string, slot: TimeSlot) => void;
}

/** Default business hours (9 AM - 5 PM) when API/location has no data */
const DEFAULT_OPEN_MIN = 9 * 60;
const DEFAULT_CLOSE_MIN = 17 * 60;

const SlotPicker = ({
  date,
  locationId,
  location,
  companyBeUrl,
  slotDurationMinutes,
  selectedSlot,
  onSelectSlot,
}: SlotPickerProps) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [effectiveDuration, setEffectiveDuration] = useState<number>(slotDurationMinutes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!locationId) {
      setSlots([]);
      setEffectiveDuration(slotDurationMinutes);
      setError(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);

      const tryBuildSlots = (
        res: AvailabilityResponse,
        loc: Location | null
      ): TimeSlot[] => {
        // Prefer location slotDuration from API (e.g. slotDuration: 30) over availability API or fallback
        const duration =
          (loc ? getSlotDuration(loc) : null) ??
          res.slotDurationMinutes ??
          slotDurationMinutes;
        const bookedPeriods = res.bookedPeriods ?? [];
        const bookings = res.bookings ?? res.bookingSchedule ?? [];

        let rawSlots: TimeSlot[];

        // Prefer /v1/location/{id} data — locationHours (per-day) or root-level openingTime/closingTime
        const hours = getLocationHoursArray(loc);
        const openClose = loc ? getOpenCloseForDate(date, hours, loc) : null;

        if (openClose) {
          rawSlots = generateSlotsFromDuration(
            date,
            duration,
            openClose.openMin,
            openClose.closeMin
          );
        } else if (loc && hours.length === 0) {
          // Location has no locationHours — do not show slots
          rawSlots = [];
        } else if (hours.length > 0) {
          rawSlots = [];
        } else if (res.startTimes && res.startTimes.length > 0) {
          rawSlots = slotsFromStartTimes(date, res.startTimes, duration);
        } else if (res.availablePeriods && res.availablePeriods.length > 0) {
          rawSlots = slotsFromAvailablePeriods(res.availablePeriods, duration);
        } else {
          rawSlots = generateSlotsFromDuration(
            date,
            duration,
            DEFAULT_OPEN_MIN,
            DEFAULT_CLOSE_MIN
          );
        }

        const withBooked = rawSlots.map((slot) => ({
          ...slot,
          booked: isSlotBooked(slot, bookedPeriods, bookings),
        }));
        return filterPastSlotsIfToday(date, withBooked);
      };

      const getLocationWithHours = (): Promise<Location | null> => {
        if (!locationId || !companyBeUrl) return Promise.resolve(location);
        return bookingLocationService
          .getById(companyBeUrl, locationId)
          .then((loc) => loc)
          .catch(() => location);
      };

      Promise.all([
        bookingAvailabilityService.getByDates(companyBeUrl, {
          fromDate: toBackendDate(date),
          toDate: toBackendDate(date, true),
          locationId,
        }),
        getLocationWithHours(),
      ])
        .then(([res, loc]) => {
          const locToUse = loc ?? location;
          const built = tryBuildSlots(res, locToUse);
          const duration =
            (locToUse ? getSlotDuration(locToUse) : null) ??
            res.slotDurationMinutes ??
            slotDurationMinutes;
          setSlots(built);
          setEffectiveDuration(duration);
        })
        .catch(() =>
          getLocationWithHours().then((loc) => {
            const duration =
              (loc ? getSlotDuration(loc) : null) ?? slotDurationMinutes;
            const hours = getLocationHoursArray(loc);
            const openClose = loc ? getOpenCloseForDate(date, hours, loc) : null;
            if (openClose) {
              const rawSlots = generateSlotsFromDuration(
                date,
                duration,
                openClose.openMin,
                openClose.closeMin
              );
              const filtered = filterPastSlotsIfToday(
                date,
                rawSlots.map((s) => ({ ...s, booked: false }))
              );
              setSlots(filtered);
            } else if (loc && hours.length === 0) {
              setSlots([]);
            } else if (hours.length > 0) {
              setSlots([]);
            } else {
              const defaultSlots = generateSlotsFromDuration(
                date,
                duration,
                DEFAULT_OPEN_MIN,
                DEFAULT_CLOSE_MIN
              );
              const filtered = filterPastSlotsIfToday(
                date,
                defaultSlots.map((s) => ({ ...s, booked: false }))
              );
              setSlots(filtered);
            }
            setEffectiveDuration(duration);
            setError(null);
          })
        )
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [date, locationId, location, companyBeUrl, slotDurationMinutes]);

  if (!locationId) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Select a location first to see available slots.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading slots…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Slots unavailable. Please try again later.
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No available slot for booking on the selected date.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-primary">
          Available Slots for {format(date, "d MMM yyyy")}
        </p>
        <span className="text-xs text-muted-foreground">{effectiveDuration} min / slot</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {slots.map((slot, i) => {
          const isSelected = selectedSlot === slot.id;
          const isBooked = slot.booked;

          return (
            <button
              key={slot.id}
              disabled={isBooked}
              onClick={() => onSelectSlot(slot.id, slot)}
              className={`
                relative flex flex-col items-center gap-1 p-3 sm:p-4 rounded-lg border transition-all duration-150 animate-slot-pop
                ${
                  isBooked
                    ? "bg-slot-booked border-slot-booked-border cursor-not-allowed opacity-60"
                    : isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-lg ring-2 ring-primary/30 scale-[1.02]"
                    : "bg-slot-available border-slot-available-border text-slot-available-text hover:border-primary/60 hover:shadow-sm cursor-pointer"
                }
              `}
              style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}
            >
              <Clock
                className={`w-4 h-4 sm:w-5 sm:h-5 ${
                  isBooked
                    ? "text-destructive"
                    : isSelected
                    ? "text-primary-foreground/80"
                    : "text-slot-available-text"
                }`}
              />
              <span className={`text-sm sm:text-base font-bold leading-tight ${
                isBooked ? "text-destructive" : isSelected ? "text-primary-foreground" : "text-slot-available-text"
              }`}>
                {slot.startTime}
              </span>
              <span className={`text-[10px] sm:text-xs leading-tight ${
                isBooked ? "text-slot-booked-text" : isSelected ? "text-primary-foreground/70" : "text-slot-available-text"
              }`}>
                to {slot.endTime}
              </span>
              <span className={`text-[10px] sm:text-xs font-semibold flex items-center gap-0.5 ${
                isBooked
                  ? "text-destructive"
                  : isSelected
                  ? "text-primary-foreground"
                  : "text-slot-available-text"
              }`}>
                {isBooked ? (
                  <><X className="w-3 h-3" /> Booked</>
                ) : isSelected ? (
                  "Selected ✓"
                ) : (
                  "Available"
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SlotPicker;
