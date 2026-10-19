import { Link } from 'react-router-dom';
import {
  Sprout,
  Layers,
  Truck,
  Compass,
  ShoppingBag,
  ArrowRight,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { Card, Button } from '../../components/common';

interface RoleOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  link: string;
  badge?: string;
  buttonLabel: string;
  variant: 'primary' | 'secondary' | 'outline';
  extraNote?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'producer',
    title: 'Producer & Farmer',
    subtitle:
      'Supply honey, moringa, sesame, and crops with full batch traceability and fair mobile payouts.',
    icon: Sprout,
    link: '/register/producer',
    badge: 'Dual-Channel (App & USSD)',
    buttonLabel: 'Register as Farmer',
    variant: 'primary',
    extraNote: 'Available on feature phones via USSD *844#',
  },
  {
    id: 'enterprise',
    title: 'Local Community Hub',
    subtitle:
      'Process harvest lots, manage inventory, publish products to buyers, and disburse farmer payments.',
    icon: Layers,
    link: '/register/enterprise',
    badge: 'Coop & Processing',
    buttonLabel: 'Register Community Hub',
    variant: 'primary',
  },
  {
    id: 'delivery',
    title: 'Delivery Courier',
    subtitle:
      'Earn by transporting agricultural goods and eco-tour supplies across South Omo travel corridors.',
    icon: Truck,
    link: '/register/delivery',
    badge: 'Last-Mile Logistics',
    buttonLabel: 'Register as Courier',
    variant: 'primary',
  },
  {
    id: 'guide',
    title: 'Certified Tour Guide',
    subtitle:
      'Host cultural heritage tours, hiking expeditions, and bull jumping ceremony visits with community oversight.',
    icon: Compass,
    link: '/register/guide',
    badge: 'South Omo Tourism',
    buttonLabel: 'Register as Guide',
    variant: 'primary',
  },
  {
    id: 'buyer',
    title: 'Buyer & Eco-Tourist',
    subtitle:
      'Purchase verified single-origin goods directly from local cooperatives and book ethical cultural experiences.',
    icon: ShoppingBag,
    link: '/register/buyer',
    badge: 'Instant Access',
    buttonLabel: 'Create Buyer Account',
    variant: 'outline',
  },
];

export default function JoinPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="join-page">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="flex justify-center mb-1">
          <img
            src="/kinka-logo.png"
            alt="Kinka Logo"
            className="w-16 h-16 rounded-full object-cover shadow-md ring-2 ring-amber-600/30"
          />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Community-First Digital Platform</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Join Kinka
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Select your role to connect with rural producers, processing cooperatives, local couriers, and travelers across South Omo, Ethiopia.
        </p>
      </div>

      {/* Role Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ROLE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.id}
              className="flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-md p-6 h-full"
              data-testid={`role-card-${option.id}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  {option.badge && (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {option.badge}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-foreground">
                    {option.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {option.subtitle}
                  </p>
                </div>

                {option.extraNote && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-lg font-medium">
                    <PhoneCall className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{option.extraNote}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-auto">
                <Link to={option.link} className="block w-full" aria-label={`${option.buttonLabel} - ${option.title}`}>
                  <Button
                    variant={option.variant}
                    className="w-full flex items-center justify-center gap-2 group"
                  >
                    <span>{option.buttonLabel}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Existing User Banner */}
      <div className="p-6 rounded-2xl border border-border bg-muted/40 text-center max-w-xl mx-auto space-y-2">
        <p className="text-sm text-foreground font-medium">
          Already registered on Kinka?
        </p>
        <p className="text-xs text-muted-foreground">
          Sign in to access your producer, enterprise, courier, guide, or visitor dashboard.
        </p>
        <div className="pt-2">
          <Link to="/login">
            <Button variant="outline" size="sm">
              Sign In to Your Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
