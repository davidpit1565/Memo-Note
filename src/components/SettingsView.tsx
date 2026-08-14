import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Globe,
  Sparkles,
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileText
} from 'lucide-react';
import type { UserSettings, AppLanguage, ThemeMode } from '../types';
import { TRANSLATIONS } from '../lib/i18n';
import { exportAllNotesJSON, importNotesFromJSON } from '../lib/export-import';

interface SettingsViewProps {
  settings: UserSettings;
  language: AppLanguage;
  theme: ThemeMode;
  onUpdateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onToggleTheme: (theme: ThemeMode) => void;
  onToggleLanguage: (lang: AppLanguage) => void;
  onRefreshData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  language,
  theme,
  onUpdateSettings,
  onToggleTheme,
  onToggleLanguage,
  onRefreshData,
}) => {
  const t = TRANSLATIONS[language];
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleExportJSON = async () => {
    try {
      const json = await exportAllNotesJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memo-ai-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage('Database successfully exported!');
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err: any) {
      setExportMessage(`Export failed: ${err?.message}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importNotesFromJSON(text);
      await onRefreshData();
      setImportMessage(`Imported ${res.importedCount} notes successfully!`);
      setTimeout(() => setImportMessage(null), 4000);
    } catch (err: any) {
      setImportMessage(`Import failed: ${err?.message}`);
    }
  };

  return (
    <div className="flex flex-col max-w-3xl mx-auto w-full py-6 px-4 md:px-8 gap-8 text-white">
      <div>
        <h1 className="text-2xl md:text-3xl font-light tracking-tight font-serif italic text-white/95">{t.settings}</h1>
        <p className="text-xs text-white/40 mt-0.5">Configure appearance, language, AI intelligence, and backups.</p>
      </div>

      {/* Appearance & Language */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{t.theme} & {t.language}</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/90">{t.theme}</span>
            <span className="text-[11px] text-white/40">Choose light or dark visual canvas</span>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
            <button
              onClick={() => onToggleTheme('light')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                theme === 'light' ? 'bg-white text-[#0C0C0C] font-semibold shadow-xs' : 'text-white/40 hover:text-white'
              }`}
            >
              <Sun size={13} />
              <span>Light</span>
            </button>
            <button
              onClick={() => onToggleTheme('dark')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                theme === 'dark' ? 'bg-white text-[#0C0C0C] font-semibold shadow-xs' : 'text-white/40 hover:text-white'
              }`}
            >
              <Moon size={13} />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/5">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/90">{t.language}</span>
            <span className="text-[11px] text-white/40">Interface language and text direction (RTL/LTR)</span>
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-full">
            <button
              onClick={() => onToggleLanguage('en')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                language === 'en' ? 'bg-white text-[#0C0C0C] font-semibold shadow-xs' : 'text-white/40 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => onToggleLanguage('he')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                language === 'he' ? 'bg-white text-[#0C0C0C] font-semibold shadow-xs' : 'text-white/40 hover:text-white'
              }`}
            >
              עברית
            </button>
          </div>
        </div>
      </div>

      {/* AI Features Preferences */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-white" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{t.aiSettings}</h2>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/90">Automatic Background Analysis</span>
              <span className="text-[11px] text-white/40">Analyze notes when typing pauses to suggest tasks and entities</span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoAnalyze}
              onChange={(e) => onUpdateSettings({ autoAnalyze: e.target.checked })}
              className="h-4 w-4 rounded accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer pt-3 border-t border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/90">Action Item Extraction</span>
              <span className="text-[11px] text-white/40">Extract tasks, dates, and deadlines from text</span>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTaskExtraction}
              onChange={(e) => onUpdateSettings({ enableTaskExtraction: e.target.checked })}
              className="h-4 w-4 rounded accent-white"
            />
          </label>

          <label className="flex items-center justify-between gap-3 cursor-pointer pt-3 border-t border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/90">Smart Title & Tag Suggestions</span>
              <span className="text-[11px] text-white/40">Generate crisp titles and topic tags</span>
            </div>
            <input
              type="checkbox"
              checked={settings.enableTitleSuggestions}
              onChange={(e) => onUpdateSettings({ enableTitleSuggestions: e.target.checked })}
              className="h-4 w-4 rounded accent-white"
            />
          </label>
        </div>
      </div>

      {/* Backup & Export */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-white/60" />
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">{t.exportImport}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-white/90 transition-colors"
          >
            <Download size={14} />
            <span>Export Database (JSON)</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-white/90 transition-colors cursor-pointer">
            <Upload size={14} />
            <span>Import JSON Backup</span>
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>

        {exportMessage && (
          <span className="text-xs text-emerald-400 font-medium">
            {exportMessage}
          </span>
        )}
        {importMessage && (
          <span className="text-xs text-emerald-400 font-medium">
            {importMessage}
          </span>
        )}
      </div>

      {/* Privacy Guarantee */}
      <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2 text-white/90 font-bold text-xs">
          <ShieldCheck size={16} className="text-emerald-400" />
          <span>{t.privacyNotice}</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed font-light">
          {t.privacyDesc}
        </p>
      </div>
    </div>
  );
};
