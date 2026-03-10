import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../data/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        return localStorage.getItem('sankal_language') || 'en';
    });

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
        localStorage.setItem('sankal_language', lang);
    }, []);

    const t = useCallback((key) => {
        return translations[language]?.[key] || translations['en']?.[key] || key;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
