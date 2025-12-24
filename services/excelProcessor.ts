
import type { AppData, LicenseClassData, StudentRecord } from '../types';
import { getResultStatus, isStudentAbsent, isStudentPassed } from './reportUtils';

export const normalizeRecord = (record: any): StudentRecord => {
    const normalized: any = {};
    // Mở rộng bộ keyMap để nhận diện thông minh hơn
    const keyMap: {[key: string]: string} = {
        'SỐ BÁO DANH': 'SỐ BÁO DANH', 'SBD': 'SỐ BÁO DANH', 'SO BAO DANH': 'SỐ BÁO DANH', 'SỐ BD': 'SỐ BÁO DANH',
        'MÃ HỌC VIÊN': 'MÃ HỌC VIÊN', 'MÃ HV': 'MÃ HỌC VIÊN', 'MAHV': 'MÃ HỌC VIÊN', 'MADK': 'MÃ HỌC VIÊN', 'MÃ ĐK': 'MÃ HỌC VIÊN', 'MÃ SỐ': 'MÃ HỌC VIÊN', 'MA SO': 'MÃ HỌC VIÊN',
        'HỌ VÀ TÊN': 'HỌ VÀ TÊN', 'HO VA TEN': 'HỌ VÀ TÊN', 'HỌ TÊN': 'HỌ VÀ TÊN', 'TÊN': 'HỌ VÀ TÊN', 'TEN HOC VIEN': 'HỌ VÀ TÊN',
        'HẠNG GPLX': 'HẠNG GPLX', 'HẠNG': 'HẠNG GPLX', 'HANG': 'HẠNG GPLX', 'HANG XE': 'HẠNG GPLX', 'HẠNG ĐĂNG KÝ': 'HẠNG GPLX',
        'NỘI DUNG THI': 'NỘI DUNG THI', 'ND THI': 'NỘI DUNG THI', 'NDSH': 'NỘI DUNG THI', 'NỘI DUNG': 'NỘI DUNG THI',
        'LÝ THUYẾT': 'LÝ THUYẾT', 'LT': 'LÝ THUYẾT', 'LY THUYET': 'LÝ THUYẾT', 'ĐIỂM LT': 'LÝ THUYẾT', 'KQ LT': 'LÝ THUYẾT',
        'MÔ PHỎNG': 'MÔ PHỎNG', 'MP': 'MÔ PHỎNG', 'MO PHONG': 'MÔ PHỎNG', 'ĐIỂM MP': 'MÔ PHỎNG', 'KQ MP': 'MÔ PHỎNG',
        'SA HÌNH': 'SA HÌNH', 'SH': 'SA HÌNH', 'SA HINH': 'SA HÌNH', 'TH TRONG HÌNH': 'SA HÌNH', 'KQ SH': 'SA HÌNH',
        'ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'ĐT': 'ĐƯỜNG TRƯỜNG', 'DT': 'ĐƯỜNG TRƯỜNG', 'KQ ĐT': 'ĐƯỜNG TRƯỜNG', 'TH ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG',
        'SỐ CHỨNG MINH': 'SỐ CHỨNG MINH', 'CCCD': 'SỐ CHỨNG MINH', 'CMND': 'SỐ CHỨNG MINH', 'SỐ THẺ': 'SỐ CHỨNG MINH',
        'NGÀY SINH': 'NGÀY SINH', 'NGAY SINH': 'NGÀY SINH', 'NS': 'NGÀY SINH',
        'NƠI CƯ TRÚ': 'NƠI CƯ TRÚ', 'DIA CHI': 'NƠI CƯ TRÚ', 'HỘ KHẨU': 'NƠI CƯ TRÚ', 'TRÚ QUÁN': 'NƠI CƯ TRÚ'
    };

    Object.keys(record).forEach(key => {
        const cleanKey = key.trim().toUpperCase().replace(/\s+/g, ' ');
        const mapped = keyMap[cleanKey] || cleanKey;
        normalized[mapped] = record[key];
    });

    // Tự động suy luận nội dung thi nếu thiếu
    if (!normalized['NỘI DUNG THI']) {
        const parts = [];
        if (normalized['LÝ THUYẾT'] !== undefined && normalized['LÝ THUYẾT'] !== '') parts.push('L');
        if (normalized['MÔ PHỎNG'] !== undefined && normalized['MÔ PHỎNG'] !== '') parts.push('M');
        if (normalized['SA HÌNH'] !== undefined && normalized['SA HÌNH'] !== '') parts.push('H');
        if (normalized['ĐƯỜNG TRƯỜNG'] !== undefined && normalized['ĐƯỜNG TRƯỜNG'] !== '') parts.push('Đ');
        normalized['NỘI DUNG THI'] = parts.join('+');
    }

    return normalized as StudentRecord;
};

const createEmptyClass = (className: string): LicenseClassData => ({
    class: className,
    totalApplications: 0,
    totalParticipants: 0,
    theory: { total: 0, pass: 0, fail: 0 },
    simulation: { total: 0, pass: 0, fail: 0 },
    practicalCourse: { total: 0, pass: 0, fail: 0 },
    onRoad: { total: 0, pass: 0, fail: 0 },
    finalPass: 0,
});

export const normalizeData = (raw: any[]): StudentRecord[] => raw.map(normalizeRecord);

export const processExcelData = (rawRecords: StudentRecord[]): AppData => {
    const firstTime: Record<string, LicenseClassData> = {};
    const retake: Record<string, LicenseClassData> = {};

    rawRecords.forEach(record => {
        const className = String(record['HẠNG GPLX'] || '').trim();
        if (!className) return;

        const maHV = String(record['MÃ HỌC VIÊN'] || '').trim();
        const isRetake = maHV.startsWith('2721') || maHV.startsWith('2722');
        const target = isRetake ? retake : firstTime;

        if (!target[className]) target[className] = createEmptyClass(className);
        const data = target[className];

        data.totalApplications++;
        if (!isStudentAbsent(record)) data.totalParticipants++;

        // Subject stats
        const lt = getResultStatus(record['LÝ THUYẾT']);
        if (lt.participated) { data.theory.total++; if (lt.passed) data.theory.pass++; }
        
        const mp = getResultStatus(record['MÔ PHỎNG']);
        if (mp.participated) { data.simulation.total++; if (mp.passed) data.simulation.pass++; }

        const sh = getResultStatus(record['SA HÌNH']);
        if (sh.participated) { data.practicalCourse.total++; if (sh.passed) data.practicalCourse.pass++; }

        const dt = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
        if (dt.participated) { data.onRoad.total++; if (dt.passed) data.onRoad.pass++; }

        if (isStudentPassed(record)) data.finalPass++;
    });

    const finalize = (obj: Record<string, LicenseClassData>) => 
        Object.values(obj)
            .map(v => ({
                ...v,
                theory: { ...v.theory, fail: Math.max(0, v.theory.total - v.theory.pass) },
                simulation: { ...v.simulation, fail: Math.max(0, v.simulation.total - v.simulation.pass) },
                practicalCourse: { ...v.practicalCourse, fail: Math.max(0, v.practicalCourse.total - v.practicalCourse.pass) },
                onRoad: { ...v.onRoad, fail: Math.max(0, v.onRoad.total - v.onRoad.pass) }
            }))
            .sort((a, b) => a.class.localeCompare(b.class));

    return {
        firstTime: { title: 'a) Học viên dự thi lần đầu:', rows: finalize(firstTime) },
        retake: { title: 'b) Thí sinh thuộc đối tượng cấp lại giấy phép lái xe và thí sinh tự do:', rows: finalize(retake) }
    };
};
