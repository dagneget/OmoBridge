import i18n from './index';
import { normalizeLanguage, persistLanguage } from './languages';
import { queryClient } from '../services/queryClient';
import { useAuthStore } from '../features/auth/authStore';

export async function changeLanguage(language: string) {
  const code = normalizeLanguage(language);
  // Persist before notifying React so new requests use the new language.
  persistLanguage(code);
  const { user, setUser } = useAuthStore.getState();
  if (user) setUser({ ...user, preferredLanguage: code });
  await i18n.changeLanguage(code);
  await queryClient.cancelQueries();
  await queryClient.invalidateQueries();
}
