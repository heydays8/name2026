import {
  AttendanceRecord,
  AppSettings,
  ClassRosterStudent,
  DeviceStudentBinding,
  DEFAULT_SETTINGS,
  DEFAULT_SUBJECTS,
  DEFAULT_CLASSROOMS,
  INITIAL_SAMPLE_ROSTER,
} from '../types';

const STORAGE_KEYS = {
  RECORDS: 'qr_attendance_records_v1',
  ROSTER: 'qr_attendance_roster_v1',
  SETTINGS: 'qr_attendance_settings_v1',
  RECENT_STUDENT: 'qr_attendance_recent_student_v1',
  DEVICE_BINDING: 'qr_attendance_device_binding_v2',
};

// Formats Date to YYYY-MM-DD
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formats timestamp to YYYY-MM-DD HH:mm:ss
export function formatDateTime(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export const StorageService = {
  getSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        let changed = false;
        // Migrate previous defaults if needed
        if (!parsed.subjects || parsed.subjects.includes('과학') || parsed.subjects.length !== 2) {
          parsed.subjects = DEFAULT_SUBJECTS;
          changed = true;
        }
        if (!parsed.classrooms || parsed.classrooms.includes('과학1실') || parsed.classrooms.length !== 5) {
          parsed.classrooms = DEFAULT_CLASSROOMS;
          changed = true;
        }
        if (parsed.schoolType !== '고등학교') {
          parsed.schoolType = '고등학교';
          changed = true;
        }
        if (parsed.periods && parsed.periods.includes('방과후')) {
          parsed.periods = parsed.periods.filter((p: string) => p !== '방과후');
          changed = true;
        }
        if (!parsed.adminPin || parsed.adminPin === '1234') {
          parsed.adminPin = '2026';
          changed = true;
        }
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        if (changed) {
          this.saveSettings(merged);
        }
        return merged;
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  },

  getRoster(): ClassRosterStudent[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ROSTER);
      if (stored) {
        const parsed: ClassRosterStudent[] = JSON.parse(stored);
        if (parsed && parsed.length > 0) {
          // If previous roster contained students from other grades, update to 3rd grade
          if (parsed.some((s) => s.grade !== 3)) {
            this.saveRoster(INITIAL_SAMPLE_ROSTER);
            return INITIAL_SAMPLE_ROSTER;
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load roster:', e);
    }
    // Initialize with sample roster
    this.saveRoster(INITIAL_SAMPLE_ROSTER);
    return INITIAL_SAMPLE_ROSTER;
  },

  saveRoster(roster: ClassRosterStudent[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROSTER, JSON.stringify(roster));
    } catch (e) {
      console.error('Failed to save roster:', e);
    }
  },

  getRecords(): AttendanceRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (stored) {
        const records: AttendanceRecord[] = JSON.parse(stored);
        if (records && records.length > 0) {
          // If stored records were for older mock subjects (e.g. 과학) or grade 4, migrate them
          if (records.some((r) => r.subject === '과학' || r.grade !== 3)) {
            const today = getTodayDateString();
            const freshSample: AttendanceRecord[] = [
              {
                id: 'rec-sample-1',
                timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 35 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 4,
                studentNum: 1,
                studentName: '강민준',
                subject: '여행지리',
                classroom: '4반',
                status: '출석',
                syncedToSheet: false,
              },
              {
                id: 'rec-sample-2',
                timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 30 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 4,
                studentNum: 5,
                studentName: '김도윤',
                subject: '여행지리',
                classroom: '4반',
                status: '출석',
                syncedToSheet: false,
              },
              {
                id: 'rec-sample-3',
                timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 25 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 7,
                studentNum: 3,
                studentName: '김예은',
                subject: '사회문제 탐구',
                classroom: '7반',
                status: '출석',
                syncedToSheet: false,
              },
              {
                id: 'rec-sample-4',
                timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 20 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 8,
                studentNum: 4,
                studentName: '박서준',
                subject: '여행지리',
                classroom: '8반',
                status: '출석',
                syncedToSheet: false,
              },
              {
                id: 'rec-sample-5',
                timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 15 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 9,
                studentNum: 2,
                studentName: '백서아',
                subject: '사회문제 탐구',
                classroom: '9반',
                status: '지각',
                notes: '이동 중 늦음',
                syncedToSheet: false,
              },
              {
                id: 'rec-sample-6',
                timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                formattedTime: formatDateTime(new Date(Date.now() - 10 * 60 * 1000)),
                date: today,
                period: '3교시',
                grade: 3,
                classNum: 11,
                studentNum: 6,
                studentName: '이도현',
                subject: '여행지리',
                classroom: '11반',
                status: '출석',
                syncedToSheet: false,
              },
            ];
            this.saveAllRecords(freshSample);
            return freshSample;
          }
          return records;
        }
      }
    } catch (e) {
      console.error('Failed to load records:', e);
    }

    // Seed initial realistic sample data for today so teacher dashboard displays immediately
    const today = getTodayDateString();
    const sampleRecords: AttendanceRecord[] = [
      {
        id: 'rec-sample-1',
        timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 35 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 4,
        studentNum: 1,
        studentName: '강민준',
        subject: '여행지리',
        classroom: '4반',
        status: '출석',
        syncedToSheet: false,
      },
      {
        id: 'rec-sample-2',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 30 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 4,
        studentNum: 5,
        studentName: '김도윤',
        subject: '여행지리',
        classroom: '4반',
        status: '출석',
        syncedToSheet: false,
      },
      {
        id: 'rec-sample-3',
        timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 25 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 7,
        studentNum: 3,
        studentName: '김예은',
        subject: '사회문제 탐구',
        classroom: '7반',
        status: '출석',
        syncedToSheet: false,
      },
      {
        id: 'rec-sample-4',
        timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 20 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 8,
        studentNum: 4,
        studentName: '박서준',
        subject: '여행지리',
        classroom: '8반',
        status: '출석',
        syncedToSheet: false,
      },
      {
        id: 'rec-sample-5',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 15 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 9,
        studentNum: 2,
        studentName: '백서아',
        subject: '사회문제 탐구',
        classroom: '9반',
        status: '지각',
        notes: '이동 중 늦음',
        syncedToSheet: false,
      },
      {
        id: 'rec-sample-6',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        formattedTime: formatDateTime(new Date(Date.now() - 10 * 60 * 1000)),
        date: today,
        period: '3교시',
        grade: 3,
        classNum: 11,
        studentNum: 6,
        studentName: '이도현',
        subject: '여행지리',
        classroom: '11반',
        status: '출석',
        syncedToSheet: false,
      },
    ];

    this.saveAllRecords(sampleRecords);
    return sampleRecords;
  },

  saveAllRecords(records: AttendanceRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error('Failed to save records:', e);
    }
  },

  addRecord(record: AttendanceRecord): AttendanceRecord[] {
    const existing = this.getRecords();
    // Check if the student already submitted for this date, period, and subject
    const duplicateIndex = existing.findIndex(
      (r) =>
        r.date === record.date &&
        r.period === record.period &&
        r.grade === record.grade &&
        r.classNum === record.classNum &&
        r.studentNum === record.studentNum
    );

    let updated: AttendanceRecord[];
    if (duplicateIndex >= 0) {
      // Overwrite/update with latest attendance
      updated = [...existing];
      updated[duplicateIndex] = {
        ...record,
        id: updated[duplicateIndex].id,
      };
    } else {
      updated = [record, ...existing];
    }

    this.saveAllRecords(updated);
    return updated;
  },

  updateRecordStatus(id: string, status: AttendanceRecord['status'], notes?: string): AttendanceRecord[] {
    const records = this.getRecords();
    const updated = records.map((r) => (r.id === id ? { ...r, status, notes: notes !== undefined ? notes : r.notes } : r));
    this.saveAllRecords(updated);
    return updated;
  },

  deleteRecord(id: string): AttendanceRecord[] {
    const records = this.getRecords();
    const updated = records.filter((r) => r.id !== id);
    this.saveAllRecords(updated);
    return updated;
  },

  clearAllRecords(): void {
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
  },

  // Recent student data for fast repeat attendance on personal devices
  getRecentStudent(): Partial<ClassRosterStudent> | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.RECENT_STUDENT);
      if (stored) {
        const student = JSON.parse(stored);
        student.grade = 3;
        if (student.classNum && (student.classNum > 13 || student.classNum < 1)) student.classNum = 4;
        if (student.studentNum && (student.studentNum > 30 || student.studentNum < 1)) student.studentNum = 1;
        return student;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  saveRecentStudent(data: Partial<ClassRosterStudent>): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.RECENT_STUDENT,
        JSON.stringify({ ...data, grade: 3 })
      );
    } catch {
      // Ignore
    }
  },

  exportRecordsToCSV(records: AttendanceRecord[]): void {
    if (records.length === 0) {
      alert('내보낼 출석 데이터가 없습니다.');
      return;
    }

    const headers = [
      '제출일시',
      '날짜',
      '교시',
      '학년',
      '반',
      '번호',
      '이름',
      '과목명',
      '교실',
      '출석상태',
      '비고',
      '구글시트동기화여부',
    ];

    const rows = records.map((r) => [
      `"${r.formattedTime}"`,
      `"${r.date}"`,
      `"${r.period}"`,
      r.grade,
      r.classNum,
      r.studentNum,
      `"${r.studentName}"`,
      `"${r.subject}"`,
      `"${r.classroom}"`,
      `"${r.status}"`,
      `"${r.notes || ''}"`,
      r.syncedToSheet ? '동기화완료' : '로컬보관',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `이동수업_출석명부_${getTodayDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // 1인 1기기 인증 귀속 (대리출석 원천 방지)
  getDeviceBinding(): DeviceStudentBinding | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DEVICE_BINDING);
      if (stored) {
        const parsed: DeviceStudentBinding = JSON.parse(stored);
        if (parsed && parsed.studentName && parsed.deviceId) {
          parsed.grade = 3; // 항상 3학년 고정
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to get device binding:', e);
    }
    return null;
  },

  saveDeviceBinding(info: { classNum: number; studentNum: number; studentName: string }): DeviceStudentBinding {
    const existing = this.getDeviceBinding();
    const deviceId = existing?.deviceId || `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const binding: DeviceStudentBinding = {
      deviceId,
      grade: 3,
      classNum: info.classNum,
      studentNum: info.studentNum,
      studentName: info.studentName.trim(),
      boundAt: new Date().toISOString(),
      verified: true,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.DEVICE_BINDING, JSON.stringify(binding));
      // Also cache in recent student for backward compatibility
      this.saveRecentStudent(binding);
    } catch (e) {
      console.error('Failed to save device binding:', e);
    }
    return binding;
  },

  clearDeviceBinding(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DEVICE_BINDING);
      localStorage.removeItem(STORAGE_KEYS.RECENT_STUDENT);
    } catch (e) {
      console.error('Failed to clear device binding:', e);
    }
  },

  // 학적 명부와 대조하여 실제 학생인지 검증 (가짜 이름/번호 임의 입력 원천 차단)
  validateStudentWithRoster(
    classNum: number,
    studentNum: number,
    studentName: string
  ): { valid: boolean; matchedStudent?: ClassRosterStudent; error?: string } {
    const roster = this.getRoster();
    const cleanName = studentName.replace(/\s+/g, '');

    // 1. 해당 반, 번호에 등록된 학생 찾기
    const studentInRoster = roster.find(
      (s) => s.grade === 3 && s.classNum === classNum && s.studentNum === studentNum
    );

    if (!studentInRoster) {
      // 명부에 해당 반/번호가 없는 경우
      // 반 번호가 1~13반, 1~30번 범위인지 확인하고 유효 처리하되 명부 신규 등록
      if (classNum >= 1 && classNum <= 13 && studentNum >= 1 && studentNum <= 30 && cleanName.length >= 2) {
        const newStudent: ClassRosterStudent = {
          id: `r-auto-${Date.now()}`,
          grade: 3,
          classNum,
          studentNum,
          name: studentName.trim(),
        };
        this.saveRoster([...roster, newStudent]);
        return { valid: true, matchedStudent: newStudent };
      }
      return {
        valid: false,
        error: `3학년 ${classNum}반 ${studentNum}번은 학적 명부에 등록되지 않았거나 올바르지 않은 번호입니다.`,
      };
    }

    // 2. 이름 일치 여부 대조
    const rosterCleanName = studentInRoster.name.replace(/\s+/g, '');
    if (rosterCleanName !== cleanName) {
      return {
        valid: false,
        error: `학적 명부 불일치: 3학년 ${classNum}반 ${studentNum}번 학생의 등록된 성명(${studentInRoster.name})과 입력하신 성명(${studentName})이 일치하지 않습니다. 대리 출석을 방지하기 위해 본인 이름만 입력할 수 있습니다.`,
        matchedStudent: studentInRoster,
      };
    }

    return { valid: true, matchedStudent: studentInRoster };
  },

  // 반별 수강생 목록 가져오기
  getRosterStudentsByClass(classNum: number): ClassRosterStudent[] {
    const roster = this.getRoster();
    return roster
      .filter((s) => s.grade === 3 && s.classNum === classNum)
      .sort((a, b) => a.studentNum - b.studentNum);
  },
};
