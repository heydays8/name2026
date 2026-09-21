import React from 'react';
import {
  UserCheck,
  LayoutDashboard,
  HelpCircle,
  School,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AppSettings } from '../types';

interface NavbarProps {
  currentView: 'student' | 'teacher';
  onSelectView: (view: 'student' | 'teacher') => void;
  settings: AppSettings;
  onOpenHelp: () => void;
  onOpenGoogleSheets?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  settings,
  onOpenHelp,
  onOpenGoogleSheets,
}) => {
  const isSheetConfigured = Boolean(settings.googleSheetWebhookUrl?.trim());

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand logo & School title */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-700 leading-none">
              {settings.schoolName}
            </span>
            <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              이동수업 QR 출석부
            </h1>
          </div>
        </div>

        {/* View Switcher Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            id="nav-student-view"
            type="button"
            onClick={() => onSelectView('student')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentView === 'student'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>학생용 출석</span>
          </button>

          <button
            id="nav-teacher-view"
            type="button"
            onClick={() => onSelectView('teacher')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              currentView === 'teacher'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>교사용 관리</span>
          </button>
        </div>

        {/* Right side status & help */}
        <div className="flex items-center gap-2">
          {/* Sheet status badge & direct setup button */}
          <button
            id="btn-nav-google-sheets"
            type="button"
            onClick={onOpenGoogleSheets}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isSheetConfigured
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-xs'
            }`}
            title="구글 스프레드시트 연동 설정 열기"
          >
            <FileSpreadsheet className={`w-4 h-4 ${isSheetConfigured ? 'text-emerald-600' : 'text-indigo-600'}`} />
            {isSheetConfigured ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">구글 시트</span> 연동중
              </span>
            ) : (
              <span className="flex items-center gap-1 font-black">
                <span>구글 시트 연동</span>
                <span className="hidden sm:inline text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">설정</span>
              </span>
            )}
          </button>

          <button
            id="btn-nav-help"
            type="button"
            onClick={onOpenHelp}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="도움말 보기"
          >
            <HelpCircle className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">도움말</span>
          </button>
        </div>
      </div>
    </header>
  );
};
