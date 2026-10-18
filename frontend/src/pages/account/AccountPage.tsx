import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Shield,
  Globe2,
  LogOut,
  Building,
  Sprout,
  CheckCircle2,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { Card, Button, StatusChip } from '../../components/common';
import { useAuthStore } from '../../features/auth/authStore';
import { Roles, getDefaultDashboardRoute } from '../../features/auth/roleHelpers';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English (US / International)', native: 'English' },
  { code: 'am', name: 'Amharic (Ethiopia)', native: 'አማርኛ' },
  { code: 'hbr', name: 'Hamer-Banna (South Omo)', native: 'Hamer' },
  { code: 'dsh', name: 'Dasenech (Lower Omo)', native: 'Daasanach' },
  { code: 'tsm', name: 'Tsamai (Woito Valley)', native: 'Tsamai' },
];

export const LANGUAGE_STORAGE_KEY = 'omobridge_language';

export default function AccountPage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentLang =
    selectedLang ||
    user?.preferredLanguage ||
    (typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null) ||
    'en';

  const handleLanguageChange = (newCode: string) => {
    setSelectedLang(newCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newCode);
    }

    if (user) {
      const updatedUser = { ...user, preferredLanguage: newCode };
      setUser(updatedUser);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const defaultDashboard = getDefaultDashboardRoute(user?.roles);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in" data-testid="account-page">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Account & Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal details, language preference, and linked OmoBridge memberships.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Identity & Contact Card */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {user?.fullName ? user.fullName[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {user?.fullName || 'OmoBridge Member'}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusChip
                      status={user?.status || 'ACTIVE'}
                      label={user?.status || 'Active'}
                    />
                    {user?.verificationStatus && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        Verification: {user.verificationStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                  Phone Number
                </span>
                <p className="font-semibold text-foreground">
                  {user?.phoneNumber || 'Not specified'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Email Address
                </span>
                <p className="font-semibold text-foreground">
                  {user?.email || 'None attached'}
                </p>
              </div>
            </div>

            {/* Roles and permissions */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                Assigned Platform Roles
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {(user?.roles || [Roles.BUYER_VISITOR]).map((role) => (
                  <span
                    key={role}
                    className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary/10 text-primary"
                  >
                    {role.replace(/^ROLE_/, '').replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* Linked Profile Details */}
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" aria-hidden="true" />
              Linked Role Profiles
            </h2>

            {/* Enterprise Link */}
            {user?.enterpriseName && (
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Building className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {user.enterpriseName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Linked Micro-Enterprise Cooperative
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/enterprise">
                  <Button variant="ghost" size="sm">
                    Open Hub
                  </Button>
                </Link>
              </div>
            )}

            {/* Farmer Link */}
            {user?.farmerCode && (
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Sprout className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Farmer Code: {user.farmerCode}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Traceable Producer ID · USSD Fast Access: *844#
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/farmer">
                  <Button variant="ghost" size="sm">
                    Deliveries
                  </Button>
                </Link>
              </div>
            )}

            {!user?.enterpriseName && !user?.farmerCode && (
              <p className="text-xs text-muted-foreground">
                No enterprise or producer links assigned to this account. You are operating as a standard buyer/visitor.
              </p>
            )}
          </Card>

          {/* Quick Shortcuts: My Bookings */}
          <Card className="p-6 space-y-3">
            <h2 className="text-base font-bold text-foreground flex items-center justify-between">
              <span>My Experiences & Bookings</span>
              <Calendar className="w-4 h-4 text-primary" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Review your reserved cultural tours, scheduled ceremonies, and download printable vouchers.
            </p>
            <Link to="/account/bookings">
              <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-between mt-2">
                <span>View All Bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </Card>
        </div>

        {/* Right Column: Language Preferences & Actions */}
        <div className="space-y-6">
          {/* Language Preference Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-primary" aria-hidden="true" />
                Language Preference
              </h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose your preferred interface language. Changes persist across sessions and API requests.
            </p>

            {saveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                <span>Language preference saved</span>
              </div>
            )}

            <div className="space-y-2" role="radiogroup" aria-label="Interface Language Selection">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    role="radio"
                    aria-checked={isSelected}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground font-semibold shadow-xs'
                        : 'border-border bg-background hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{lang.native}</p>
                      <p className="text-[11px] text-muted-foreground">{lang.name}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Quick Links & Sign Out */}
          <Card className="p-6 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Account Actions</h2>

            {user && (
              <Link to={defaultDashboard} className="block w-full">
                <Button variant="outline" className="w-full flex items-center justify-between">
                  <span>Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
