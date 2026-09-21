export type AttendanceStatus = '출석' | '지각' | '조퇴' | '결석';

export interface AttendanceRecord {
  id: string;
  timestamp: string; // ISO 8601
  formattedTime: string; // YYYY-MM-DD HH:mm:ss
  date: string; // YYYY-MM-DD
  period: string; // e.g. "1교시", "2교시"
  grade: number; // 1 ~ 6
  classNum: number; // 1 ~ 15
  studentNum: number; // 1 ~ 40
  studentName: string;
  subject: string; // 과목명
  classroom: string; // 교실명/특별실
  status: AttendanceStatus;
  deviceInfo?: string;
  syncedToSheet: boolean;
  notes?: string;
}

export interface ClassRosterStudent {
  id: string;
  grade: number;
  classNum: number;
  studentNum: number;
  name: string;
}

// Student Device Binding to prevent proxy attendance (1 student per device)
export interface DeviceStudentBinding {
  deviceId: string;
  grade: number;
  classNum: number;
  studentNum: number;
  studentName: string;
  boundAt: string; // ISO 8601
  verified: boolean;
}

export interface AppSettings {
  adminPin: string;
  schoolName: string;
  schoolType: '초등학교' | '중학교' | '고등학교';
  googleSheetWebhookUrl: string;
  subjects: string[];
  classrooms: string[];
  periods: string[];
  autoSync: boolean;
  soundEnabled: boolean;
  allowSelfAttendance: boolean;
  antiProxyMode: boolean; // 1인 1기기 귀속 대리출석 방지 활성화
  requireRosterMatch: boolean; // 학적 명부에 등록된 학생만 출석 허용
}

export interface QRClassroomPayload {
  type: 'classroom_attendance';
  subject: string;
  classroom: string;
  period: string;
  date?: string;
  generatedAt?: string;
  pinCode?: string;
  securityToken?: string;
}

export const DEFAULT_SUBJECTS = [
  '여행지리',
  '사회문제 탐구',
];

export const DEFAULT_CLASSROOMS = [
  '4반',
  '7반',
  '8반',
  '9반',
  '11반',
];

export const DEFAULT_PERIODS = [
  '1교시',
  '2교시',
  '3교시',
  '4교시',
  '5교시',
  '6교시',
  '7교시',
];

export const DEFAULT_SETTINGS: AppSettings = {
  adminPin: '2026',
  schoolName: '고등학교',
  schoolType: '고등학교',
  googleSheetWebhookUrl: '',
  subjects: DEFAULT_SUBJECTS,
  classrooms: DEFAULT_CLASSROOMS,
  periods: DEFAULT_PERIODS,
  autoSync: true,
  soundEnabled: true,
  allowSelfAttendance: true,
  antiProxyMode: true,
  requireRosterMatch: true,
};

// Initial realistic sample student roster for immediate testing (3학년, 1~13반, 1~30번)
export const INITIAL_SAMPLE_ROSTER: ClassRosterStudent[] = [
  // 1반
  { id: 'r1-1', grade: 3, classNum: 1, studentNum: 1, name: '강민우' },
  { id: 'r1-2', grade: 3, classNum: 1, studentNum: 7, name: '이현우' },
  { id: 'r1-3', grade: 3, classNum: 1, studentNum: 15, name: '정수아' },
  // 2반
  { id: 'r2-1', grade: 3, classNum: 2, studentNum: 3, name: '김동하' },
  { id: 'r2-2', grade: 3, classNum: 2, studentNum: 16, name: '임채원' },
  // 3반
  { id: 'r3-1', grade: 3, classNum: 3, studentNum: 5, name: '박태양' },
  { id: 'r3-2', grade: 3, classNum: 3, studentNum: 12, name: '한예린' },
  // 4반
  { id: 'r4-1', grade: 3, classNum: 4, studentNum: 1, name: '강민준' },
  { id: 'r4-2', grade: 3, classNum: 4, studentNum: 5, name: '김도윤' },
  { id: 'r4-3', grade: 3, classNum: 4, studentNum: 12, name: '김서연' },
  { id: 'r4-4', grade: 3, classNum: 4, studentNum: 18, name: '김시우' },
  { id: 'r4-5', grade: 3, classNum: 4, studentNum: 25, name: '오세훈' },
  // 5반
  { id: 'r5-1', grade: 3, classNum: 5, studentNum: 2, name: '구본혁' },
  { id: 'r5-2', grade: 3, classNum: 5, studentNum: 14, name: '남궁민' },
  // 6반
  { id: 'r6-1', grade: 3, classNum: 6, studentNum: 8, name: '문채영' },
  { id: 'r6-2', grade: 3, classNum: 6, studentNum: 20, name: '배준혁' },
  // 7반
  { id: 'r7-1', grade: 3, classNum: 7, studentNum: 3, name: '김예은' },
  { id: 'r7-2', grade: 3, classNum: 7, studentNum: 9, name: '김지호' },
  { id: 'r7-3', grade: 3, classNum: 7, studentNum: 21, name: '김하은' },
  { id: 'r7-4', grade: 3, classNum: 7, studentNum: 28, name: '유다온' },
  // 8반
  { id: 'r8-1', grade: 3, classNum: 8, studentNum: 4, name: '박서준' },
  { id: 'r8-2', grade: 3, classNum: 8, studentNum: 15, name: '박예준' },
  { id: 'r8-3', grade: 3, classNum: 8, studentNum: 27, name: '박지유' },
  // 9반
  { id: 'r9-1', grade: 3, classNum: 9, studentNum: 2, name: '백서아' },
  { id: 'r9-2', grade: 3, classNum: 9, studentNum: 14, name: '송하윤' },
  { id: 'r9-3', grade: 3, classNum: 9, studentNum: 29, name: '신우진' },
  // 10반
  { id: 'r10-1', grade: 3, classNum: 10, studentNum: 6, name: '안유진' },
  { id: 'r10-2', grade: 3, classNum: 10, studentNum: 19, name: '양선우' },
  // 11반
  { id: 'r11-1', grade: 3, classNum: 11, studentNum: 6, name: '이도현' },
  { id: 'r11-2', grade: 3, classNum: 11, studentNum: 11, name: '이지안' },
  { id: 'r11-3', grade: 3, classNum: 11, studentNum: 22, name: '이지후' },
  // 12반
  { id: 'r12-1', grade: 3, classNum: 12, studentNum: 10, name: '전하율' },
  { id: 'r12-2', grade: 3, classNum: 12, studentNum: 24, name: '정민서' },
  // 13반
  { id: 'r13-1', grade: 3, classNum: 13, studentNum: 13, name: '조아린' },
  { id: 'r13-2', grade: 3, classNum: 13, studentNum: 30, name: '정유준' },
];
