import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Share2,
  Check,
  School,
  Calendar,
  Clock,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { AppSettings, QRClassroomPayload } from '../types';
import { getTodayDateString } from '../services/storageService';

interface ClassroomQRCardProps {
  settings: AppSettings;
}

export const ClassroomQRCard: React.FC<ClassroomQRCardProps> = ({ settings }) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(settings.subjects[0] || '여행지리');
  const [selectedClassroom, setSelectedClassroom] = useState<string>(settings.classrooms[0] || '4반');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(settings.periods[2] || '3교시');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate target URL for student scanner
  const generateStudentUrl = (): string => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const params = new URLSearchParams({
      subject: selectedSubject,
      classroom: selectedClassroom,
      period: selectedPeriod,
      date: getTodayDateString(),
    });
    return `${origin}${pathname}?${params.toString()}`;
  };

  useEffect(() => {
    const url = generateStudentUrl();

    // Render main canvas
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((e) => console.error('QR code generation failed:', e));
    }

    // Render fullscreen canvas if open
    if (isFullscreen && fullscreenCanvasRef.current) {
      QRCode.toCanvas(fullscreenCanvasRef.current, url, {
        width: 380,
        margin: 3,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((e) => console.error('Fullscreen QR generation failed:', e));
    }
  }, [selectedSubject, selectedClassroom, selectedPeriod, isFullscreen]);

  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `이동수업QR_${selectedSubject}_${selectedClassroom}_${selectedPeriod}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = generateStudentUrl();
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-emerald-600" />
            수업용 QR 코드 생성 및 스마트보드 투사
          </h3>
          <p className="text-sm text-slate-500">
            교실 칠판, 전자칠판(TV)에 띄우거나 출력하여 교실 문 앞에 부착하세요.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-projector-fullscreen"
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
            칠판/TV 전체화면 띄우기
          </button>

          <button
            id="btn-print-qr"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4" />
            인쇄하기
          </button>

          <button
            id="btn-download-qr"
            type="button"
            onClick={handleDownloadQR}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4" />
            PNG 저장
          </button>

          <button
            id="btn-copy-attendance-url"
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700">복사됨!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                링크 복사
              </>
            )}
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            수업 과목
          </label>
          <select
            id="qr-select-subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
          >
            {settings.subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            수업 교실/특별실
          </label>
          <select
            id="qr-select-classroom"
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
          >
            {settings.classrooms.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            수업 교시
          </label>
          <select
            id="qr-select-period"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 bg-white"
          >
            {settings.periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable / Display Card Container */}
      <div
        id="printable-qr-container"
        className="flex flex-col md:flex-row items-center justify-center gap-8 p-6 rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/40"
      >
        {/* The QR Canvas Box */}
        <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200 flex flex-col items-center">
          <canvas ref={canvasRef} className="rounded-lg" />
          <span className="text-[11px] font-bold text-slate-400 mt-2">
            휴대폰 / 태블릿 카메라로 스캔
          </span>
        </div>

        {/* Informative side panel */}
        <div className="space-y-4 max-w-sm text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              {settings.schoolName}
            </div>
            <h4 className="text-2xl font-black text-slate-900">
              {selectedSubject} 이동수업
            </h4>
            <p className="text-lg font-bold text-emerald-700">
              {selectedClassroom} · {selectedPeriod}
            </p>
          </div>

          <div className="text-xs text-slate-600 space-y-1 bg-white/80 p-3.5 rounded-xl border border-emerald-100">
            <p className="font-bold text-slate-800">💡 학생 안내 요령:</p>
            <p>1. 스마트폰/태블릿 기본 카메라 앱을 켜세요.</p>
            <p>2. 화면의 QR 코드를 비추고 열리는 창을 터치하세요.</p>
            <p>3. 본인 학년/반/번호/이름 확인 후 [출석 완료]를 누르면 끝!</p>
          </div>
        </div>
      </div>

      {/* Fullscreen TV / Beam Projector Mode */}
      {isFullscreen && (
        <div
          id="projector-fullscreen-overlay"
          className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-200"
        >
          <button
            id="btn-exit-fullscreen"
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold backdrop-blur-md cursor-pointer transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
            전체화면 종료 (ESC)
          </button>

          <div className="text-center space-y-3 mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-base font-bold">
              <School className="w-5 h-5" />
              {settings.schoolName} 이동수업 출석
            </div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
              {selectedSubject} 이동수업 출석 체크
            </h1>
            <p className="text-xl sm:text-2xl font-semibold text-emerald-400">
              교실: {selectedClassroom} ｜ 교시: {selectedPeriod}
            </p>
          </div>

          {/* Large Screen QR Box */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border-4 border-emerald-400 flex flex-col items-center">
            <canvas ref={fullscreenCanvasRef} className="rounded-xl" />
            <p className="text-slate-800 text-lg font-extrabold mt-4">
              카메라로 QR 코드를 비춰주세요
            </p>
          </div>

          <div className="mt-6 text-center text-slate-400 text-sm sm:text-base font-medium">
            스캔이 어려운 학생은 교사에게 직접 구두로 출석을 확인해 주세요.
          </div>
        </div>
      )}
    </div>
  );
};
