import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'te' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // Navigation
    home: 'Home',
    postTask: 'Post Task',
    myTasks: 'My Tasks',
    browseTasks: 'Browse Tasks',
    myGigs: 'My Gigs',
    payments: 'Payments',
    earnings: 'Earnings',
    profile: 'Profile',
    dashboard: 'Dashboard',
    users: 'Users',
    tasks: 'Tasks',
    reports: 'Reports',
    
    // Common
    welcome: 'Welcome to Richo',
    getStarted: 'Get Started',
    login: 'Login',
    signup: 'Sign Up',
    client: 'Client',
    doer: 'Doer',
    admin: 'Admin',
    
    // Taglines
    tagline: 'Connect. Complete. Get Paid.',
    clientTagline: 'Post tasks and find skilled professionals',
    doerTagline: 'Browse tasks and earn money',
    
    // Actions
    postNewTask: 'Post New Task',
    browseAllTasks: 'Browse All Tasks',
    viewProfile: 'View Profile',
    manageUsers: 'Manage Users',
  },
  te: {
    // Navigation
    home: 'హోమ్',
    postTask: 'టాస్క్ పోస్ట్ చేయండి',
    myTasks: 'నా టాస్క్‌లు',
    browseTasks: 'టాస్క్‌లను బ్రౌజ్ చేయండి',
    myGigs: 'నా పనులు',
    payments: 'చెల్లింపులు',
    earnings: 'ఆదాయాలు',
    profile: 'ప్రొఫైల్',
    dashboard: 'డ్యాష్‌బోర్డ్',
    users: 'వినియోగదారులు',
    tasks: 'టాస్క్‌లు',
    reports: 'నివేదికలు',
    
    // Common
    welcome: 'రిచోకు స్వాగతం',
    getStarted: 'ప్రారంభించండి',
    login: 'లాగిన్',
    signup: 'సైన్ అప్',
    client: 'క్లయింట్',
    doer: 'చేసేవాడు',
    admin: 'అడ్మిన్',
    
    // Taglines
    tagline: 'కనెక్ట్ చేయండి. పూర్తి చేయండి. డబ్బు సంపాదించండి.',
    clientTagline: 'టాస్క్‌లను పోస్ట్ చేసి నైపుణ్యం గల నిపుణులను కనుగొనండి',
    doerTagline: 'టాస్క్‌లను బ్రౌజ్ చేసి డబ్బు సంపాదించండి',
    
    // Actions
    postNewTask: 'కొత్త టాస్క్ పోస్ట్ చేయండి',
    browseAllTasks: 'అన్ని టాస్క్‌లను బ్రౌజ్ చేయండి',
    viewProfile: 'ప్రొఫైల్ చూడండి',
    manageUsers: 'వినియోగదారులను నిర్వహించండి',
  },
  hi: {
    // Navigation
    home: 'होम',
    postTask: 'टास्क पोस्ट करें',
    myTasks: 'मेरे टास्क',
    browseTasks: 'टास्क ब्राउज़ करें',
    myGigs: 'मेरे काम',
    payments: 'भुगतान',
    earnings: 'कमाई',
    profile: 'प्रोफाइल',
    dashboard: 'डैशबोर्ड',
    users: 'उपयोगकर्ता',
    tasks: 'टास्क',
    reports: 'रिपोर्ट',
    
    // Common
    welcome: 'रिचो में आपका स्वागत है',
    getStarted: 'शुरू करें',
    login: 'लॉगिन',
    signup: 'साइन अप',
    client: 'क्लाइंट',
    doer: 'करने वाला',
    admin: 'एडमिन',
    
    // Taglines
    tagline: 'जुड़ें। पूरा करें। पैसे कमाएं।',
    clientTagline: 'टास्क पोस्ट करें और कुशल पेशेवरों को खोजें',
    doerTagline: 'टास्क ब्राउज़ करें और पैसे कमाएं',
    
    // Actions
    postNewTask: 'नया टास्क पोस्ट करें',
    browseAllTasks: 'सभी टास्क ब्राउज़ करें',
    viewProfile: 'प्रोफाइल देखें',
    manageUsers: 'उपयोगकर्ताओं को प्रबंधित करें',
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};