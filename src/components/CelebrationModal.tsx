import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, School, Clock, BookOpen, ArrowRight } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface CelebrationModalProps {
  record: AttendanceRecord | null;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ record, onClose }) => {
  useEffect(() => {
    if (!record) return;

    // Trigger joyful confetti blast
    const count = 200;
    const defaults = {
      origin: { y: 0.65 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#10B981', '#6366F1', '#F59E0B'],
    });
    fire(0.2, {
      spread: 60,
      colors: ['#3B82F6', '#EC4899', '#10B981'],
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, [record]);

  if (!record) return null;

  return (
    <div
      id="celebration-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="celebration-modal-card"
        className="bg-white rounded-3xl shadow-2xl border-4 border-emerald-400 max-w-lg w-full p-6 sm:p-8 text-center relative overflow-hidden transform transition-all"
      >
        {/* Top Decorative Banner */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100 rounded-full blur-xl pointer-events-none opacity-60" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-100 rounded-full blur-xl pointer-events-none opacity-60" />

        {/* Animated Big Icon */}
        <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-5 shadow-inner animate-bounce">
          <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20" strokeWidth={2.5} />
        </div>

        {/* Large Prominent Celebration Banner Text */}
        <div className="space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            출석 체크 완료!
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
            <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy decoration-2">
              {record.studentName}
            </span>{' '}
            학생,
            <br />
            출석이 정상 완료되었습니다!
          </h2>
          <p className="text-slate-600 text-base sm:text-lg">
            선생님 출석부에 안전하게 기록되었습니다. 자리에 착석해 주세요.
          </p>
        </div>

        {/* Attendance Summary Ticket Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left mb-6 space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">출석 확인증</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {record.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">학생 정보</div>
                <div className="font-bold text-slate-800">
                  {record.grade}학년 {record.classNum}반 {record.studentNum}번
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">과목 / 교실</div>
                <div className="font-bold text-slate-800">
                  {record.subject} ({record.classroom})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-slate-500">교시 / 시각</div>
                <div className="font-bold text-slate-800">
                  {record.period} · {record.formattedTime.split(' ')[1] || ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                ✓
              </div>
              <div>
                <div className="text-xs text-slate-500">구글 시트 연동</div>
                <div className="font-semibold text-emerald-600 text-xs">
                  {record.syncedToSheet ? '실시간 동기화됨' : '로컬 보관 완료'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Large Touch Button */}
        <button
          id="btn-celebration-close"
          type="button"
          onClick={onClose}
          className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-lg font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>확인 완료 (다음 학생 출석하기)</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
