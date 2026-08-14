import React, { useState } from 'react';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import type { AppLanguage } from '../types';
import { TRANSLATIONS } from '../lib/i18n';

interface OnboardingModalProps {
  language: AppLanguage;
  onComplete: (userName: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  language,
  onComplete,
}) => {
  const t = TRANSLATIONS[language];
  const [name, setName] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const handleFinish = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onComplete(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0C0C0C] p-8 sm:p-10 shadow-2xl text-white">
        {step === 1 ? (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0C0C0C] shadow-lg">
              <span className="font-serif italic font-bold text-2xl">M</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-serif italic font-light tracking-tight text-white">
                {t.onboardingTitle}
              </h1>
              <p className="text-base sm:text-lg font-light text-white/80">
                {t.onboardingSubtitle}
              </p>
            </div>

            <p className="text-xs sm:text-sm font-light text-white/50 leading-relaxed max-w-xs">
              {t.onboardingDesc}
            </p>

            <button
              onClick={() => setStep(2)}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 px-6 text-sm font-bold text-[#0C0C0C] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              <span>{language === 'he' ? 'המשך' : 'Continue'}</span>
              <ArrowRight size={16} className="rtl:rotate-180" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleFinish} className="flex flex-col gap-6 text-start">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
                MEMO
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif italic font-light text-white">
                {t.onboardingPrompt}
              </h2>
            </div>

            <div className="relative">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboardingPlaceholder}
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3.5 text-base font-light text-white placeholder:text-white/30 focus:border-white/50 focus:bg-white/10 focus:outline-none transition-all"
              />
            </div>

            <p className="text-xs font-light text-white/40">
              {language === 'he'
                ? 'נשמר מקומית על המכשיר שלך בלבד.'
                : 'Stored locally on your device only.'}
            </p>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 px-6 text-sm font-bold text-[#0C0C0C] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
            >
              <Check size={16} strokeWidth={2.5} />
              <span>{t.onboardingCta}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
