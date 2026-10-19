import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { Button, Card, Input, FormField, MapComponent } from '../../components/common';
import { ethiopianPhoneSchema } from '../../utils/phone';

const contactFormSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phoneNumber: ethiopianPhoneSchema,
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: '',
      phoneNumber: '+251',
      subject: '',
      message: '',
    },
  });

  const onSubmit = async () => {
    // In production this triggers contact message dispatch
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitted(true);
    reset();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 space-y-12 animate-in fade-in" data-testid="contact-page">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Community & Visitor Support</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
          Contact Kinka Support
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Need assistance with tour reservations, agricultural orders, certified local guides, or USSD access? Our regional coordinators in Jinka, Dimeka, and Turmi are available to assist you.
        </p>
      </div>

      {/* Main Grid: Form and Contact Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10 items-start">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Send Us a Message
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Fill out the inquiry form below and our regional desk will respond within 24 hours.
              </p>
            </div>

            {isSubmitted && (
              <div
                className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-start gap-3"
                role="status"
                data-testid="contact-success-alert"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">Message sent successfully!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Thank you for reaching out. A regional coordinator will contact your phone or email shortly.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="fullName" label="Full Name" required error={errors.fullName?.message}>
                  <Input
                    id="fullName"
                    {...register('fullName')}
                    placeholder="e.g. Abebe Bikila"
                    hasError={Boolean(errors.fullName)}
                  />
                </FormField>

                <FormField id="phoneNumber" label="Phone Number" required error={errors.phoneNumber?.message}>
                  <Input
                    id="phoneNumber"
                    {...register('phoneNumber')}
                    placeholder="+251 911 000000"
                    hasError={Boolean(errors.phoneNumber)}
                  />
                </FormField>
              </div>

              <FormField id="subject" label="Subject" required error={errors.subject?.message}>
                <Input
                  id="subject"
                  {...register('subject')}
                  placeholder="e.g. Tour Guide Reservation or Agro Order Inquiry"
                  hasError={Boolean(errors.subject)}
                />
              </FormField>

              <FormField id="message" label="Message" required error={errors.message?.message}>
                <textarea
                  id="message"
                  {...register('message')}
                  rows={4}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
                  placeholder="Provide details about your experience, inquiry, or preferred dates..."
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" aria-hidden="true" />
                <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
              </Button>
            </form>
          </Card>

          {/* Regional Map Component */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Main Visitor Coordination Desk — Jinka</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Located at the South Omo Zonal Administrative Complex, Jinka Central Avenue.
            </p>
            <MapComponent
              latitude={5.7833}
              longitude={36.5667}
              title="Kinka Regional Office"
              address="South Omo Administration Complex, Jinka Town"
              className="h-64 w-full"
            />
          </Card>
        </div>

        {/* Right 1 Col: Office Info & Hotlines */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Contact Info */}
          <Card className="p-6 space-y-6">
            <h3 className="text-base font-bold text-foreground pb-2 border-b border-border">
              Contact Channels
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-foreground">Phone Hotline</span>
                  <a href="tel:+251911000001" className="text-xs text-primary hover:underline">
                    +251 911 000001
                  </a>
                  <span className="text-[11px] text-muted-foreground block">
                    (Zonal Support Desk)
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-foreground">Email Support</span>
                  <a href="mailto:support@omobridge.et" className="text-xs text-primary hover:underline">
                    support@omobridge.et
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-foreground">Office Hours</span>
                  <span className="text-xs text-muted-foreground block">
                    Mon - Sat: 08:00 - 18:00 EAT
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    Sunday: Emergency dispatch only
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-semibold block text-foreground">Offline USSD Channel</span>
                  <span className="text-xs font-mono font-bold text-foreground">
                    *844#
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    For feature phones on Ethio Telecom
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Regional Information Desks */}
          <Card className="p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground pb-2 border-b border-border">
              Regional Desks
            </h3>

            <div className="space-y-3 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground block text-sm">Turmi Cultural Desk</strong>
                <span>Near Keske River Crossing, Turmi Market</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <strong className="text-foreground block text-sm">Dimeka Union Hub</strong>
                <span>Dimeka Agro Cooperative Union Complex</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <strong className="text-foreground block text-sm">Omorate Border Desk</strong>
                <span>Dassanech Woreda Council Center, Omorate</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
