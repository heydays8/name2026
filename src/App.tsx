/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppSettings, AttendanceRecord, ClassRosterStudent } from './types';
import { StorageService } from './services/storageService';
import { Navbar } from './components/Navbar';
import { StudentAttendanceView } from './components/StudentAttendanceView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { HelpGuideModal } from './components/HelpGuideModal';

export default function App() {
  const [currentView, setCurrentView] = useState<'student' | 'teacher'>('student');
  const [teacherTab, setTeacherTab] = useState<'overview' | 'live_attendance' | 'absentees' | 'qr_generator' | 'history' | 'sheets_setup' | 'roster_settings'>('overview');
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [records, setRecords] = useState<AttendanceRecord[]>(() => StorageService.getRecords());
  const [roster, setRoster] = useState<ClassRosterStudent[]>(() => StorageService.getRoster());
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Check URL parameters for explicit view routing
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'teacher' || params.get('admin') === 'true') {
      setCurrentView('teacher');
      if (params.get('tab') === 'sheets') {
        setTeacherTab('sheets_setup');
      }
    }
  }, []);

  const handleOpenGoogleSheets = () => {
    setCurrentView('teacher');
    setTeacherTab('sheets_setup');
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleRecordCreated = (newRecord: AttendanceRecord) => {
    // Reload records from storage to maintain sync
    const updated = StorageService.getRecords();
    setRecords(updated);
  };

  const handleUpdateRecords = (updated: AttendanceRecord[]) => {
    setRecords(updated);
  };

  const handleUpdateRoster = (updated: ClassRosterStudent[]) => {
    setRoster(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        settings={settings}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenGoogleSheets={handleOpenGoogleSheets}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentView === 'student' ? (
          <StudentAttendanceView
            settings={settings}
            onRecordCreated={handleRecordCreated}
            onOpenHelp={() => setIsHelpModalOpen(true)}
          />
        ) : (
          <TeacherDashboard
            settings={settings}
            records={records}
            roster={roster}
            initialTab={teacherTab}
            onSaveSettings={handleSaveSettings}
            onUpdateRecords={handleUpdateRecords}
            onUpdateRoster={handleUpdateRoster}
            onOpenHelp={() => setIsHelpModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {settings.schoolName} 이동수업 스마트 QR 출석부
          </span>
          <span className="text-slate-400">
            구글 시트 연동 · 오프라인 로컬 저장 지원 · Netlify & GitHub Pages 호환
          </span>
        </div>
      </footer>

      {/* Teacher & Student Help Modal */}
      <HelpGuideModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
}
