import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface BookingFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  purpose: string;
  attendees: string;
}

interface BookingFormProps {
  data: BookingFormData;
  onChange: (data: BookingFormData) => void;
}

const BookingForm = ({ data, onChange }: BookingFormProps) => {
  const update = (field: keyof BookingFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground tracking-wide uppercase mb-4">
          Contact Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" value={data.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="John" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" value={data.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Doe" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 99224 40163" required />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold text-foreground tracking-wide uppercase mb-4">
          Booking Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="purpose">Purpose of Booking *</Label>
            <Textarea id="purpose" value={data.purpose} onChange={(e) => update("purpose", e.target.value)} placeholder="Practice session, competition training..." rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="attendees">Approx. Attendees</Label>
            <Input id="attendees" type="number" min="1" value={data.attendees} onChange={(e) => update("attendees", e.target.value)} placeholder="1" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;
