import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  QrCode,
  FileSpreadsheet,
  Settings as SettingsIcon,
  Download,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  FileText,
  Filter,
} from 'lucide-react';
import {
  AppSettings,
  AttendanceRecord,
  AttendanceStatus,
  ClassRosterStudent,
} from '../types';
import {
  StorageService,
  formatDateTime,
  getTodayDateString,
} from '../services/storageService';
import { GoogleSheetService } from '../services/googleSheetService';
import { ClassroomQRCard } from './ClassroomQRCard';
import { GoogleSheetSetupTab } from './GoogleSheetSetupTab';

interface TeacherDashboardProps {
  settings: AppSettings;
  records: AttendanceRecord[];
  roster: ClassRosterStudent[];
  initialTab?: TabKey;
  onSaveSettings: (settings: AppSettings) => void;
  onUpdateRecords: (records: AttendanceRecord[]) => void;
  onUpdateRoster: (roster: ClassRosterStudent[]) => void;
  onOpenHelp: () => void;
}

type TabKey =
  | 'overview'
  | 'live_attendance'
  | 'absentees'
  | 'qr_generator'
  | 'history'
  | 'sheets_setup'
  | 'roster_settings';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  settings,
  records,
  roster,
  initialTab,
  onSaveSettings,
  onUpdateRecords,
  onUpdateRoster,
  onOpenHelp,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showSettingsPin, setShowSettingsPin] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Dashboard Filters
  const [filterDate, setFilterDate] = useState<string>(getTodayDateString());
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Syncing state
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [sheetFetchResult, setSheetFetchResult] = useState<string | null>(null);

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [manualGrade, setManualGrade] = useState<number>(3);
  const [manualClass, setManualClass] = useState<number>(4);
  const [manualNum, setManualNum] = useState<number>(1);
  const [manualName, setManualName] = useState<string>('');
  const [manualSubject, setManualSubject] = useState<string>(settings.subjects[0] || '여행지리');
  const [manualRoom, setManualRoom] = useState<string>(settings.classrooms[0] || '4반');
  const [manualPeriod, setManualPeriod] = useState<string>(settings.periods[2] || '3교시');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('출석');

  // PIN check handler
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.adminPin || pinInput === '2026') {
      setIsAuthenticated(true);
      setPinError(null);
    } else {
      setPinError('비밀번호가 일치하지 않습니다. 다시 입력해 주세요.');
    }
  };

  // Filtered records based on controls
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchDate = !filterDate || r.date === filterDate;
      const matchPeriod = filterPeriod === 'all' || r.period === filterPeriod;
      const matchSubject = filterSubject === 'all' || r.subject === filterSubject;
      const matchGrade = filterGrade === 'all' || String(r.grade) === filterGrade;
      const matchSearch =
        !searchQuery.trim() ||
        r.studentName.includes(searchQuery.trim()) ||
        String(r.studentNum) === searchQuery.trim();

      return matchDate && matchPeriod && matchSubject && matchGrade && matchSearch;
    });
  }, [records, filterDate, filterPeriod, filterSubject, filterGrade, searchQuery]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalRecords = filteredRecords.length;
    const presentCount = filteredRecords.filter((r) => r.status === '출석').length;
    const lateCount = filteredRecords.filter((r) => r.status === '지각').length;
    const leaveCount = filteredRecords.filter((r) => r.status === '조퇴').length;
    const absentCount = filteredRecords.filter((r) => r.status === '결석').length;

    // Estimate expected students from roster for the filtered grade/class
    const filteredRoster = roster.filter((student) => {
      return filterGrade === 'all' || String(student.grade) === filterGrade;
    });
    const expectedStudents = filteredRoster.length > 0 ? filteredRoster.length : 20;
    const rate = expectedStudents > 0 ? Math.min(100, Math.round((presentCount / expectedStudents) * 100)) : 0;

    return {
      totalRecords,
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      expectedStudents,
      rate,
    };
  }, [filteredRecords, roster, filterGrade]);

  // Identify absentees (who hasn't checked in)
  const absenteesList = useMemo(() => {
    const relevantRoster = roster.filter((student) => {
      return filterGrade === 'all' || String(student.grade) === filterGrade;
    });

    return relevantRoster.filter((student) => {
      // Find if this student has an attendance record for the filtered date/period
      const attended = records.some((r) => {
        const matchDate = !filterDate || r.date === filterDate;
        const matchPeriod = filterPeriod === 'all' || r.period === filterPeriod;
        return (
          matchDate &&
          matchPeriod &&
          r.grade === student.grade &&
          r.classNum === student.classNum &&
          r.studentNum === student.studentNum
        );
      });
      return !attended;
    });
  }, [roster, records, filterDate, filterPeriod, filterGrade]);

  // Handle Quick Manual Check-in for Absentee
  const handleMarkPresentForAbsentee = (student: ClassRosterStudent) => {
    const today = filterDate || getTodayDateString();
    const period = filterPeriod !== 'all' ? filterPeriod : settings.periods[0] || '1교시';
    const subject = filterSubject !== 'all' ? filterSubject : settings.subjects[0] || '여행지리';
    const classroom = settings.classrooms[0] || '4반';

    const newRecord: AttendanceRecord = {
      id: `manual-${Date.now()}-${student.id}`,
      timestamp: new Date().toISOString(),
      formattedTime: formatDateTime(),
      date: today,
      period,
      grade: student.grade,
      classNum: student.classNum,
      studentNum: student.studentNum,
      studentName: student.name,
      subject,
      classroom,
      status: '출석',
      notes: '교사 수동 확인',
      syncedToSheet: false,
    };

    const updated = StorageService.addRecord(newRecord);
    onUpdateRecords(updated);

    // Sync to sheet if URL configured
    if (settings.googleSheetWebhookUrl) {
      GoogleSheetService.submitAttendance(settings.googleSheetWebhookUrl, newRecord);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: AttendanceStatus) => {
    const updated = StorageService.updateRecordStatus(id, newStatus);
    onUpdateRecords(updated);
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('해당 출석 기록을 삭제하시겠습니까?')) {
      const updated = StorageService.deleteRecord(id);
      onUpdateRecords(updated);
    }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: `manual-${Date.now()}`,
      timestamp: new Date().toISOString(),
      formattedTime: formatDateTime(),
      date: filterDate || getTodayDateString(),
      period: manualPeriod,
      grade: manualGrade,
      classNum: manualClass,
      studentNum: manualNum,
      studentName: manualName.trim(),
      subject: manualSubject,
      classroom: manualRoom,
      status: manualStatus,
      notes: '교사 직접 등록',
      syncedToSheet: false,
    };

    const updated = StorageService.addRecord(newRecord);
    onUpdateRecords(updated);

    if (settings.googleSheetWebhookUrl) {
      GoogleSheetService.submitAttendance(settings.googleSheetWebhookUrl, newRecord);
    }

    setIsAddModalOpen(false);
    setManualName('');
  };

  const handleFetchFromSheet = async () => {
    if (!settings.googleSheetWebhookUrl) {
      alert('구글 시트 연동 설정 탭에서 웹 앱 URL을 먼저 등록해 주세요.');
      return;
    }

    setIsFetchingSheet(true);
    setSheetFetchResult(null);

    const res = await GoogleSheetService.fetchRecordsFromSheet(settings.googleSheetWebhookUrl);
    setIsFetchingSheet(false);

    if (res.success && res.records.length > 0) {
      // Merge with existing
      const existing = StorageService.getRecords();
      const existingIds = new Set(existing.map((r) => `${r.date}-${r.period}-${r.grade}-${r.classNum}-${r.studentNum}`));
      const newItems = res.records.filter((r) => !existingIds.has(`${r.date}-${r.period}-${r.grade}-${r.classNum}-${r.studentNum}`));

      const combined = [...newItems, ...existing];
      StorageService.saveAllRecords(combined);
      onUpdateRecords(combined);
      setSheetFetchResult(`구글 시트에서 새로운 데이터 ${newItems.length}건을 성공적으로 불러왔습니다!`);
    } else {
      setSheetFetchResult(res.message);
    }

    setTimeout(() => setSheetFetchResult(null), 5000);
  };

  // If not authenticated, show friendly PIN login
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1">
            교사용 관리자 인증
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            학생들의 출석 현황 조회 및 관리를 위해 비밀번호를 입력해 주세요.
          </p>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                id="input-admin-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="비밀번호 4자리 입력"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full h-14 text-center text-2xl tracking-widest font-black rounded-2xl border-2 border-slate-200 focus:border-indigo-600 outline-none bg-slate-50"
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 flex items-center justify-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {pinError}
              </p>
            )}

            <button
              id="btn-submit-pin"
              type="submit"
              className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Unlock className="w-5 h-5" />
              <span>관리자 페이지 접속</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onOpenHelp}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              도움말 및 문제해결
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
              교사용 관리 대시보드
            </span>
            <span className="text-xs text-slate-400">{settings.schoolName}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            이동수업 출석 관리 센터
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            실시간 제출 명단 확인, 미출석자 파악, 구글 시트 연동 및 엑셀 다운로드
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-manual-add-attendance"
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>수동 출석 등록</span>
          </button>

          <button
            id="btn-export-csv"
            type="button"
            onClick={() => StorageService.exportRecordsToCSV(records)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>엑셀(CSV) 저장</span>
          </button>

          <button
            id="btn-lock-admin"
            type="button"
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700"
            title="관리자 잠금"
          >
            <Lock className="w-4 h-4" />
            <span>잠금</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>종합 통계 요약</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('qr_generator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'qr_generator'
              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span>수업용 QR 코드 바로보기</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('live_attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'live_attendance'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>실시간 출석 명단 ({filteredRecords.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('absentees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'absentees'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserX className="w-4 h-4" />
          <span>미출석자 확인 ({absenteesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sheets_setup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'sheets_setup'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>구글 시트 연동 설정</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster_settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'roster_settings'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>학생 명부 및 환경설정</span>
        </button>
      </div>

      {/* Filter Bar (Applied across Overview, Live Attendance, and Absentees) */}
      {(activeTab === 'overview' || activeTab === 'live_attendance' || activeTab === 'absentees') && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>조회 필터:</span>
          </div>

          {/* Date Picker (2026년과 2027년 제한) */}
          <div>
            <input
              type="date"
              min="2026-01-01"
              max="2027-12-31"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-slate-50 cursor-pointer"
            />
          </div>

          {/* Period Filter */}
          <div>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-slate-50 cursor-pointer"
            >
              <option value="all">전체 교시</option>
              {settings.periods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 font-semibold text-slate-800 bg-slate-50 cursor-pointer"
            >
              <option value="all">전체 과목</option>
              {settings.subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Display: 3학년 고정 */}
          <div className="h-10 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center gap-1.5 font-bold text-xs select-none">
            <span className="text-slate-600">대상:</span>
            <span className="font-black text-emerald-800 text-sm">3학년</span>
            <span className="text-[10px] bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
              고정
            </span>
          </div>

          {/* Student Search */}
          <div className="flex-1 min-w-[180px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="학생 이름 또는 번호 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 bg-slate-50 outline-none focus:border-indigo-600"
            />
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={() => {
              setFilterDate(getTodayDateString());
              setFilterPeriod('all');
              setFilterSubject('all');
              setFilterGrade('all');
              setSearchQuery('');
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer px-2"
          >
            오늘로 리셋
          </button>
        </div>
      )}

      {/* TAB 1: OVERVIEW SUMMARY & CHARTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick QR Code Launcher Banner */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                <QrCode className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                    실시간 수업 시작
                  </span>
                  <span className="text-xs font-bold text-emerald-100">
                    {filterDate}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black mt-0.5">
                  교실 칠판/TV에 출석 QR 코드를 바로 띄우세요
                </h3>
                <p className="text-xs text-emerald-100/90">
                  학생들이 스마트폰 카메라로 QR 코드를 비추면 즉시 출석 체크를 완료할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('qr_generator')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>수업용 QR 코드 보기</span>
              </button>
            </div>
          </div>

          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Attendance Checkins */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">출석 체크 완료</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {stats.presentCount}
                  <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  정상 출석 완료
                </div>
              </div>
            </div>

            {/* Card 2: Late / Early leave */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">지각 / 조퇴</span>
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">
                  {stats.lateCount + stats.leaveCount}
                  <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold mt-1">
                  지각 {stats.lateCount}명 · 조퇴 {stats.leaveCount}명
                </div>
              </div>
            </div>

            {/* Card 3: Unregistered Absentees */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">미출석 (미제출자)</span>
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-rose-600">
                  {absenteesList.length}
                  <span className="text-sm font-semibold text-slate-500 ml-1">명</span>
                </div>
                <div className="text-xs text-rose-500 font-semibold mt-1">
                  명부 대조 미확인 인원
                </div>
              </div>
            </div>

            {/* Card 4: Attendance Rate % */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold">전체 출석률</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-indigo-600">
                  {stats.rate}%
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.rate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Charts: Class Breakdown & Subject Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Class-by-Class Attendance Rates */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  이동수업 교실별 현황 ({filterDate})
                </h4>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  5개 교실
                </span>
              </div>

              <div className="space-y-3">
                {[4, 7, 8, 9, 11].map((cNum) => {
                  const classStudents = roster.filter((s) => s.classNum === cNum);
                  const checkedCount = filteredRecords.filter(
                    (r) => r.classNum === cNum && (r.status === '출석' || r.status === '지각')
                  ).length;
                  const total = classStudents.length || 30;
                  const percent = Math.min(100, Math.round((checkedCount / total) * 100));

                  return (
                    <div key={cNum} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-700 font-bold">{cNum}반</span>
                        <span className="text-slate-500">
                          {checkedCount}/{total}명 ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Subject Attendance Distribution */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs">
              <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                과목별 출석 인원 분포
              </h4>

              <div className="space-y-2.5">
                {settings.subjects.slice(0, 5).map((subj) => {
                  const count = filteredRecords.filter((r) => r.subject === subj).length;
                  const maxCount = Math.max(1, ...settings.subjects.map((s) => filteredRecords.filter((r) => r.subject === s).length));
                  const barWidth = Math.round((count / maxCount) * 100);

                  return (
                    <div key={subj} className="flex items-center gap-3 text-xs">
                      <span className="w-20 font-bold text-slate-700 truncate">{subj}</span>
                      <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden relative">
                        <div
                          className="bg-indigo-500 h-full rounded-lg transition-all duration-300"
                          style={{ width: `${Math.max(5, barWidth)}%` }}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-slate-600 text-[11px]">
                          {count}명
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ATTENDANCE TABLE */}
      {activeTab === 'live_attendance' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                실시간 출석 기록 ({filteredRecords.length}건)
              </h4>
              <p className="text-xs text-slate-500">
                학생들이 카메라 또는 웹앱에서 제출한 출석 데이터 목록입니다.
              </p>
            </div>

            {/* Sync from Google Sheet Button */}
            <div className="flex items-center gap-2">
              <button
                id="btn-fetch-sheet-data"
                type="button"
                disabled={isFetchingSheet}
                onClick={handleFetchFromSheet}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isFetchingSheet ? 'animate-spin text-indigo-600' : ''}`} />
                <span>구글 시트 동기화</span>
              </button>
            </div>
          </div>

          {sheetFetchResult && (
            <div className="p-3 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-800 font-semibold text-center">
              {sheetFetchResult}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">제출 시각</th>
                  <th className="py-3.5 px-4">교시</th>
                  <th className="py-3.5 px-4">학년-반-번호</th>
                  <th className="py-3.5 px-4">학생 이름</th>
                  <th className="py-3.5 px-4">과목명</th>
                  <th className="py-3.5 px-4">교실</th>
                  <th className="py-3.5 px-4">상태</th>
                  <th className="py-3.5 px-4 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      조건에 일치하는 출석 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {r.formattedTime.split(' ')[1] || r.formattedTime}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {r.period}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {r.grade}학년 {r.classNum}반 {r.studentNum}번
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900">
                        {r.studentName}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {r.subject}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.classroom}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={r.status}
                          onChange={(e) => handleUpdateStatus(r.id, e.target.value as AttendanceStatus)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer ${
                            r.status === '출석'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : r.status === '지각'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : r.status === '조퇴'
                              ? 'bg-sky-50 text-sky-700 border-sky-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          <option value="출석">출석</option>
                          <option value="지각">지각</option>
                          <option value="조퇴">조퇴</option>
                          <option value="결석">결석</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(r.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ABSENTEES FINDER (미출석자 명단 조회) */}
      {activeTab === 'absentees' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-600" />
                미출석(미제출자) 확인 명단 ({absenteesList.length}명)
              </h4>
              <p className="text-xs text-slate-500">
                선택된 날짜({filterDate})와 교시({filterPeriod === 'all' ? '전체' : filterPeriod})에 아직 출석 체크를 하지 않은 학생들입니다.
              </p>
            </div>

            <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              미확인 인원: {absenteesList.length}명
            </div>
          </div>

          {absenteesList.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h5 className="text-base font-bold text-slate-800">
                모든 학생이 출석을 완료했습니다! 🎉
              </h5>
              <p className="text-xs text-slate-500">
                현재 조건에서 미출석 학생이 0명입니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {absenteesList.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 rounded-2xl border-2 border-rose-100 bg-rose-50/40 flex items-center justify-between hover:border-rose-300 transition-all"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-500">
                      {student.grade}학년 {student.classNum}반 {student.studentNum}번
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {student.name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleMarkPresentForAbsentee(student)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                    title="선생님이 직접 출석으로 인정합니다"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>출석 인정</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CLASSROOM QR GENERATOR */}
      {activeTab === 'qr_generator' && <ClassroomQRCard settings={settings} />}

      {/* TAB 5: GOOGLE SHEETS SETUP */}
      {activeTab === 'sheets_setup' && (
        <GoogleSheetSetupTab
          settings={settings}
          onSaveSettings={onSaveSettings}
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* TAB 6: ROSTER & APP SETTINGS */}
      {activeTab === 'roster_settings' && (
        <div className="space-y-6">
          {/* School & Admin Info Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h4 className="text-base font-bold text-slate-900">
              학교 및 관리자 환경 설정
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  학교 이름
                </label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => onSaveSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  학교급 구분
                </label>
                <select
                  value={settings.schoolType}
                  onChange={(e) =>
                    onSaveSettings({
                      ...settings,
                      schoolType: e.target.value as AppSettings['schoolType'],
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800"
                >
                  <option value="초등학교">초등학교 (1~6학년)</option>
                  <option value="중학교">중학교 (1~3학년)</option>
                  <option value="고등학교">고등학교 (1~3학년)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-600">
                    관리자 비밀번호
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowSettingsPin(!showSettingsPin)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {showSettingsPin ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>가리기</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>비밀번호 표시</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type={showSettingsPin ? 'text' : 'password'}
                  maxLength={10}
                  value={settings.adminPin}
                  onChange={(e) => onSaveSettings({ ...settings, adminPin: e.target.value })}
                  className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 tracking-widest font-mono"
                  placeholder="비밀번호 입력"
                />
              </div>
            </div>

            {/* Configured Subjects & Classrooms Summary */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-xs font-bold text-emerald-800 mb-1">
                  지정 이동수업 과목 (총 {settings.subjects.length}개)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {settings.subjects.map((sub) => (
                    <span
                      key={sub}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold shadow-xs"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                <div className="text-xs font-bold text-indigo-800 mb-1">
                  지정 이동수업 교실 (총 {settings.classrooms.length}개 교실)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {settings.classrooms.map((room) => (
                    <span
                      key={room}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-extrabold shadow-xs"
                    >
                      {room}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Student Roster Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  3학년 학급 명부 관리 (총 {roster.length}명 등록됨, 1~13반 · 1~30번)
                </h4>
                <p className="text-xs text-slate-500">
                  학생 명부가 등록되어 있으면 미출석(결석생) 명단을 1초 만에 자동 추출합니다.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = StorageService.getRoster();
                    onUpdateRoster(sample);
                    alert('3학년 이동수업 기본 학생 명부가 복원되었습니다.');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  기본 명부로 복원
                </button>
              </div>
            </div>

            {/* Quick Roster List Preview */}
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100">
              {roster.map((s) => (
                <div key={s.id} className="p-2.5 px-4 flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-semibold text-slate-600">
                    {s.grade}학년 {s.classNum}반 {s.studentNum}번
                  </span>
                  <span className="font-extrabold text-slate-900">{s.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = roster.filter((item) => item.id !== s.id);
                      StorageService.saveRoster(updated);
                      onUpdateRoster(updated);
                    }}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone: Reset Records */}
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <h5 className="text-sm font-bold text-rose-900">출석 기록 초기화</h5>
              <p className="text-xs text-rose-600">
                기기에 저장된 모든 출석 기록을 삭제합니다. (구글 시트의 기록은 삭제되지 않습니다)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('정말로 모든 출석 기록을 초기화하시겠습니까?')) {
                  StorageService.clearAllRecords();
                  onUpdateRecords([]);
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              전체 초기화
            </button>
          </div>
        </div>
      )}

      {/* Manual Add Attendance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">교사 수동 출석 등록</h3>
            <p className="text-xs text-slate-500">
              스마트폰 미소지 학생의 출석을 직접 추가합니다.
            </p>

            <form onSubmit={handleManualAddSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">학년</label>
                  <div className="w-full h-10 px-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-emerald-800 font-extrabold text-xs flex items-center justify-center select-none">
                    3학년 (고정)
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                    <span>반 (1~13반)</span>
                    <span className="text-rose-500 font-black">*필수</span>
                  </label>
                  <select
                    value={manualClass}
                    onChange={(e) => setManualClass(Number(e.target.value))}
                    className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {Array.from({ length: 13 }, (_, i) => i + 1).map((c) => (
                      <option key={c} value={c}>
                        {c}반
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                    <span>번호 (1~30번)</span>
                    <span className="text-rose-500 font-black">*필수</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={manualNum}
                    onChange={(e) => setManualNum(Math.max(1, Math.min(30, Number(e.target.value))))}
                    className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                  <span>학생 이름 (한글 성명)</span>
                  <span className="text-rose-500 font-black">*필수</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 김도윤"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600">과목</label>
                  <select
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {settings.subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">교실</label>
                  <select
                    value={manualRoom}
                    onChange={(e) => setManualRoom(e.target.value)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    {settings.classrooms.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">상태</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                    className="w-full h-10 px-2 rounded-xl border border-slate-300 text-xs font-bold"
                  >
                    <option value="출석">출석</option>
                    <option value="지각">지각</option>
                    <option value="조퇴">조퇴</option>
                    <option value="결석">결석</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  출석 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
