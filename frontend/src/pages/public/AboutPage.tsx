import { Link } from 'react-router-dom';
import {
  Compass,
  HeartHandshake,
  ShieldCheck,
  Smartphone,
  Sprout,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Button, Card } from '../../components/common';

export default function AboutPage() {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-16 animate-in fade-in" data-testid="about-page">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          <HeartHandshake className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Bridging Communities in South Omo</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
          About OmoBridge
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          OmoBridge is the unified digital platform connecting rural producers, community hubs, certified tour guides, and ethical travelers across the South Omo Zone of Ethiopia.
        </p>
      </div>

      {/* Dual Channel Architecture */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Dual-Channel Inclusion
          </h2>
          <p className="text-sm text-muted-foreground">
            Ensuring no pastoralist or rural farmer is left behind by low connectivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-7 space-y-4 border-primary/30 bg-primary/5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              USSD & Feature Phones (*844#)
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Pastoralists, farmers, and village elders access live commodity buying prices, confirm harvest drop-offs, and receive instant Telebirr mobile payments through a lightweight, zero-data USSD menu available on any mobile phone.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-mono font-bold text-primary">
              <span>Short Code: *844#</span>
              <span>•</span>
              <span>No Smartphone Required</span>
            </div>
          </Card>

          <Card className="p-7 space-y-4 border-border bg-card">
            <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center">
              <Compass className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-foreground">
              Modern PWA Web Experience
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Travelers, buyers, and enterprise managers explore ethical cultural rituals, track verifiable batch origins via QR codes, manage inventory movements, and inspect agricultural supply through an installable, offline-resilient web application.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Installable PWA</span>
              <span>•</span>
              <span>Offline GPS Checkpoints</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Core Principles */}
      <section className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center">
          Our Ethical Commitments
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Community Elder Sanction
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every tour package and village visit is pre-approved by traditional councils of elders with formal consent covenants to ensure sacred rituals are never commodified or compromised.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sprout className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Verifiable Traceability
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              From white honey in Mago to organic sesame in Dimeka, each product batch is tracked from farmer delivery to final processing with full QR transparency.
            </p>
          </Card>

          <Card className="p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Direct Local Livelihoods
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transparent fees ensure certified local guides, delivery couriers, and village development funds receive guaranteed direct shares of tourism and commerce proceeds.
            </p>
          </Card>
        </div>
      </section>

      {/* Institutional Partners */}
      <section className="p-8 rounded-3xl bg-muted/40 border border-border text-center space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Institutional Partners & Cooperative Unions
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
          Collaborating with the South Omo Zone Administrative Council, Dimeka Agro Cooperative Union, Jinka University Agricultural Extension, and certified guide associations.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <span className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground">
            Dimeka Agro Cooperative Union
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground">
            South Omo Tourism Department
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium text-foreground">
            Jinka Agricultural Research Institute
          </span>
        </div>
      </section>

      {/* Navigation CTA Strip */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <Link to="/tourism">
          <Button variant="primary" size="md">
            Explore Cultural Experiences
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Button>
        </Link>
        <Link to="/safety-guidelines">
          <Button variant="outline" size="md">
            Read Safety & Cultural Etiquette
          </Button>
        </Link>
        <Link to="/contact">
          <Button variant="outline" size="md">
            Contact Support Desks
          </Button>
        </Link>
      </div>
    </div>
  );
}
