import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Languages } from 'lucide-react';

const LanguageSwitcher = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="flex items-center gap-1.5">
            <Languages className="w-4 h-4 text-white/70 hidden sm:block" />
            <div className="flex rounded-lg overflow-hidden border border-white/30">
                <button
                    onClick={() => setLanguage('en')}
                    className={`px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                        language === 'en'
                            ? 'bg-white text-primary-700'
                            : 'bg-transparent text-white hover:bg-white/10'
                    }`}
                >
                    English
                </button>
                <button
                    onClick={() => setLanguage('hi')}
                    className={`px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                        language === 'hi'
                            ? 'bg-white text-primary-700'
                            : 'bg-transparent text-white hover:bg-white/10'
                    }`}
                >
                    हिंदी
                </button>
            </div>
        </div>
    );
};

export default LanguageSwitcher;
