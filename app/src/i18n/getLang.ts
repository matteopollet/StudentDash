import { cookies, headers } from 'next/headers';
import { Language } from './dictionaries';

export async function getLang(): Promise<Language> {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('lang');
  if (langCookie && (langCookie.value === 'fr' || langCookie.value === 'en')) {
    return langCookie.value as Language;
  }
  
  // Fallback to Accept-Language
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage && acceptLanguage.toLowerCase().startsWith('en')) {
    return 'en';
  }
  
  return 'fr';
}
