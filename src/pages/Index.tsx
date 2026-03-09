import { useState, useRef, useMemo, useEffect } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  CreditCard,
  Download,
  MapPin,
  Target,
  Send,
  Loader2,
  Mail,
  Phone,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LocationSelect from "@/components/LocationSelect";
import SlotPicker, { type TimeSlot } from "@/components/SlotPicker";
import SlotSection from "@/components/SlotSection";
import BookingForm, { type BookingFormData } from "@/components/BookingForm";
import { useToast } from "@/hooks/use-toast";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { bookingBeService } from "@/services/bookingBeService";
import { buildPayload } from "@/utils/booking";
import { toPng } from "html-to-image";
import type { Location, BookingModel } from "@/types/api";
import { getLocationPurposes, getLocationHourlyPrice } from "@/types/api";

/** Payment info from create-booking API (CCAvenue redirect) */
interface PaymentInfo {
  bookingId: string;
  orderId: string;
  encRequest: string;
  accessCode: string;
  ccavenuePaymentUrl: string;
}

function redirectToCcAvenue(paymentInfo: PaymentInfo) {
  const form = document.createElement("form");
  form.method = "post";
  form.action = paymentInfo.ccavenuePaymentUrl;
  form.style.display = "none";
  const encInput = document.createElement("input");
  encInput.type = "hidden";
  encInput.name = "encRequest";
  encInput.value = paymentInfo.encRequest;
  form.appendChild(encInput);
  const accessInput = document.createElement("input");
  accessInput.type = "hidden";
  accessInput.name = "access_code";
  accessInput.value = paymentInfo.accessCode;
  form.appendChild(accessInput);
  if (paymentInfo.orderId) {
    const orderInput = document.createElement("input");
    orderInput.type = "hidden";
    orderInput.name = "order_id";
    orderInput.value = paymentInfo.orderId;
    form.appendChild(orderInput);
  }
  document.body.appendChild(form);
  form.submit();
}

const Index = () => {
  const { loading: configLoading, error: configError, getConfig } = useAppConfig();

  const companyBeUrl = getConfig("url") ?? "";
  const companyToken = getConfig("companyToken") ?? "";
  const companyName = getConfig("companyName") ?? "Booking";
  const companyAddress = getConfig("address") ?? "";
  const companyEmail = getConfig("email") ?? "";
  const companyPhone = getConfig("phone") ?? "";
  const companyLogo = getConfig("logo") ?? "";

  const [date, setDate] = useState<Date>(new Date());
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [selectedSlotsData, setSelectedSlotsData] = useState<TimeSlot[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [location, setLocation] = useState<Location | null>(null);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(60);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    bookingId?: string;
    bookingNumber?: number;
  } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    purpose: "",
    attendees: "1",
    city: "",
  });
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const confirmationCardRef = useRef<HTMLDivElement>(null);
  const paymentReturnCardRef = useRef<HTMLDivElement>(null);
  const paymentReturnDownloadRef = useRef<HTMLDivElement>(null);
  const hasAutoDownloadedRef = useRef(false);
  const [downloading, setDownloading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [paymentReturn, setPaymentReturn] = useState<{
    payment: "Success" | "Failed";
    statusText?: string;
    bookingId?: string;
  } | null>(null);
  const [paymentReturnBooking, setPaymentReturnBooking] = useState<BookingModel | null>(null);
  const [paymentReturnLoading, setPaymentReturnLoading] = useState(false);

  const paymentSummary = useMemo(() => {
    const totalMinutes = selectedSlotsData.reduce((sum, s) => sum + s.totalMinutes, 0);
    const totalHours = totalMinutes / 60;
    const hourlyPrice = getLocationHourlyPrice(location);
    const rangeFee = hourlyPrice * totalHours;
    const totalPayable = rangeFee;
    const attendees = formData.attendees ? parseInt(formData.attendees, 10) || 1 : 1;
    return {
      totalMinutes,
      totalHours,
      hourlyPrice,
      rangeFee,
      totalPayable,
      attendees,
    };
  }, [selectedSlotsData, location, formData.attendees]);

  const formatCurrency = (amount: number) =>
    amount % 1 === 0 ? `₹ ${amount}` : `₹ ${amount.toFixed(2)}`;

  // Read payment return params (backend redirects here after CCAvenue with ?payment=Success|Failed&bookingId=...&statusText=...)
  useEffect(() => {
    const payment = searchParams.get("payment");
    const bookingId = searchParams.get("bookingId");
    const statusText = searchParams.get("statusText");
    if (payment === "Success" || payment === "Failed") {
      setPaymentReturn({
        payment: payment as "Success" | "Failed",
        statusText: statusText ?? undefined,
        bookingId: bookingId ?? undefined,
      });
    }
  }, [searchParams]);

  // Fetch booking details when we have payment return with bookingId
  useEffect(() => {
    if (!paymentReturn?.bookingId || !companyBeUrl) return;
    setPaymentReturnLoading(true);
    bookingBeService
      .getBookingById(companyBeUrl, paymentReturn.bookingId)
      .then(setPaymentReturnBooking)
      .catch(() => setPaymentReturnBooking(null))
      .finally(() => setPaymentReturnLoading(false));
  }, [paymentReturn?.bookingId, companyBeUrl]);

  // Scroll to booking details card when landing from payment redirect
  useEffect(() => {
    if (paymentReturn && paymentReturnCardRef.current) {
      paymentReturnCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [paymentReturn]);

  // Auto-download image when payment success/fail (content only, no buttons)
  useEffect(() => {
    if (!paymentReturn || paymentReturnLoading) return;
    const t = setTimeout(() => {
      runPaymentReturnAutoDownload();
    }, 800);
    return () => clearTimeout(t);
  }, [paymentReturn, paymentReturnLoading]);

  const formatSlotTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return format(d, "h:mm a");
    } catch {
      return iso;
    }
  };

  /** Get display values from booking (handles API snake_case or nested shapes) */
  const getBookingDisplay = (b: BookingModel | null) => {
    if (!b) return { locationName: "", amount: 0, bookingNumber: undefined as number | undefined };
    const r = b as unknown as Record<string, unknown>;
    const locationName =
      String(b.locationName ?? r.location_name ?? "").trim() || "";
    const amount =
      typeof b.totalBillableAmount === "number"
        ? b.totalBillableAmount
        : typeof r.total_billable_amount === "number"
          ? r.total_billable_amount
          : typeof r.totalBillableAmount === "number"
            ? r.totalBillableAmount
            : 0;
    const bookingNumber =
      typeof r.bookingNumber === "number"
        ? r.bookingNumber
        : typeof r.booking_number === "number"
          ? r.booking_number
          : undefined;
    return { locationName, amount, bookingNumber };
  };

  const clearPaymentReturn = () => {
    hasAutoDownloadedRef.current = false;
    setPaymentReturn(null);
    setPaymentReturnBooking(null);
    setSearchParams({});
  };

  const handleDownloadImage = async () => {
    if (!confirmationCardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(confirmationCardRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `booking-confirmation-${bookingResult?.bookingNumber ?? "booking"}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Image downloaded", description: "Booking confirmation saved." });
    } catch {
      toast({ title: "Download failed", description: "Could not save image.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPaymentReturnImage = async () => {
    const el = paymentReturnDownloadRef.current;
    if (!el) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      const label = paymentReturnBooking
        ? getBookingDisplay(paymentReturnBooking).bookingNumber ?? paymentReturnBooking.id
        : paymentReturn?.bookingId ?? "booking";
      link.download = `booking-confirmation-${label}.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Image downloaded", description: "Booking confirmation saved." });
    } catch {
      toast({ title: "Download failed", description: "Could not save image.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const runPaymentReturnAutoDownload = async () => {
    const el = paymentReturnDownloadRef.current;
    if (!el || hasAutoDownloadedRef.current) return;
    hasAutoDownloadedRef.current = true;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      const label = paymentReturnBooking
        ? getBookingDisplay(paymentReturnBooking).bookingNumber ?? paymentReturnBooking.id
        : paymentReturn?.bookingId ?? "booking";
      link.download = `booking-confirmation-${label}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Silent fail for auto-download
    }
  };

  const focusInvalidField = (fieldId: string) => {
    setInvalidField(fieldId);
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement | HTMLTextAreaElement)?.focus();
    });
  };

  const handleDateChange = (d: Date | undefined) => {
    if (d) {
      setDate(d);
      setSelectedSlots([]);
      setSelectedSlotsData([]);
      setDatePickerOpen(false);
    }
  };

  const handleLocationSelect = (id: string, name: string) => {
    setLocationId(id);
    setLocationName(name);
    setLocation(null);
    setDate(new Date());
    setSelectedSlots([]);
    setSelectedSlotsData([]);
  };

  const handleLocationDetails = (loc: Location, duration: number) => {
    setLocation(loc);
    setSlotDurationMinutes(duration);
    if (getLocationPurposes(loc)?.length) {
      setFormData((prev) => ({ ...prev, purpose: "" }));
    }
  };

  const handleToggleSlot = (slotId: string, slot: TimeSlot) => {
    setSelectedSlots((prev) =>
      prev.includes(slotId) ? prev.filter((id) => id !== slotId) : [...prev, slotId]
    );
    setSelectedSlotsData((prev) => {
      const exists = prev.some((s) => s.id === slotId);
      if (exists) return prev.filter((s) => s.id !== slotId);
      return [...prev, slot];
    });
  };

  const handleSubmit = async () => {
    if (!locationId) {
      toast({ title: "Please select a location", variant: "destructive" });
      return;
    }
    if (selectedSlotsData.length === 0) {
      toast({ title: "Please select at least one time slot", variant: "destructive" });
      return;
    }
    if (!formData.firstName || !formData.phone || !formData.purpose) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      const field = !formData.firstName ? "firstName" : !formData.phone ? "phone" : "purpose";
      focusInvalidField(field);
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      toast({ title: "Invalid phone number", description: "Enter a valid phone (7–15 digits)", variant: "destructive" });
      focusInvalidField("phone");
      return;
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      focusInvalidField("email");
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload({
        locationId,
        locationName,
        contact: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: {
            city: formData.city,
          },
        },
        reasonOfBooking: formData.purpose,
        noOfPersons: formData.attendees,
        totalBillableAmount: paymentSummary.totalPayable,
        slots: [...selectedSlotsData]
          .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
          .map((s) => ({ start: s.startISO, end: s.endISO })),
        urlToken: getConfig("urlToken") as string | undefined,
        companyEnrollmentCode: getConfig("companyEnrollmentCode") as string | undefined,
        companyToken,
        paymentMode: "ccavenue",
      });

      const result = await bookingBeService.createBooking(companyBeUrl, payload as any);

      setBookingResult({
        bookingId: result.bookingId,
        bookingNumber: result.bookingNumber,
      });

      const paymentInfo = (result as any)?.paymentInfo;
      if (paymentInfo?.encRequest && paymentInfo?.accessCode && paymentInfo?.ccavenuePaymentUrl && !(result as any)?.paymentError) {
        redirectToCcAvenue(paymentInfo as PaymentInfo);
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description:
          err?.response?.data?.message ?? err?.message ?? "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Config loading / error
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <p className="text-destructive font-medium">Failed to load configuration.</p>
        </Card>
      </div>
    );
  }

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Payment return: show only booking details (no form)
  if (paymentReturn) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <div className="flex items-center gap-3 sm:gap-4">
              {companyLogo ? (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
                  <img src={companyLogo} alt={companyName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-wider truncate">
                  {companyName}
                </h1>
                <p className="text-xs sm:text-sm text-primary-foreground/70">Online Booking</p>
              </div>
            </div>
            {(companyAddress || companyEmail || companyPhone) && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-primary-foreground/15 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs sm:text-sm text-primary-foreground/80">
                {companyAddress && (
                  <span className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span className="line-clamp-2 sm:line-clamp-1">{companyAddress}</span>
                  </span>
                )}
                {companyEmail && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {companyEmail}
                  </span>
                )}
                {companyPhone && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {companyPhone}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col items-center">
          <Card
            ref={paymentReturnCardRef}
            className={cn(
              "w-full max-w-xl overflow-hidden",
              paymentReturn.payment === "Success"
                ? "border-green-500/50 bg-green-500/5"
                : "border-destructive/50 bg-destructive/5"
            )}
          >
            <div className="p-5 sm:p-6 space-y-4">
              {/* Content only (included in auto-downloaded image; no buttons) */}
          <div ref={paymentReturnDownloadRef} className="space-y-4">
              <div className="flex items-start gap-4">
                {paymentReturn.payment === "Success" ? (
                  <div className="rounded-full bg-green-500/20 p-2 shrink-0">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="rounded-full bg-destructive/20 p-2 shrink-0">
                    <XCircle className="w-8 h-8 text-destructive" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold uppercase tracking-wider text-foreground">
                    {paymentReturn.payment === "Success" ? "Payment successful" : "Payment failed"}
                  </h2>
                  {paymentReturn.statusText && (
                    <p className="text-sm text-muted-foreground mt-1">{paymentReturn.statusText}</p>
                  )}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm border border-border/50">
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Booking details
                </h3>
                {paymentReturnLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading booking details…
                  </div>
                ) : paymentReturnBooking ? (
                  <>
                    {(() => {
                      const display = getBookingDisplay(paymentReturnBooking);
                      const contact = paymentReturnBooking.contact as unknown as Record<string, unknown> | undefined;
                      const schedule = paymentReturnBooking.bookingSchedule ?? [];
                      const firstStart = schedule[0]?.startTime;
                      const bookingDate = firstStart
                        ? format(new Date(firstStart), "EEEE, MMM d, yyyy")
                        : null;
                      return (
                        <>
                          {display.bookingNumber != null && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Booking #</span>
                              <span className="text-foreground font-semibold">{display.bookingNumber}</span>
                            </div>
                          )}
                          {paymentReturnBooking.id && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Reference</span>
                              <span className="text-foreground font-mono text-xs truncate max-w-[180px]" title={paymentReturnBooking.id}>
                                {paymentReturnBooking.id}
                              </span>
                            </div>
                          )}
                          {bookingDate && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Date</span>
                              <span className="text-foreground font-medium">{bookingDate}</span>
                            </div>
                          )}
                          {schedule.length > 0 && (
                            <div className="flex flex-col gap-1">
                              <span className="text-muted-foreground">Slot{schedule.length !== 1 ? "s" : ""}</span>
                              <ul className="list-disc list-inside text-foreground font-semibold space-y-0.5">
                                {schedule.map((s, i) => (
                                  <li key={i}>
                                    {formatSlotTime(s.startTime)} – {formatSlotTime(s.endTime)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Location</span>
                            <span className="text-foreground">{display.locationName || "–"}</span>
                          </div>
                          {(paymentReturnBooking.reasonOfBooking ?? (paymentReturnBooking as unknown as Record<string, unknown>).reason_of_booking) && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">Purpose</span>
                              <span className="text-foreground">
                                {String(
                                  paymentReturnBooking.reasonOfBooking ??
                                  (paymentReturnBooking as unknown as Record<string, unknown>).reason_of_booking ?? ""
                                )}
                              </span>
                            </div>
                          )}
                          {contact && (
                            <>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Booked by</span>
                                <span className="text-foreground">
                                  {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "–"}
                                </span>
                              </div>
                              {(contact.email as string) && (
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">Email</span>
                                  <span className="text-foreground truncate max-w-[200px]" title={String(contact.email)}>
                                    {String(contact.email)}
                                  </span>
                                </div>
                              )}
                              {(contact.phone as string) && (
                                <div className="flex justify-between gap-2">
                                  <span className="text-muted-foreground">Phone</span>
                                  <span className="text-foreground">{String(contact.phone)}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="flex justify-between gap-2 pt-1 border-t border-border/50">
                            <span className="text-muted-foreground">Amount</span>
                            <span className="text-foreground font-semibold">{formatCurrency(display.amount)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : paymentReturn?.bookingId ? (
                  <div className="text-muted-foreground space-y-1">
                    <p>Reference: <span className="font-mono text-foreground">{paymentReturn.bookingId}</span></p>
                    <p className="text-xs">Could not load full booking details. You may check your booking with the reference above.</p>
                  </div>
                ) : null}
              </div>
              {paymentReturn.payment === "Failed" && (
                  <p className="text-sm text-destructive font-medium rounded-lg bg-destructive/10 p-3 border border-destructive/30">
                    <span className="font-semibold">Note :-</span> Your booking failed, but the slot is temporarily reserved and will expire soon. Please contact the admin if you want to confirm this booking.
                  </p>
                )}
              </div>
              {/* Buttons (not included in auto-downloaded image) */}
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleDownloadPaymentReturnImage}
                  disabled={downloading}
                  variant="outline"
                  className="w-full font-display uppercase tracking-wider gap-2"
                  size="lg"
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}{" "}
                  Download as Image
                </Button>
                <Button
                  onClick={clearPaymentReturn}
                  variant="outline"
                  className="w-full font-display uppercase tracking-wider gap-2"
                  size="lg"
                >
                  <CalendarIcon className="w-4 h-4" /> Book another slot
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <Card ref={confirmationCardRef} className="w-full p-8 text-center space-y-6 border-primary/20">
            {/* Animated check */}
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide">
                Booking Confirmed!
              </h2>
              <p className="text-muted-foreground">
                Your {selectedSlotsData.length} slot{selectedSlotsData.length !== 1 ? "s" : ""} on{" "}
                <span className="font-semibold text-foreground">
                  {format(date, "EEEE, MMM d, yyyy")}
                </span>{" "}
                at <span className="font-semibold text-foreground">{locationName}</span>{" "}
                {selectedSlotsData.length !== 1 ? "have" : "has"} been reserved.
              </p>
            </div>

            {/* Booking details card */}
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 text-sm">
              {bookingResult?.bookingNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking #</span>
                  <span className="font-bold text-foreground">{bookingResult.bookingNumber}</span>
                </div>
              )}
              {bookingResult?.bookingId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs text-foreground">{bookingResult.bookingId}</span>
                </div>
              )}
              {selectedSlotsData.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">
                    Time{selectedSlotsData.length !== 1 ? "s" : ""}
                  </span>
                  <ul className="list-disc list-inside text-foreground font-semibold space-y-0.5">
                    {selectedSlotsData.map((s) => (
                      <li key={s.id}>
                        {s.startTime} – {s.endTime}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="text-foreground">{formData.firstName} {formData.lastName}</span>
              </div>
              {formData.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-foreground">{formData.phone}</span>
                </div>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleDownloadImage}
              disabled={downloading}
              variant="outline"
              className="w-full font-display uppercase tracking-wider gap-2"
              size="lg"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}{" "}
              Download as Image
            </Button>
            <Button
              onClick={() => {
                setSubmitted(false);
                setSelectedSlots([]);
                setSelectedSlotsData([]);
                setLocationId(null);
                setLocationName("");
                setLocation(null);
                setBookingResult(null);
                setFormData({
                  firstName: "", lastName: "", email: "", phone: "",
                  purpose: "", attendees: "1",
                  city: "",
                });
                setInvalidField(null);
              }}
              className="w-full font-display uppercase tracking-wider gap-2"
              size="lg"
            >
              <CalendarIcon className="w-4 h-4" /> Book Another Slot
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {companyLogo ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-wider truncate">
                {companyName}
              </h1>
              <p className="text-xs sm:text-sm text-primary-foreground/70">
                Online Booking
              </p>
            </div>
          </div>

          {/* Contact details bar */}
          {(companyAddress || companyEmail || companyPhone) && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-primary-foreground/15 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs sm:text-sm text-primary-foreground/80">
              {companyAddress && (
                <span className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2 sm:line-clamp-1">{companyAddress}</span>
                </span>
              )}
              {companyEmail && (
                <span className="flex items-center gap-1.5 shrink-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {companyEmail}
                </span>
              )}
              {companyPhone && (
                <span className="flex items-center gap-1.5 shrink-0">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {companyPhone}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 pb-28">
        {/* Location */}
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wider text-foreground">
              Location
            </h2>
          </div>
          <LocationSelect
            companyBeUrl={companyBeUrl}
            companyToken={companyToken}
            onSelect={handleLocationSelect}
            onLocationDetails={handleLocationDetails}
          />
        </div>

        {/* Date — shown only when location is selected */}
        {locationId && (
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarIcon className="w-5 h-5 text-accent" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wider text-foreground">
              Date
            </h2>
          </div>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-medium h-11 bg-accent text-accent-foreground border-accent hover:bg-accent/90",
                  !date && "text-accent-foreground/70"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, "EEEE, d MMMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                disabled={(d) =>
                  d < new Date(new Date().setHours(0, 0, 0, 0))
                }
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
        )}

        {/* Pick Your Slot — collapsible */}
        <SlotSection
          date={date}
          locationId={locationId}
          location={location}
          companyBeUrl={companyBeUrl}
          slotDurationMinutes={slotDurationMinutes}
          selectedSlots={selectedSlots}
          onToggleSlot={handleToggleSlot}
        />

        {/* Booking Details + Contact Details */}
        <BookingForm
          data={formData}
          onChange={setFormData}
          invalidField={invalidField}
          onFieldChange={(field) => field === invalidField && setInvalidField(null)}
          locationPurposes={getLocationPurposes(location)}
        />

        {/* Payment Summary — shown when slots are selected */}
        {selectedSlotsData.length > 0 && (
          <div className="bg-primary rounded-xl border border-primary p-5 sm:p-6 text-primary-foreground">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 shrink-0" />
              <h2 className="font-display text-base font-semibold uppercase tracking-wider">
                Payment Summary
              </h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-primary-foreground/90">Range Fee ({paymentSummary.totalHours.toFixed(1)} h)</span>
                <span className="font-medium tabular-nums">
                  {paymentSummary.rangeFee > 0 ? formatCurrency(paymentSummary.rangeFee) : "–"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-primary-foreground/90">Attendees</span>
                <span className="font-medium tabular-nums">{paymentSummary.attendees}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-primary-foreground/20 flex justify-between items-center">
              <span className="font-display font-bold uppercase tracking-wider">Total Payable</span>
              <span className="text-lg font-bold tabular-nums">
                {paymentSummary.totalPayable > 0 ? formatCurrency(paymentSummary.totalPayable) : "₹ –"}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Sticky footer: Pay & Confirm (centered) */}
      <div className="fixed bottom-0 left-0 right-0 bg-primary border-t border-primary-foreground/10 p-4">
        <div className="max-w-4xl mx-auto flex justify-center">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={submitting}
            className="font-display uppercase tracking-wider text-base h-12 gap-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 px-8"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Target className="w-4 h-4" /> Pay & Confirm Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
