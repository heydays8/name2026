import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { AppSettings } from '../types';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  GoogleSheetService,
  SyncResult,
} from '../services/googleSheetService';

interface GoogleSheetSetupTabProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  onOpenHelp: () => void;
}

export const GoogleSheetSetupTab: React.FC<GoogleSheetSetupTabProps> = ({
  settings,
  onSaveSettings,
  onOpenHelp,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(settings.googleSheetWebhookUrl || '');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<SyncResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    });
  };

  const handleSaveUrl = () => {
    const updated = {
      ...settings,
      googleSheetWebhookUrl: webhookUrl.trim(),
    };
    onSaveSettings(updated);
    setSaveMessage('구글 시트 웹앱 URL이 저장되었습니다!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      alert('테스트할 웹앱 URL을 입력해 주세요.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // Save URL first
    onSaveSettings({
      ...settings,
      googleSheetWebhookUrl: webhookUrl.trim(),
    });

    const result = await GoogleSheetService.testConnection(webhookUrl.trim());
    setIsTesting(false);
    setTestResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-slate-900">
            구글 스프레드시트 실시간 연동 (선생님 맞춤형 3단계)
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            구글 시트를 데이터베이스로 연결하면 학생들이 출석할 때마다 스프레드시트에 실시간으로 행이 추가됩니다. 복잡한 서버나 유료 DB 없이 100% 무료로 운영 가능합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenHelp}
          className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200 cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          해결 가이드
        </button>
      </div>

      {/* 3-Step Setup Cards */}
      <div className="space-y-5">
        {/* Step 1 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                1
              </span>
              <h5 className="text-base font-bold text-slate-800">
                구글 스프레드시트 생성 및 Apps Script 열기
              </h5>
            </div>
            <a
              href="https://sheets.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <span>새 구글 시트 만들기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 space-y-1.5 pl-9">
            <p>
              1. 새 구글 스프레드시트를 열고 파일 이름을 <b>[2026학년도 이동수업 출석부]</b>로 지정하세요.
            </p>
            <p>
              2. 상단 메뉴에서 <b>[확장 프로그램]</b> → <b>[Apps Script]</b>를 클릭하세요. 새 스크립트 창이 열립니다.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                2
              </span>
              <h5 className="text-base font-bold text-slate-800">
                완성된 Apps Script (`Code.gs`) 복사하여 붙여넣기
              </h5>
            </div>

            <button
              id="btn-copy-gas-code"
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                copiedCode
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
              }`}
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Code.gs 복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Code.gs 전체 복사하기</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 space-y-2 pl-9">
            <p>
              열린 Apps Script 창의 <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-700 font-mono">Code.gs</code> 파일 내용을 모두 지우고, 위 <b>[Code.gs 전체 복사하기]</b> 버튼을 눌러 붙여넣은 뒤 <b>Ctrl+S (저장)</b>을 누르세요.
            </p>

            {/* Code preview block */}
            <div className="mt-2 bg-slate-900 rounded-xl p-3 text-slate-300 font-mono text-[11px] overflow-x-auto max-h-36 relative">
              <pre>{GOOGLE_APPS_SCRIPT_TEMPLATE.substring(0, 500)}...</pre>
              <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                자동 헤더 생성 / 출석 기록 추가 / 실시간 조회 지원
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
              3
            </span>
            <h5 className="text-base font-bold text-slate-800">
              웹 앱(Web App)으로 배포 후 URL 연결 및 연동 테스트
            </h5>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 space-y-2 pl-9 mb-4">
            <p>
              1. Apps Script 우측 상단 <b>[배포]</b> → <b>[새 배포]</b> 클릭
            </p>
            <p>
              2. 톱니바퀴 아이콘에서 <b>[웹 앱]</b> 선택
            </p>
            <p className="text-rose-600 font-semibold">
              ⚠️ 중요: [액세스 권한이 있는 사용자]를 반드시 <b>[모든 사용자 (Anyone)]</b>로 선택해야 학생들의 폰에서 로그인 없이 출석이 기록됩니다!
            </p>
            <p>
              3. 배포 후 나오는 <b>웹 앱 URL</b>을 아래 입력칸에 붙여넣으세요.
            </p>
          </div>

          {/* Web App URL Input & Test Button */}
          <div className="pl-9 space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              구글 앱 스크립트 웹 앱 URL (Web App URL)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="input-gas-webhook-url"
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 font-mono text-xs sm:text-sm text-slate-800 bg-slate-50 outline-none"
              />

              <div className="flex items-center gap-2">
                <button
                  id="btn-save-gas-url"
                  type="button"
                  onClick={handleSaveUrl}
                  className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  URL 저장
                </button>

                <button
                  id="btn-test-gas-connection"
                  type="button"
                  disabled={isTesting || !webhookUrl.trim()}
                  onClick={handleTestConnection}
                  className="h-12 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>연동 확인 중...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>연동 테스트</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {saveMessage && (
              <p className="text-xs text-emerald-600 font-semibold">
                ✓ {saveMessage}
              </p>
            )}

            {/* Test Connection Results Card */}
            {testResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border text-xs sm:text-sm ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>

                {testResult.sheetInfo && (
                  <div className="mt-2 pl-7 space-y-0.5 text-xs text-emerald-800">
                    <div>
                      📊 연결된 스프레드시트: <b>{testResult.sheetInfo.sheetTitle}</b>
                    </div>
                    <div>
                      📑 시트 탭 이름: {testResult.sheetInfo.sheetName}
                    </div>
                    <div>
                      📝 현재 기록된 행 수: {testResult.sheetInfo.rowCount}행
                    </div>
                  </div>
                )}

                {testResult.detail && (
                  <div className="mt-2 pl-7 text-xs text-rose-700 whitespace-pre-line font-mono bg-white/70 p-2.5 rounded-lg border border-rose-200">
                    {testResult.detail}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
