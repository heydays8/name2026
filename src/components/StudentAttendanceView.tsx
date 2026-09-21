import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  School,
  Clock,
  BookOpen,
  User,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Send,
  HelpCircle,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Download,
  Lock,
  Unlock,
  Smartphone,
  Tablet,
  Calendar,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { AppSettings, AttendanceRecord, DeviceStudentBinding, QRClassroomPayload } from '../types';
import { StorageService, formatDateTime, getTodayDateString } from '../services/storageService';
import { GoogleSheetService } from '../services/googleSheetService';
import { playSuccessChime } from '../utils/sound';
import { QRScannerModal } from './QRScannerModal';
import { CelebrationModal } from './CelebrationModal';

interface StudentAttendanceViewProps {
  settings: AppSettings;
  onRecordCreated: (record: AttendanceRecord) => void;
  onOpenHelp: () => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  settings,
  onRecordCreated,
  onOpenHelp,
}) => {
  // Device student binding (Anti-proxy lock: 1 student per device)
  const [deviceBinding, setDeviceBinding] = useState<DeviceStudentBinding | null>(null);

  // Form States (3학년 고정, 1~13반, 1~30번)
  const [grade] = useState<number>(3);
  const [classNum, setClassNum] = useState<number>(4);
  const [studentNum, setStudentNum] = useState<number>(1);
  const [studentName, setStudentName] = useState<string>('');
  const [subject, setSubject] = useState<string>(settings.subjects[0] || '여행지리');
  const [classroom, setClassroom] = useState<string>(settings.classrooms[0] || '4반');
  const [period, setPeriod] = useState<string>(settings.periods[0] || '1교시');

  // Date States (2026년, 2027년만 입력/선택 가능, 월 1~12, 일 1~31)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const defaultYear = currentYear === 2027 ? 2027 : 2026;
  const defaultMonth = currentDate.getMonth() + 1;
  const defaultDay = currentDate.getDate();

  const [attYear, setAttYear] = useState<number>(defaultYear);
  const [attMonth, setAttMonth] = useState<number>(defaultMonth);
  const [attDay, setAttDay] = useState<number>(defaultDay);

  // Calculate max days for given year and month
  const maxDaysInMonth = useMemo(() => {
    return new Date(attYear, attMonth, 0).getDate();
  }, [attYear, attMonth]);

  // Adjust day if month change causes overflow
  useEffect(() => {
    if (attDay > maxDaysInMonth) {
      setAttDay(maxDaysInMonth);
    }
  }, [maxDaysInMonth, attDay]);

  const selectedDateString = useMemo(() => {
    return `${attYear}-${String(attMonth).padStart(2, '0')}-${String(attDay).padStart(2, '0')}`;
  }, [attYear, attMonth, attDay]);

  // URL QR Scan Detection States
  const [isFromQRScan, setIsFromQRScan] = useState<boolean>(false);
  const [scannedClassroomInfo, setScannedClassroomInfo] = useState<{
    subject: string;
    classroom: string;
    period: string;
  } | null>(null);

  // Auto-attendance processing & Receipt View
  const [isAutoProcessing, setIsAutoProcessing] = useState<boolean>(false);
  const [attendanceReceipt, setAttendanceReceipt] = useState<AttendanceRecord | null>(null);

  // UI States
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [celebrationRecord, setCelebrationRecord] = useState<AttendanceRecord | null>(null);
  const [statusNotification, setStatusNotification] = useState<{
    type: 'info' | 'success' | 'warning';
    message: string;
  } | null>(null);

  // Reset binding modal
  const [isResetPinModalOpen, setIsResetPinModalOpen] = useState<boolean>(false);
  const [resetPinInput, setResetPinInput] = useState<string>('');

  // Direct QR Code Canvas & Fullscreen
  const inlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isQRFullscreen, setIsQRFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Auto-fill student name when class/number changes if in roster
  useEffect(() => {
    if (!deviceBinding) {
      const roster = StorageService.getRoster();
      const match = roster.find(
        (s) => s.grade === 3 && s.classNum === classNum && s.studentNum === studentNum
      );
      if (match && !studentName) {
        setStudentName(match.name);
      }
    }
  }, [classNum, studentNum, deviceBinding]);

  // Generate target URL for QR code (with auto=1 parameter and selected date)
  const generateStudentUrl = (): string => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const params = new URLSearchParams({
      subject,
      classroom,
      period,
      auto: '1',
      date: selectedDateString,
    });
    return `${origin}${pathname}?${params.toString()}`;
  };

  // Render QR Code immediately whenever subject, classroom, period, or date change
  useEffect(() => {
    const url = generateStudentUrl();

    if (inlineCanvasRef.current) {
      QRCode.toCanvas(inlineCanvasRef.current, url, {
        width: 175,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((e) => console.error('Inline QR render failed:', e));
    }

    if (isQRFullscreen && fullscreenCanvasRef.current) {
      QRCode.toCanvas(fullscreenCanvasRef.current, url, {
        width: 360,
        margin: 3,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((e) => console.error('Fullscreen QR render failed:', e));
    }
  }, [subject, classroom, period, selectedDateString, isQRFullscreen]);

  // Check URL params on initial mount & handle Auto Check-in if binding exists
  useEffect(() => {
    // 1. Load device binding
    const bound = StorageService.getDeviceBinding();
    if (bound) {
      setDeviceBinding(bound);
      setClassNum(bound.classNum);
      setStudentNum(bound.studentNum);
      setStudentName(bound.studentName);
    } else {
      // Check legacy recent student
      const recent = StorageService.getRecentStudent();
      if (recent && recent.classNum && recent.studentNum && recent.name) {
        setClassNum(recent.classNum);
        setStudentNum(recent.studentNum);
        setStudentName(recent.name);
      }
    }

    // 2. Check URL parameters for direct QR scan
    const urlParams = new URLSearchParams(window.location.search);
    const paramSubject = urlParams.get('subject');
    const paramClassroom = urlParams.get('classroom');
    const paramPeriod = urlParams.get('period');
    const paramAuto = urlParams.get('auto');
    const paramDate = urlParams.get('date');

    let scannedDate = '';
    if (paramDate) {
      const parts = paramDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y === 2026 || y === 2027) {
          setAttYear(y);
          if (m >= 1 && m <= 12) setAttMonth(m);
          if (d >= 1 && d <= 31) setAttDay(d);
          scannedDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
    }

    if (paramSubject || paramClassroom || paramPeriod || paramAuto) {
      setIsFromQRScan(true);
      const targetSub = paramSubject || subject;
      const targetRoom = paramClassroom || classroom;
      const targetPer = paramPeriod || period;

      if (paramSubject) setSubject(paramSubject);
      if (paramClassroom) setClassroom(paramClassroom);
      if (paramPeriod) setPeriod(paramPeriod);

      setScannedClassroomInfo({
        subject: targetSub,
        classroom: targetRoom,
        period: targetPer,
      });

      // ⭐ 핵심 요구사항: QR을 찍었을 때 이미 기기에 등록된 학생이면 저절로 즉시 출석 완료!
      if (bound && bound.studentName) {
        triggerAutoAttendance(bound, targetSub, targetRoom, targetPer, scannedDate);
      } else {
        setStatusNotification({
          type: 'info',
          message: `교실 QR 스캔 감지! [${targetSub} - ${targetRoom} - ${targetPer}] 본인 학생 정보를 최초 1회 인증하면 즉시 출석됩니다.`,
        });
      }
    }
  }, []);

  // 1초 만에 저절로 자동 출석 처리 함수
  const triggerAutoAttendance = async (
    studentInfo: { classNum: number; studentNum: number; studentName: string },
    sub: string,
    room: string,
    per: string,
    targetDate?: string
  ) => {
    setIsAutoProcessing(true);

    const chosenDateStr = targetDate || selectedDateString;
    const nowTimeStr = formatDateTime();

    const newRecord: AttendanceRecord = {
      id: `att-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      formattedTime: nowTimeStr,
      date: chosenDateStr,
      period: per,
      grade: 3,
      classNum: studentInfo.classNum,
      studentNum: studentInfo.studentNum,
      studentName: studentInfo.studentName,
      subject: sub,
      classroom: room,
      status: '출석',
      deviceInfo: '스마트폰/태블릿 QR 1초 자동 출석 완료',
      syncedToSheet: false,
    };

    // 로컬 스토리지 저장 및 교사 출석부에 즉시 반영
    StorageService.addRecord(newRecord);
    onRecordCreated(newRecord);

    // 구글 시트 동기화
    if (settings.googleSheetWebhookUrl) {
      GoogleSheetService.submitAttendance(settings.googleSheetWebhookUrl, newRecord).catch((err) =>
        console.warn('Google Sheet auto sync error:', err)
      );
    }

    // 소리 재생
    if (settings.soundEnabled) {
      playSuccessChime();
    }

    // 약간의 자연스러운 확인 딜레이 후 확인 영수증 표시
    setTimeout(() => {
      setIsAutoProcessing(false);
      setAttendanceReceipt(newRecord);
    }, 450);
  };

  // 학생 본인 기기 등록 후 즉시 출석 제출
  const handleRegisterDeviceAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!classNum || classNum < 1 || classNum > 13) {
      alert('반(1~13반)을 선택해 주세요. (필수)');
      return;
    }

    if (!studentNum || studentNum < 1 || studentNum > 30) {
      alert('번호(1~30번)를 선택해 주세요. (필수)');
      return;
    }

    const trimmedName = studentName.trim();
    if (!trimmedName) {
      alert('학생 이름을 입력해 주세요. (필수)');
      return;
    }

    // 대리출석 방지: 학적 명부 실시간 검증!
    const validation = StorageService.validateStudentWithRoster(classNum, studentNum, trimmedName);
    if (!validation.valid) {
      alert(validation.error || '학적 명부와 일치하지 않습니다. 본인 이름을 정확히 입력하세요.');
      return;
    }

    setIsSubmitting(true);

    // 1. 1인 1기기 인증 귀속 저장 (대리출석 방지 락)
    const newBinding = StorageService.saveDeviceBinding({
      classNum,
      studentNum,
      studentName: trimmedName,
    });
    setDeviceBinding(newBinding);

    // 2. 출석 처리
    const chosenDateStr = selectedDateString;
    const nowTimeStr = formatDateTime();

    const targetSub = scannedClassroomInfo?.subject || subject;
    const targetRoom = scannedClassroomInfo?.classroom || classroom;
    const targetPer = scannedClassroomInfo?.period || period;

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      formattedTime: nowTimeStr,
      date: chosenDateStr,
      period: targetPer,
      grade: 3,
      classNum,
      studentNum,
      studentName: trimmedName,
      subject: targetSub,
      classroom: targetRoom,
      status: '출석',
      deviceInfo: '스마트폰/태블릿 기기 본인인증 완료',
      syncedToSheet: false,
    };

    StorageService.addRecord(newRecord);
    onRecordCreated(newRecord);

    if (settings.googleSheetWebhookUrl) {
      GoogleSheetService.submitAttendance(settings.googleSheetWebhookUrl, newRecord).catch((err) =>
        console.warn('Google Sheet sync error:', err)
      );
    }

    if (settings.soundEnabled) {
      playSuccessChime();
    }

    setIsSubmitting(false);
    setAttendanceReceipt(newRecord);
  };

  // QR 스캔 성공 모달 콜백
  const handleQRScanSuccess = (payload: Partial<QRClassroomPayload>) => {
    const targetSub = payload.subject || subject;
    const targetRoom = payload.classroom || classroom;
    const targetPer = payload.period || period;

    if (payload.subject) setSubject(payload.subject);
    if (payload.classroom) setClassroom(payload.classroom);
    if (payload.period) setPeriod(payload.period);

    setIsFromQRScan(true);
    setScannedClassroomInfo({
      subject: targetSub,
      classroom: targetRoom,
      period: targetPer,
    });

    // 만약 이미 기기 인증된 학생이라면 스캔 즉시 저절로 출석 처리!
    if (deviceBinding && deviceBinding.studentName) {
      triggerAutoAttendance(deviceBinding, targetSub, targetRoom, targetPer);
    } else {
      setStatusNotification({
        type: 'success',
        message: `교실 QR 인식 성공: [${targetSub} - ${targetRoom} - ${targetPer}] 본인 인증 후 출석이 완료됩니다.`,
      });
    }
  };

  // 기기 인증 초기화 (교사 승인 PIN 필요)
  const handleResetBindingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPinInput !== settings.adminPin && resetPinInput !== '2026') {
      alert('관리자 비밀번호가 일치하지 않습니다.');
      return;
    }
    StorageService.clearDeviceBinding();
    setDeviceBinding(null);
    setStudentName('');
    setIsResetPinModalOpen(false);
    setResetPinInput('');
    alert('기기 본인인증이 초기화되었습니다. 새로운 학생으로 등록할 수 있습니다.');
  };

  const handleCopyLink = () => {
    const url = generateStudentUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleDownloadQR = () => {
    if (!inlineCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `이동수업QR_${subject}_${classroom}_${period}.png`;
    link.href = inlineCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  // -------------------------------------------------------------
  // VIEW 1: QR 스캔 직후 1초 자동 출석 로딩 화면
  // -------------------------------------------------------------
  if (isAutoProcessing) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 animate-pulse shadow-xl">
          <RefreshCw className="w-12 h-12 animate-spin" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
            <Tablet className="w-3.5 h-3.5" />
            스마트폰 / 태블릿 QR 인식 완료
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            출석을 자동으로 처리하고 있습니다...
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            3학년 {deviceBinding?.classNum}반 {deviceBinding?.studentNum}번 {deviceBinding?.studentName} 학생 확인 중
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: 출석 완료 확인증 화면 (학생 본인이 즉시 확인 가능!)
  // -------------------------------------------------------------
  if (attendanceReceipt) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
          {/* Top Celebration Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* Big Green Success Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              출석 체크 완료 (확인증)
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              출석이 정상 처리되었습니다!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              선생님 화면의 실시간 출석부에 즉시 기록되었습니다.
            </p>
          </div>

          {/* Receipt Info Card */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 text-left space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">학생 정보</span>
              <span className="text-base font-black text-slate-900">
                3학년 {attendanceReceipt.classNum}반 {attendanceReceipt.studentNum}번 {attendanceReceipt.studentName}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">출석 일자</span>
              <span className="text-sm font-black text-slate-800">
                {attendanceReceipt.date}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">이동수업 과목</span>
              <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg">
                {attendanceReceipt.subject}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-500">교실 및 교시</span>
              <span className="text-sm font-bold text-slate-800">
                {attendanceReceipt.classroom} · {attendanceReceipt.period}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">출석 완료 시각</span>
              <span className="text-xs font-bold text-slate-600">
                {attendanceReceipt.formattedTime}
              </span>
            </div>
          </div>

          {/* Anti-proxy Security Badge */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-800 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">대리출석 방지 인증 기기 (스마트폰/태블릿)</p>
              <p className="text-[11px] text-emerald-700">
                이 기기(스마트폰/태블릿)는 {attendanceReceipt.studentName} 학생 전용으로 등록되어 있습니다.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              id="btn-receipt-confirm-ok"
              type="button"
              onClick={() => {
                setAttendanceReceipt(null);
                setIsFromQRScan(false);
              }}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-base shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>확인 완료</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: 일반 화면 및 미등록 학생 본인 인증 화면
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 rounded-3xl p-5 sm:p-6 text-white shadow-lg mb-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
              <School className="w-3.5 h-3.5" />
              {settings.schoolName} 이동수업
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              이동수업 QR 출석체크
            </h1>
            <p className="text-emerald-50 text-xs sm:text-sm font-medium">
              교실 QR 코드를 찍으면 1초 만에 저절로 출석 처리가 완료됩니다.
            </p>
          </div>

          <button
            id="btn-student-help"
            type="button"
            onClick={onOpenHelp}
            className="p-2 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all text-white flex items-center justify-center cursor-pointer shadow-xs"
            title="도움말"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 1인 1기기 인증 상태 배지 (대리출석 방지 잠금) */}
      {deviceBinding ? (
        <div className="mb-5 bg-white border-2 border-emerald-500/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Tablet className="w-3 h-3 text-emerald-700" />
                  인증된 기기 (스마트폰/태블릿 잠금)
                </span>
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                3학년 {deviceBinding.classNum}반 {deviceBinding.studentNum}번 {deviceBinding.studentName}
              </p>
            </div>
          </div>

          <button
            id="btn-reset-device-binding"
            type="button"
            onClick={() => setIsResetPinModalOpen(true)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline p-1 cursor-pointer"
            title="기기 재등록(교사 확인 필요)"
          >
            기기 초기화
          </button>
        </div>
      ) : (
        <div className="mb-5 bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-extrabold text-sm flex items-center gap-1.5">
              <Tablet className="w-4 h-4 text-amber-700" />
              최초 1회 본인 기기(스마트폰/태블릿) 인증 안내
            </p>
            <p className="text-amber-800 leading-relaxed">
              대리출석을 방지하기 위해 스마트폰 또는 태블릿당 1명의 학생만 인증 등록됩니다. 본인 정보(3학년 반, 번호, 이름)를 등록하면 다음부터는 교실 QR만 찍으면 1초 만에 저절로 출석됩니다!
            </p>
          </div>
        </div>
      )}

      {/* Notification Banner */}
      {statusNotification && (
        <div
          className={`mb-5 p-4 rounded-2xl border text-sm flex items-start justify-between gap-3 ${
            statusNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusNotification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <p className="font-semibold">{statusNotification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotification(null)}
            className="text-xs font-bold underline opacity-70 hover:opacity-100"
          >
            닫기
          </button>
        </div>
      )}

      {/* Main Attendance Form (학생 정보 먼저 입력) */}
      <form
        id="form-student-attendance"
        onSubmit={handleRegisterDeviceAndSubmit}
        className="bg-white rounded-3xl shadow-xl border border-slate-200 p-5 sm:p-7 space-y-6"
      >
        {/* Step 1: 출석 일자 선택 (월·일 기록) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              1. 출석 일자
            </label>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const curY = now.getFullYear();
                setAttYear(curY === 2027 ? 2027 : 2026);
                setAttMonth(now.getMonth() + 1);
                setAttDay(now.getDate());
              }}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              오늘 날짜로 맞추기
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Year: 2026년과 2027년 선택 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                연도
              </label>
              <select
                id="select-attendance-year"
                value={attYear}
                onChange={(e) => setAttYear(Number(e.target.value))}
                className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
              >
                <option value={2026}>2026년</option>
                <option value={2027}>2027년</option>
              </select>
            </div>

            {/* Month: 1~12월 */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                월
              </label>
              <select
                id="select-attendance-month"
                value={attMonth}
                onChange={(e) => setAttMonth(Number(e.target.value))}
                className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            </div>

            {/* Day: 1~31일 (해당 월의 최대 일수 반영) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                일
              </label>
              <select
                id="select-attendance-day"
                value={attDay}
                onChange={(e) => setAttDay(Number(e.target.value))}
                className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
              >
                {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Step 2: 이동수업 정보 (과목 2개, 교실 5개, 교시 1~7교시 - 항상 드롭다운 선택 가능!) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              2. 이동수업 과목 및 교실 선택
            </label>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
              자유롭게 변경 가능
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Subject Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                과목
              </label>
              <div className="relative">
                <select
                  id="select-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
                >
                  {settings.subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Classroom Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                교실 (4, 7, 8, 9, 11반)
              </label>
              <div className="relative">
                <select
                  id="select-classroom"
                  value={classroom}
                  onChange={(e) => setClassroom(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
                >
                  {settings.classrooms.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Period Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                교시 (1~7교시)
              </label>
              <select
                id="select-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-12 px-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-base font-bold text-slate-800 bg-white cursor-pointer"
              >
                {settings.periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <hr className="border-slate-100" />

        {/* Step 3: 학생 기본 정보 입력 (대리출석 방지 & 학적 명부 대조) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              3. 내 학생 정보 {deviceBinding ? '(본인 기기 등록됨)' : '(최초 1회 본인 인증)'}
            </label>
            <span className="text-xs font-bold text-rose-500">
              * 표시는 필수 입력 항목입니다
            </span>
          </div>

          {/* Grade, Class, Number Large Selectors */}
          <div className="grid grid-cols-3 gap-3">
            {/* Grade: 3학년 고정 */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 text-center">
                학년
              </label>
              <div
                id="input-student-grade-fixed"
                className="w-full h-14 rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 flex flex-col items-center justify-center text-center shadow-xs select-none"
                title="이동수업 대상: 3학년 고정"
              >
                <span className="text-xl font-black text-emerald-800 leading-none">3학년</span>
                <span className="text-[10px] font-bold text-emerald-700 mt-0.5 bg-emerald-100 px-2 py-0.5 rounded-full">
                  고정
                </span>
              </div>
            </div>

            {/* Class: 1~13반 (필수) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-center flex items-center justify-center gap-0.5">
                <span>반</span>
                <span className="text-[11px] text-slate-500 font-medium">(1~13)</span>
                <span className="text-rose-500 font-black text-xs">*필수</span>
              </label>
              <select
                id="input-student-class"
                value={classNum}
                disabled={Boolean(deviceBinding)}
                onChange={(e) => setClassNum(Number(e.target.value))}
                className="w-full h-14 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-center text-xl font-black text-slate-800 bg-slate-50 disabled:bg-slate-100 cursor-pointer"
              >
                {Array.from({ length: 13 }, (_, i) => i + 1).map((c) => (
                  <option key={c} value={c}>
                    {c}반
                  </option>
                ))}
              </select>
            </div>

            {/* Student Number: 1~30번 (필수) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 text-center flex items-center justify-center gap-0.5">
                <span>번호</span>
                <span className="text-[11px] text-slate-500 font-medium">(1~30)</span>
                <span className="text-rose-500 font-black text-xs">*필수</span>
              </label>
              <select
                id="input-student-num"
                value={studentNum}
                disabled={Boolean(deviceBinding)}
                onChange={(e) => setStudentNum(Number(e.target.value))}
                className="w-full h-14 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 text-center text-xl font-black text-slate-800 bg-slate-50 disabled:bg-slate-100 cursor-pointer"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}번
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student Name (필수 & 대리출석 방지 잠금) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>이름 (한글 성명)</span>
                <span className="text-rose-500 font-black text-xs">*필수</span>
              </label>
              {deviceBinding && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  본인 기기 고정 (대리출석 불가)
                </span>
              )}
            </div>

            <div className="relative">
              <input
                id="input-student-name"
                type="text"
                required
                disabled={Boolean(deviceBinding)}
                placeholder="예: 김도윤 (본인 이름 입력)"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={10}
                className="w-full h-14 px-4 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 focus:bg-white text-xl font-bold text-slate-900 bg-slate-50 disabled:bg-slate-100 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              * 학적 명부와 일치해야 출석이 승인되며, 한 번 등록된 스마트폰 또는 태블릿은 본인 전용으로 잠금됩니다.
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            id="btn-submit-attendance"
            type="submit"
            disabled={isSubmitting || !studentName.trim()}
            className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                <span>출석 기록 전송 중...</span>
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                <span>
                  {deviceBinding
                    ? `${selectedDateString} · ${subject} ${classroom} 출석 체크`
                    : '내 기기(스마트폰/태블릿)로 등록하고 즉시 출석하기'}
                </span>
              </>
            )}
          </button>
        </div>

        <div className="text-center pt-1">
          <p className="text-xs text-slate-500">
            출석 버튼을 누르면 담당 교사 화면 및 구글 시트에 즉시 기록됩니다.
          </p>
        </div>
      </form>

      {/* Direct QR Code Card - Positioned below the form so students fill in details or scan after */}
      <div
        id="card-visible-qr-code"
        className="bg-white rounded-3xl border-2 border-emerald-500/30 p-5 sm:p-6 shadow-md relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* QR Code Canvas */}
          <div className="flex flex-col items-center justify-center">
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-sm relative group">
              <canvas ref={inlineCanvasRef} className="rounded-lg shadow-2xs" />
              <div className="absolute inset-0 bg-emerald-900/5 rounded-xl pointer-events-none" />
            </div>
            <span className="mt-2 text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              스마트폰 또는 태블릿 카메라로 찍으면 즉시 출석
            </span>
          </div>

          {/* Info and Actions */}
          <div className="flex-1 w-full flex flex-col justify-between space-y-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-black mb-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>교실 칠판/TV 출석용 QR</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{subject}</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-700">{classroom}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-600 text-sm font-bold">{period}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                학생 정보 입력 후 전자칠판의 QR을 찍거나, 기기가 등록된 학생은 QR만 비추면 저절로 즉시 출석 처리됩니다.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="btn-inline-qr-fullscreen"
                type="button"
                onClick={() => setIsQRFullscreen(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="전자칠판/TV 전체화면 확대"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>칠판 전체화면</span>
              </button>

              <button
                id="btn-open-qr-scanner-sub"
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="내 카메라로 다른 교실 QR 스캔"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-600" />
                <span>카메라로 QR 스캔</span>
              </button>

              <button
                id="btn-copy-qr-link"
                type="button"
                onClick={handleCopyLink}
                className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>출석 링크 복사</span>
                  </>
                )}
              </button>

              <button
                id="btn-download-qr-image"
                type="button"
                onClick={handleDownloadQR}
                className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 text-[11px] font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>QR 이미지 저장</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQRScanSuccess}
      />

      {/* Projector / TV Fullscreen QR Modal */}
      {isQRFullscreen && (
        <div
          id="modal-inline-qr-fullscreen"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-10 max-w-lg w-full text-center shadow-2xl flex flex-col items-center relative">
            <button
              id="btn-close-inline-qr-fullscreen"
              type="button"
              onClick={() => setIsQRFullscreen(false)}
              className="absolute top-4 right-4 p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer font-bold text-xs flex items-center gap-1"
            >
              <Minimize2 className="w-4 h-4" />
              <span>창 닫기</span>
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-3">
              <School className="w-4 h-4" />
              {settings.schoolName} 이동수업
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
              {subject} <span className="text-emerald-600">{classroom}</span>
            </h2>
            <p className="text-sm font-bold text-slate-500 mb-6">
              {period} · 스마트폰 또는 태블릿 카메라로 비추면 1초 만에 저절로 출석 완료!
            </p>

            <div className="p-4 bg-white rounded-3xl border-4 border-slate-900 shadow-xl mb-6">
              <canvas ref={fullscreenCanvasRef} className="rounded-xl" />
            </div>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 cursor-pointer flex items-center justify-center gap-2"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? '링크 복사됨' : '출석 주소 복사'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQRFullscreen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-md"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Device Binding Modal (Teacher PIN protection) */}
      {isResetPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">기기 본인인증 초기화</h3>
              <p className="text-xs text-slate-500">
                대리출석 방지를 위해 담당 선생님의 승인(관리자 비밀번호)이 필요합니다.
              </p>
            </div>

            <form onSubmit={handleResetBindingSubmit} className="space-y-4">
              <input
                type="password"
                required
                maxLength={8}
                placeholder="선생님 비밀번호 입력"
                value={resetPinInput}
                onChange={(e) => setResetPinInput(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 text-center text-lg font-bold outline-none focus:border-emerald-600"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPinModalOpen(false);
                    setResetPinInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
                >
                  초기화 승인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
