import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
i18n.addResourceBundle(
  'en',
  'dashboardLayout',
  { navigation: 'Dashboard navigation' },
  true,
  true,
);
i18n.addResourceBundle(
  'am',
  'dashboardLayout',
  { navigation: 'የዳሽቦርድ ዳሰሳ' },
  true,
  true,
);
export function useDashboardText() {
  const { t } = useTranslation('dashboardLayout');
  return t;
}
