export interface TestResult {
  total: number;
  pass: number;
  fail: number;
}

export interface LicenseClassData {
  class: string;
  totalApplications: number;
  totalParticipants: number;
  theory: TestResult;
  simulation: TestResult;
  practicalCourse: TestResult;
  onRoad: TestResult;
  finalPass: number;
}

export interface TableData {
  title: string;
  rows: LicenseClassData[];
}

export interface AppData {
    firstTime: TableData;
    retake: TableData;
}

export type TestType = 'theory' | 'simulation' | 'practicalCourse' | 'onRoad';

export interface StudentRecord {
  'SỐ BÁO DANH': string | number;
  'MÃ HỌC VIÊN': string | number;
  'HỌ VÀ TÊN': string;
  'SỐ CHỨNG MINH'?: string | number;
  'NGÀY SINH'?: string | number;
  'NƠI CƯ TRÚ'?: string;
  'HẠNG GPLX': string;
  'NỘI DUNG THI': string;
  'LÝ THUYẾT': string;
  'MÔ PHỎNG': string;
  'SA HÌNH': string;
  'ĐƯỜNG TRƯỜNG': string;
}

export interface Attendee {
  id: string;
  name: string;
  role: string;
}

export interface ReportMetadata {
    meetingTime: string;
    meetingLocation: string;
    organizer: string;
    attendees: Attendee[];
    technicalErrorSBD?: string;
}

export interface TrainingUnit {
    id: string;
    code: string; 
    name: string; 
}

export interface SavedSession {
    id: string;
    name: string;
    createdAt: number;
    reportDate: string;
    studentRecords: StudentRecord[];
    appData: AppData;
    grandTotal: LicenseClassData;
    reportMetadata: ReportMetadata;
    trainingUnits: TrainingUnit[];
}
