import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'te' | 'hi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary - AI Freelance Marketplace
const translations = {
  en: {
    // Navigation
    home: 'Home',
    postTask: 'Post Project',
    myTasks: 'My Projects',
    browseTasks: 'Find Work',
    myGigs: 'My Gigs',
    payments: 'Payments',
    earnings: 'Earnings',
    profile: 'Profile',
    dashboard: 'Dashboard',
    users: 'Users',
    tasks: 'Projects',
    reports: 'Reports',
    
    // Common
    welcome: 'Welcome to Richo',
    getStarted: 'Get Started',
    login: 'Login',
    signup: 'Sign Up',
    client: 'Hire Talent',
    doer: 'Expert',
    expert: 'AI Expert',
    admin: 'Admin',
    
    // Hero Section
    heroHeadline: 'The AI Freelance Marketplace.',
    heroSubheadline: 'Hire vetted Prompt Engineers, Vibe Coders, AI Automation Experts, and Video Editors. The future of work is here.',
    
    // CTAs
    findAITalent: 'Find AI Talent',
    joinAsExpert: 'Join as Expert',
    
    // Taglines
    tagline: 'The AI Freelance Marketplace',
    clientTagline: 'Hire vetted AI experts for your projects',
    doerTagline: 'Showcase your AI skills and get hired',
    expertTagline: 'Showcase your AI skills and get hired',
    
    // Trust
    trustedBy: 'Trusted by businesses building with AI',
    
    // Categories
    aiWorkflows: 'AI Workflows',
    vibeCoding: 'Vibe Coding',
    promptEngineering: 'Prompt Engineering',
    aiVideoEditing: 'AI Video Editing',
    webDesign: 'Web Design',
    generalFreelancing: 'General Freelancing',
    
    // Actions
    postNewTask: 'Post New Project',
    browseAllTasks: 'Browse All Projects',
    viewProfile: 'View Profile',
    manageUsers: 'Manage Users',
  },
  te: {
    // Navigation
    home: 'హోమ్',
    postTask: 'ప్రాజెక్ట్ పోస్ట్ చేయండి',
    myTasks: 'నా ప్రాజెక్ట్‌లు',
    browseTasks: 'పని కనుగొనండి',
    myGigs: 'నా పనులు',
    payments: 'చెల్లింపులు',
    earnings: 'ఆదాయాలు',
    profile: 'ప్రొఫైల్',
    dashboard: 'డ్యాష్‌బోర్డ్',
    users: 'వినియోగదారులు',
    tasks: 'ప్రాజెక్ట్‌లు',
    reports: 'నివేదికలు',
    
    // Common
    welcome: 'రిచోకు స్వాగతం',
    getStarted: 'ప్రారంభించండి',
    login: 'లాగిన్',
    signup: 'సైన్ అప్',
    client: 'టాలెంట్ నియమించండి',
    doer: 'ఎక్స్‌పర్ట్',
    expert: 'AI ఎక్స్‌పర్ట్',
    admin: 'అడ్మిన్',
    
    // Hero Section
    heroHeadline: 'AI ఫ్రీలాన్స్ మార్కెట్‌ప్లేస్.',
    heroSubheadline: 'ధృవీకరించబడిన ప్రాంప్ట్ ఇంజనీర్లు, వైబ్ కోడర్లు, AI ఆటోమేషన్ ఎక్స్‌పర్ట్‌లు మరియు వీడియో ఎడిటర్‌లను నియమించుకోండి. పని భవిష్యత్తు ఇక్కడ ఉంది.',
    
    // CTAs
    findAITalent: 'AI టాలెంట్ కనుగొనండి',
    joinAsExpert: 'ఎక్స్‌పర్ట్‌గా చేరండి',
    
    // Taglines
    tagline: 'AI ఫ్రీలాన్స్ మార్కెట్‌ప్లేస్',
    clientTagline: 'మీ ప్రాజెక్ట్‌ల కోసం ధృవీకరించబడిన AI నిపుణులను నియమించండి',
    doerTagline: 'మీ AI నైపుణ్యాలను ప్రదర్శించండి మరియు నియమించబడండి',
    expertTagline: 'మీ AI నైపుణ్యాలను ప్రదర్శించండి మరియు నియమించబడండి',
    
    // Trust
    trustedBy: 'AI తో నిర్మించే వ్యాపారాలచే విశ్వసించబడింది',
    
    // Categories
    aiWorkflows: 'AI వర్క్‌ఫ్లోలు',
    vibeCoding: 'వైబ్ కోడింగ్',
    promptEngineering: 'ప్రాంప్ట్ ఇంజనీరింగ్',
    aiVideoEditing: 'AI వీడియో ఎడిటింగ్',
    webDesign: 'వెబ్ డిజైన్',
    generalFreelancing: 'సాధారణ ఫ్రీలాన్సింగ్',
    
    // Actions
    postNewTask: 'కొత్త ప్రాజెక్ట్ పోస్ట్ చేయండి',
    browseAllTasks: 'అన్ని ప్రాజెక్ట్‌లను బ్రౌజ్ చేయండి',
    viewProfile: 'ప్రొఫైల్ చూడండి',
    manageUsers: 'వినియోగదారులను నిర్వహించండి',
  },
  hi: {
    // Navigation
    home: 'होम',
    postTask: 'प्रोजेक्ट पोस्ट करें',
    myTasks: 'मेरे प्रोजेक्ट',
    browseTasks: 'काम खोजें',
    myGigs: 'मेरे काम',
    payments: 'भुगतान',
    earnings: 'कमाई',
    profile: 'प्रोफाइल',
    dashboard: 'डैशबोर्ड',
    users: 'उपयोगकर्ता',
    tasks: 'प्रोजेक्ट',
    reports: 'रिपोर्ट',
    
    // Common
    welcome: 'रिचो में आपका स्वागत है',
    getStarted: 'शुरू करें',
    login: 'लॉगिन',
    signup: 'साइन अप',
    client: 'टैलेंट हायर करें',
    doer: 'एक्सपर्ट',
    expert: 'AI एक्सपर्ट',
    admin: 'एडमिन',
    
    // Hero Section
    heroHeadline: 'AI फ्रीलांस मार्केटप्लेस।',
    heroSubheadline: 'सत्यापित प्रॉम्प्ट इंजीनियर, वाइब कोडर, AI ऑटोमेशन एक्सपर्ट और वीडियो एडिटर को हायर करें। काम का भविष्य यहां है।',
    
    // CTAs
    findAITalent: 'AI टैलेंट खोजें',
    joinAsExpert: 'एक्सपर्ट के रूप में जुड़ें',
    
    // Taglines
    tagline: 'AI फ्रीलांस मार्केटप्लेस',
    clientTagline: 'अपने प्रोजेक्ट्स के लिए सत्यापित AI विशेषज्ञों को हायर करें',
    doerTagline: 'अपने AI कौशल दिखाएं और हायर हों',
    expertTagline: 'अपने AI कौशल दिखाएं और हायर हों',
    
    // Trust
    trustedBy: 'AI के साथ निर्माण करने वाले व्यवसायों द्वारा विश्वसनीय',
    
    // Categories
    aiWorkflows: 'AI वर्कफ्लो',
    vibeCoding: 'वाइब कोडिंग',
    promptEngineering: 'प्रॉम्प्ट इंजीनियरिंग',
    aiVideoEditing: 'AI वीडियो एडिटिंग',
    webDesign: 'वेब डिजाइन',
    generalFreelancing: 'सामान्य फ्रीलांसिंग',
    
    // Actions
    postNewTask: 'नया प्रोजेक्ट पोस्ट करें',
    browseAllTasks: 'सभी प्रोजेक्ट्स ब्राउज़ करें',
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
