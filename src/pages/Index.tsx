import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Crosshair, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SlotPicker from "@/components/SlotPicker";
import BookingForm, { BookingFormData } from "@/components/BookingForm";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<BookingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    purpose: "",
    attendees: "1",
  });

  const handleDateChange = (d: Date | undefined) => {
    if (d) {
      setDate(d);
      setSelectedSlot(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedSlot) {
      toast({ title: "Please select a time slot", variant: "destructive" });
      return;
    }
    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.purpose) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
          <h2 className="font-display text-2xl font-bold text-foreground uppercase tracking-wide">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            Your slot on <span className="font-semibold text-foreground">{format(date, "EEEE, MMM d, yyyy")}</span> has been reserved.
          </p>
          <Button onClick={() => { setSubmitted(false); setSelectedSlot(null); }} className="mt-4">
            Book Another Slot
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">
              Pune Sport Academy
            </h1>
            <p className="text-xs text-muted-foreground">Shooting Range · Online Booking</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Date + Slots */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Select Date
              </h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="p-0 pointer-events-auto"
              />
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Pick a Slot
              </h2>
              <SlotPicker date={date} selectedSlot={selectedSlot} onSelectSlot={setSelectedSlot} />
            </Card>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-3">
            <Card className="p-6">
              <BookingForm data={formData} onChange={setFormData} />

              {selectedSlot && (
                <div className="mt-6 p-4 rounded-lg bg-secondary border border-border">
                  <p className="text-sm text-muted-foreground">Selected</p>
                  <p className="font-semibold text-foreground">
                    {format(date, "EEE, MMM d")} · {selectedSlot.replace("slot-", "").replace(/(\d+)/, (_, h) => {
                      const hour = parseInt(h);
                      const fmt = (hr: number) => `${hr > 12 ? hr - 12 : hr}:00 ${hr >= 12 ? "PM" : "AM"}`;
                      return `${fmt(hour)} – ${fmt(hour + 2)}`;
                    })}
                  </p>
                </div>
              )}

              <Button onClick={handleSubmit} size="lg" className="w-full mt-6 font-display uppercase tracking-wider text-base">
                Confirm Booking
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
