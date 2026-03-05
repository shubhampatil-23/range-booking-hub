import { useState, useRef } from "react";
import { format } from "date-fns";
import {
  CalendarIcon,
  CheckCircle2,
  Download,
  MapPin,
  Target,
  Send,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
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
import type { Location } from "@/types/api";

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
  const [downloading, setDownloading] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
        totalBillableAmount: 0,
        slots: [...selectedSlotsData]
          .sort((a, b) => new Date(a.startISO).getTime() - new Date(b.startISO).getTime())
          .map((s) => ({ start: s.startISO, end: s.endISO })),
        urlToken: getConfig("urlToken") as string | undefined,
        companyEnrollmentCode: getConfig("companyEnrollmentCode") as string | undefined,
        companyToken,
      });

      const result = await bookingBeService.createBooking(companyBeUrl, payload as any);

      setBookingResult({
        bookingId: result.bookingId,
        bookingNumber: result.bookingNumber,
      });
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
        />
      </main>

      {/* Sticky Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-4xl mx-auto px-0 sm:px-2">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={submitting}
            className="w-full font-display uppercase tracking-wider text-base h-12 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Confirm Booking
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
