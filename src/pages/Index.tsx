import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Crosshair, CheckCircle2, MapPin, Target, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LocationSelect from "@/components/LocationSelect";
import SlotPicker, { type TimeSlot } from "@/components/SlotPicker";
import BookingForm, { type BookingFormData } from "@/components/BookingForm";
import { useToast } from "@/hooks/use-toast";
import { getAppConfig, type AppConfig } from "@/config/appConfig";
import { bookingBeService } from "@/services/bookingBeService";
import type { Location } from "@/types/api";

const Index = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  const [date, setDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedSlotData, setSelectedSlotData] = useState<TimeSlot | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(120);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ bookingId?: string; bookingNumber?: number } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    purpose: "",
    attendees: "1",
  });

  // Load config on mount
  useEffect(() => {
    getAppConfig()
      .then(setConfig)
      .catch(() => setConfigError("Failed to load configuration."));
  }, []);

  const handleDateChange = (d: Date | undefined) => {
    if (d) {
      setDate(d);
      setSelectedSlot(null);
      setSelectedSlotData(null);
    }
  };

  const handleLocationSelect = (id: string, name: string) => {
    setLocationId(id);
    setLocationName(name);
    setSelectedSlot(null);
    setSelectedSlotData(null);
  };

  const handleLocationDetails = (loc: Location, duration: number) => {
    setSlotDurationMinutes(duration);
  };

  const handleSlotSelect = (slotId: string, slot: TimeSlot) => {
    setSelectedSlot(slotId);
    setSelectedSlotData(slot);
  };

  const handleSubmit = async () => {
    if (!locationId) {
      toast({ title: "Please select a location", variant: "destructive" });
      return;
    }
    if (!selectedSlotData) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }
    if (!formData.firstName || !formData.phone || !formData.purpose) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (!config) return;

    setSubmitting(true);
    try {
      const result = await bookingBeService.createBooking(config.companyBeUrl, {
        locationId,
        locationName,
        contact: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
        },
        bookingSchedule: [
          {
            startTime: selectedSlotData.startISO,
            endTime: selectedSlotData.endISO,
            totalMinutes: selectedSlotData.totalMinutes,
          },
        ],
        reasonOfBooking: formData.purpose,
        noOfPersons: formData.attendees,
        totalBillableAmount: 0,
        urlToken: config.companyToken,
      });

      setBookingResult({ bookingId: result.bookingId, bookingNumber: result.bookingNumber });
      setSubmitted(true);
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description: err?.response?.data?.message ?? err?.message ?? "Something went wrong",
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
          <p className="text-destructive font-medium">{configError}</p>
        </Card>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            Your slot on <span className="font-semibold text-foreground">{format(date, "EEEE, MMM d, yyyy")}</span> has been reserved.
          </p>
          {bookingResult?.bookingNumber && (
            <p className="text-sm text-muted-foreground">
              Booking #{bookingResult.bookingNumber}
            </p>
          )}
          <Button onClick={() => { setSubmitted(false); setSelectedSlot(null); setSelectedSlotData(null); setLocationId(null); setLocationName(""); setBookingResult(null); }} className="mt-4">
            Book Another Slot
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-wider">
              Pune Sport Academy
            </h1>
            <p className="text-xs text-primary-foreground/70">Shooting Range · Online Booking</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 pb-28">
        {/* Location */}
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wider text-foreground">
              Location
            </h2>
          </div>
          <LocationSelect
            companyBeUrl={config.companyBeUrl}
            companyToken={config.companyToken}
            onSelect={handleLocationSelect}
            onLocationDetails={handleLocationDetails}
          />
        </div>

        {/* Pick Your Slot */}
        <div className="bg-card rounded-xl border border-border p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Crosshair className="w-5 h-5 text-primary" />
            <h2 className="font-display text-base font-semibold uppercase tracking-wider text-foreground">
              Pick Your Slot
            </h2>
          </div>

          {/* Date Picker */}
          <div className="mb-5">
            <label className="text-sm text-muted-foreground mb-1.5 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-medium h-11",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {format(date, "EEEE, d MMMM yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Slots */}
          <SlotPicker
            date={date}
            locationId={locationId}
            companyBeUrl={config.companyBeUrl}
            slotDurationMinutes={slotDurationMinutes}
            selectedSlot={selectedSlot}
            onSelectSlot={handleSlotSelect}
          />
        </div>

        {/* Booking Details + Contact Details */}
        <BookingForm data={formData} onChange={setFormData} />
      </main>

      {/* Sticky Confirm Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={submitting}
            className="w-full font-display uppercase tracking-wider text-base h-12 gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
            ) : (
              <><Send className="w-4 h-4" /> Confirm Booking</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
