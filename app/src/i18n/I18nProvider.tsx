'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { dictionaries, Language, Dictionary } from './dictionaries';
import { useRouter } from 'next/navigation';

type I18nContextType = {
  lang: Language;
  t: Dictionary;
  setLang: (lang: Language) => void;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ 
  children, 
  initialLang 
}: { 
  children: React.ReactNode; 
  initialLang: Language; 
}) {
  const [lang, setLangState] = useState<Language>(initialLang);
  const router = useRouter();

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    document.cookie = `lang=${newLang}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <I18nContext.Provider value={{ lang, t: dictionaries[lang], setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
