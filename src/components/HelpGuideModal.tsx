import React from 'react';
import {
  X,
  HelpCircle,
  Lightbulb,
  FileSpreadsheet,
  Camera,
  WifiOff,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="help-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold">선생님을 위한 쉬운 해결 가이드</h3>
              <p className="text-xs text-slate-400">교실 현장에서 생기는 문제, "이렇게 하면 돼요!"</p>
            </div>
          </div>
          <button
            id="btn-close-help-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-700">
          {/* Card 1: Google Sheet Troubleshooting */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>1. 구글 시트로 출석이 안 넘어갈 때</span>
            </div>
            <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 pl-6 list-disc">
              <li>
                <b>배포 권한 확인:</b> 구글 앱 스크립트 배포 시 [액세스 권한이 있는 사용자]가 <b>'모든 사용자 (Anyone)'</b>로 설정되어 있는지 확인해 주세요. ('나만'으로 되어 있으면 학생 폰에서 기록되지 않습니다)
              </li>
              <li>
                <b>URL 확인:</b> 복사한 웹앱 URL 끝부분이 반드시 <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">/exec</code>로 끝나는지 확인하세요.
              </li>
              <li>
                <b>데이터 안심 보관:</b> 구글 시트가 미연동되더라도 모든 출석 데이터는 <b>선생님 컴퓨터/태블릿 브라우저에 안전하게 자동 저장</b>되며 언제든 [엑셀(CSV) 다운로드]로 보관할 수 있습니다.
              </li>
            </ul>
          </div>

          {/* Card 2: Camera & QR Scanner */}
          <div className="p-4 rounded-2xl border border-sky-200 bg-sky-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-900">
              <Camera className="w-5 h-5 text-sky-600" />
              <span>2. 학생 스마트폰 및 태블릿 카메라로 QR 스캔</span>
            </div>
            <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 pl-6 list-disc">
              <li>
                <b>스마트폰 및 태블릿 지원:</b> 학생 스마트폰 또는 태블릿의 기본 카메라 앱을 켜고 QR 코드를 비추면 1초 만에 저절로 출석이 완료됩니다.
              </li>
              <li>
                <b>1인 1기기 본인 인증:</b> 대리출석을 방지하기 위해 스마트폰 또는 태블릿 1대당 1명의 학생만 인증 등록되며, 다른 학생 정보로 대리 출석할 수 없습니다.
              </li>
              <li>
                <b>출석 일자 기록 (2026년·2027년):</b> 출석은 2026년과 2027년에 걸쳐 월/일을 선택하여 기록할 수 있습니다.
              </li>
              <li>
                <b>칠판 전체화면 모드:</b> 교사용 화면에서 [수업용 QR 코드] 탭을 누르고 [칠판/TV 전체화면 띄우기]를 실행하면 교실 맨 뒤에서도 크게 보입니다.
              </li>
            </ul>
          </div>

          {/* Card 3: Absentee List & Roster */}
          <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-indigo-900">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <span>3. 아직 출석 안 한 학생(미제출자) 찾는 방법</span>
            </div>
            <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 pl-6 list-disc">
              <li>
                교사용 대시보드 <b>[미출석자 명단 확인]</b> 탭을 클릭하세요.
              </li>
              <li>
                등록된 학급 명부와 실시간 출석 내역을 자동으로 대조하여 <b>아직 체크하지 않은 학생만 빨간 배지로 모아서</b> 보여줍니다.
              </li>
              <li>
                교실에 와있지만 스마트폰이 없는 학생은 옆의 <b>[수동 출석]</b> 버튼을 누르면 즉시 출석으로 인정됩니다.
              </li>
            </ul>
          </div>

          {/* Card 4: Network & Offline */}
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <WifiOff className="w-5 h-5 text-amber-600" />
              <span>4. 교실 Wi-Fi가 불안정하거나 인터넷이 끊겼을 때</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 pl-6">
              본 출석부는 <b>오프라인 우선(Local First)</b> 구조로 설계되었습니다. 교실 네트워크가 일시적으로 끊겨도 브라우저 로컬 저장소에 완벽히 보관되며, 인터넷이 복구되면 구글 시트 및 엑셀로 안전하게 옮길 수 있습니다.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="btn-confirm-help"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
