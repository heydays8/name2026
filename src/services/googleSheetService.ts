import { AttendanceRecord } from '../types';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * [이동수업 QR 출석부] 구글 스프레드시트 연동용 Google Apps Script
 *
 * [선생님을 위한 설치 가이드]
 * 1. 구글 스프레드시트 상단 메뉴 [확장 프로그램] -> [Apps Script] 클릭
 * 2. 기존 코드를 모두 지우고 이 코드를 전체 복사하여 붙여넣기
 * 3. 상단 [배포] 버튼 -> [새 배포] 클릭
 * 4. 유형 선택: [웹 앱] 선택
 * 5. 설명: '이동수업 출석부 연동' 입력
 * 6. 다음 사용자로 실행: [나] (본인 구글 계정)
 * 7. 액세스 권한이 있는 사용자: 반드시 [모든 사용자] (Anyone) 선택!
 * 8. [배포] 클릭 후 '웹 앱 URL'을 복사하여 출석부 관리자 설정창에 붙여넣으세요.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // 동시 다발 출석 제출 시 충돌 방지

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();

    // 첫 행에 제목(헤더)이 없으면 자동 생성
    if (sheet.getLastRow() === 0) {
      var headers = ['제출일시', '날짜', '교시', '학년', '반', '번호', '이름', '과목명', '교실', '출석상태', '비고'];
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4F46E5'); // 보라/남색 헤더
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }

    var data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    var row = [
      data.formattedTime || Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss"),
      data.date || '',
      data.period || '',
      Number(data.grade) || '',
      Number(data.classNum) || '',
      Number(data.studentNum) || '',
      data.studentName || '',
      data.subject || '',
      data.classroom || '',
      data.status || '출석',
      data.notes || ''
    ];

    sheet.appendRow(row);

    // 마지막 추가된 행 가운데 정렬
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, row.length).setHorizontalAlignment('center');

    return ContentService.createTextOutput(
      JSON.stringify({
        result: 'success',
        message: '출석 기록이 성공적으로 저장되었습니다.',
        rowNumber: lastRow
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        result: 'error',
        message: error.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var action = e && e.parameter && e.parameter.action ? e.parameter.action : 'ping';

    // 1. 단순 연동 테스트(Ping)
    if (action === 'ping') {
      return ContentService.createTextOutput(
        JSON.stringify({
          result: 'success',
          status: 'connected',
          sheetTitle: ss.getName(),
          sheetName: sheet.getName(),
          rowCount: sheet.getLastRow(),
          message: '구글 시트 웹 앱과 성공적으로 연결되었습니다!'
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 전체 출석 기록 조회(Fetch)
    if (action === 'fetch') {
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return ContentService.createTextOutput(
          JSON.stringify({ result: 'success', records: [] })
        ).setMimeType(ContentService.MimeType.JSON);
      }

      var data = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
      var records = [];

      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row[0] && !row[6]) continue; // 빈 행 제외

        records.push({
          id: 'gs-' + (i + 2) + '-' + new Date(row[0]).getTime(),
          formattedTime: row[0] ? Utilities.formatDate(new Date(row[0]), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss") : '',
          date: row[1] ? String(row[1]) : '',
          period: String(row[2] || ''),
          grade: Number(row[3]) || 0,
          classNum: Number(row[4]) || 0,
          studentNum: Number(row[5]) || 0,
          studentName: String(row[6] || ''),
          subject: String(row[7] || ''),
          classroom: String(row[8] || ''),
          status: String(row[9] || '출석'),
          notes: String(row[10] || ''),
          syncedToSheet: true
        });
      }

      return ContentService.createTextOutput(
        JSON.stringify({
          result: 'success',
          count: records.length,
          records: records
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ result: 'error', message: '지원하지 않는 액션입니다.' })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ result: 'error', message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

export interface SyncResult {
  success: boolean;
  message: string;
  detail?: string;
  sheetInfo?: {
    sheetTitle?: string;
    sheetName?: string;
    rowCount?: number;
  };
}

export const GoogleSheetService = {
  /**
   * Submit student attendance record to Google Sheet.
   * Google Apps Script redirects with 302. In browser environments:
   * 1. Try JSON POST with no-cors or cors.
   * 2. When mode is 'no-cors', request will complete with opaque status.
   */
  async submitAttendance(webhookUrl: string, record: AttendanceRecord): Promise<SyncResult> {
    if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: '구글 시트 웹앱 URL이 등록되지 않았습니다. 관리자 설정에서 연동을 진행해 주세요.',
      };
    }

    const cleanUrl = webhookUrl.trim();
    const payload = {
      formattedTime: record.formattedTime,
      date: record.date,
      period: record.period,
      grade: record.grade,
      classNum: record.classNum,
      studentNum: record.studentNum,
      studentName: record.studentName,
      subject: record.subject,
      classroom: record.classroom,
      status: record.status,
      notes: record.notes || '',
    };

    try {
      // Send via standard POST. Using text/plain payload to avoid preflight CORS blockage in GAS
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors', // Essential for GAS web apps cross-origin redirects without blocking
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        message: '구글 시트로 출석 데이터가 실시간 전송되었습니다.',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Google Sheet submission failed:', err);
      return {
        success: false,
        message: '구글 시트 전송 중 네트워크 오류가 발생했습니다. 로컬에 안전하게 보관되었습니다.',
        detail: errorMsg,
      };
    }
  },

  /**
   * Test connection to Google Apps Script Web App.
   */
  async testConnection(webhookUrl: string): Promise<SyncResult> {
    if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
      return {
        success: false,
        message: '올바른 웹앱 URL(https://script.google.com/...)을 입력해 주세요.',
      };
    }

    const cleanUrl = webhookUrl.trim();
    const testUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=ping&_t=${Date.now()}` : `${cleanUrl}?action=ping&_t=${Date.now()}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const res = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok && res.status !== 0) {
        throw new Error(`HTTP 상태 코드: ${res.status} (${res.statusText})`);
      }

      const json = await res.json();
      if (json.result === 'success' || json.status === 'connected') {
        return {
          success: true,
          message: '연동 성공! 구글 시트와 정상 통신 중입니다.',
          sheetInfo: {
            sheetTitle: json.sheetTitle,
            sheetName: json.sheetName,
            rowCount: json.rowCount,
          },
        };
      } else {
        return {
          success: false,
          message: json.message || '응답은 받았으나 시트 접근에 실패했습니다.',
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn('Test connection GET error, testing fallback diagnostic:', err);

      // Diagnostic hint based on common GAS deployment mistakes
      let hint = '구글 앱 스크립트 배포 시 [액세스 권한: 모든 사용자(Anyone)]로 설정되었는지 확인해 주세요.';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('abort')) {
        hint = '구글 보안 정책으로 브라우저 직접 조회(GET)가 차단되었거나 URL이 올바르지 않습니다. 웹앱 배포 설정에서 "모든 사용자(Anyone)" 권한을 재확인하세요.';
      }

      return {
        success: false,
        message: '연동 실패: 구글 시트 응답을 받지 못했습니다.',
        detail: `${errorMsg}\n\n💡 해결 팁: ${hint}`,
      };
    }
  },

  /**
   * Fetch all records from Google Sheet
   */
  async fetchRecordsFromSheet(webhookUrl: string): Promise<{ success: boolean; records: AttendanceRecord[]; message: string }> {
    if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
      return {
        success: false,
        records: [],
        message: '구글 시트 URL이 설정되지 않았습니다.',
      };
    }

    const cleanUrl = webhookUrl.trim();
    const fetchUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=fetch&_t=${Date.now()}` : `${cleanUrl}?action=fetch&_t=${Date.now()}`;

    try {
      const res = await fetch(fetchUrl);
      const json = await res.json();

      if (json.result === 'success' && Array.isArray(json.records)) {
        return {
          success: true,
          records: json.records,
          message: `구글 시트에서 ${json.records.length}건의 출석 데이터를 불러왔습니다.`,
        };
      } else {
        return {
          success: false,
          records: [],
          message: json.message || '시트 데이터를 파싱하지 못했습니다.',
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        records: [],
        message: `구글 시트 불러오기 실패: ${errorMsg}`,
      };
    }
  },
};
