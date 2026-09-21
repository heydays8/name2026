import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, SwitchCamera, Upload, AlertCircle } from 'lucide-react';
import { QRClassroomPayload } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (payload: Partial<QRClassroomPayload>) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraList, setCameraList] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parseScannedText = (decodedText: string): Partial<QRClassroomPayload> | null => {
    try {
      // 1. Try parsing JSON payload
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const parsed = JSON.parse(decodedText);
        if (parsed.subject || parsed.classroom || parsed.period) {
          return {
            subject: parsed.subject,
            classroom: parsed.classroom,
            period: parsed.period,
            date: parsed.date,
          };
        }
      }

      // 2. Try parsing URL with query params (e.g. ?subject=과학&classroom=과학실&period=3교시)
      if (decodedText.includes('?')) {
        const urlStr = decodedText.startsWith('http') ? decodedText : `https://dummy.local/${decodedText}`;
        const url = new URL(urlStr);
        const subject = url.searchParams.get('subject') || undefined;
        const classroom = url.searchParams.get('classroom') || undefined;
        const period = url.searchParams.get('period') || undefined;
        const date = url.searchParams.get('date') || undefined;

        if (subject || classroom || period) {
          return { subject, classroom, period, date };
        }
      }

      // 3. Fallback: comma or dash separated text like "과학,과학1실,3교시"
      if (decodedText.includes(',')) {
        const parts = decodedText.split(',').map((s) => s.trim());
        return {
          subject: parts[0],
          classroom: parts[1],
          period: parts[2],
        };
      }
    } catch (e) {
      console.warn('QR parse failed:', e);
    }
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    setIsInitializing(true);
    setErrorMessage(null);

    const initScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setErrorMessage('사용 가능한 카메라 장치를 찾지 못했습니다. 기기의 카메라 권한을 허용해 주세요.');
          setIsInitializing(false);
          return;
        }

        setCameraList(devices);
        // Prefer back camera ("environment")
        const backCamera = devices.find((d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('후면'));
        const targetCameraId = backCamera ? backCamera.id : devices[0].id;
        setSelectedCameraId(targetCameraId);

        html5QrCode = new Html5Qrcode('qr-reader-container', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          targetCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            const parsed = parseScannedText(decodedText);
            if (parsed) {
              if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {});
              }
              onScanSuccess(parsed);
              onClose();
            } else {
              setErrorMessage('출석용 QR 코드가 아닙니다. 교실 앞 화면의 QR 코드를 스캔해 주세요.');
            }
          },
          () => {
            // Ignore scan attempt misses
          }
        );

        setIsInitializing(false);
      } catch (err: unknown) {
        if (!isMounted) return;
        setIsInitializing(false);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setErrorMessage('카메라 접근 권한이 차단되었습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘에서 카메라 권한을 허용해 주세요.');
        } else {
          setErrorMessage(`카메라를 실행할 수 없습니다: ${msg}`);
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(() => {});
      }
    };
  }, [isOpen]);

  const handleSwitchCamera = async () => {
    if (!scannerRef.current || cameraList.length <= 1) return;
    const currentIndex = cameraList.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameraList.length;
    const nextCamera = cameraList[nextIndex];
    setSelectedCameraId(nextCamera.id);

    try {
      await scannerRef.current.stop();
      await scannerRef.current.start(
        nextCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const parsed = parseScannedText(decodedText);
          if (parsed) {
            scannerRef.current?.stop().catch(() => {});
            onScanSuccess(parsed);
            onClose();
          }
        },
        () => {}
      );
    } catch (e) {
      console.error('Camera switch error:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader-container');
      }
      const result = await scannerRef.current.scanFile(file, true);
      const parsed = parseScannedText(result);
      if (parsed) {
        onScanSuccess(parsed);
        onClose();
      } else {
        setErrorMessage('이미지에서 유효한 이동수업 QR 코드를 찾지 못했습니다.');
      }
    } catch {
      setErrorMessage('이미지에서 QR 코드를 인식하지 못했습니다. 더 선명한 사진을 사용해 주세요.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="qr-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            <h3 className="text-lg font-bold">QR 코드 스캔</h3>
          </div>
          <button
            id="btn-close-scanner"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-emerald-700 active:scale-95 transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 flex flex-col items-center">
          <p className="text-sm font-medium text-slate-600 mb-3 text-center">
            교실 칠판이나 TV 화면의 <span className="text-emerald-700 font-bold">이동수업 QR 코드</span>를 네모 틀 안에 맞춰주세요.
          </p>

          {/* Scanner Viewport Container */}
          <div className="relative w-full aspect-square max-w-[280px] bg-slate-900 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-inner flex items-center justify-center">
            <div id="qr-reader-container" className="w-full h-full" />

            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-3 p-4 text-center">
                <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">카메라를 켜는 중입니다...</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3 w-full p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">안내: </span>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="mt-4 flex items-center justify-center gap-3 w-full">
            {cameraList.length > 1 && (
              <button
                id="btn-switch-camera"
                type="button"
                onClick={handleSwitchCamera}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
                카메라 전환
              </button>
            )}

            <button
              id="btn-upload-qr-file"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              사진 앨범에서 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          {/* Manual Info Note */}
          <div className="mt-5 text-center">
            <button
              id="btn-manual-input-fallback"
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              카메라 사용이 어렵다면? 직접 정보 입력하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
