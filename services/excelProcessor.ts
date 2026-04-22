
import type { AppData, LicenseClassData, StudentRecord } from '../types';
import { getResultStatus, isStudentAbsent, isStudentPassed, parseNoiDungThi } from './reportUtils';

// Hàm helper xử lý ngày tháng phức tạp từ Excel
export const parseDateValue = (val: any): string => {
    if (!val) return '';
    
    // 1. Nếu là số (Excel Serial Date)
    if (typeof val === 'number') {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    
    const str = String(val).trim();
    if (!str) return '';

    // 2. Nếu là định dạng dd/mm/yyyy hoặc dd-mm-yyyy
    const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const [_, d, m, y] = match;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // 3. Thử parse mặc định
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return str;
};

export const normalizeRecord = (record: any): StudentRecord => {
    const normalized: any = {};
    const keyMap: {[key: string]: string} = {
        'SỐ BÁO DANH': 'SỐ BÁO DANH', 'SBD': 'SỐ BÁO DANH', 'SO BAO DANH': 'SỐ BÁO DANH', 'SỐ BD': 'SỐ BÁO DANH',
        'MÃ HỌC VIÊN': 'MÃ HỌC VIÊN', 'MÃ HV': 'MÃ HỌC VIÊN', 'MAHV': 'MÃ HỌC VIÊN', 'MADK': 'MÃ HỌC VIÊN', 'MÃ ĐK': 'MÃ HỌC VIÊN', 'MÃ SỐ': 'MÃ HỌC VIÊN', 'MA SO': 'MÃ HỌC VIÊN',
        'HỌ VÀ TÊN': 'HỌ VÀ TÊN', 'HO VA TEN': 'HỌ VÀ TÊN', 'HỌ TÊN': 'HỌ TÊN', 'TÊN': 'HỌ VÀ TÊN', 'TEN HOC VIEN': 'HỌ VÀ TÊN',
        'HẠNG GPLX': 'HẠNG GPLX', 'HẠNG': 'HẠNG GPLX', 'HANG': 'HẠNG GPLX', 'HANG XE': 'HẠNG GPLX', 'HẠNG ĐĂNG KÝ': 'HẠNG GPLX',
        'NỘI DUNG THI': 'NỘI DUNG THI', 'ND THI': 'NỘI DUNG THI', 'NDSH': 'NỘI DUNG THI', 'NỘI DUNG': 'NỘI DUNG THI',
        'LÝ THUYẾT': 'LÝ THUYẾT', 'LT': 'LÝ THUYẾT', 'LY THUYET': 'LÝ THUYẾT', 'KQ LT': 'LÝ THUYẾT',
        'MÔ PHỎNG': 'MÔ PHỎNG', 'MP': 'MÔ PHỎNG', 'MO PHONG': 'MÔ PHỎNG', 'KQ MP': 'MÔ PHỎNG',
        'SA HÌNH': 'SA HÌNH', 'SH': 'SA HÌNH', 'SA HINH': 'SA HÌNH', 'TH TRONG HÌNH': 'SA HÌNH', 'KQ SH': 'SA HÌNH', 'THỰC HÀNH': 'SA HÌNH', 'THUC HANH': 'SA HÌNH',
        'ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'ĐT': 'ĐƯỜNG TRƯỜNG', 'DT': 'ĐƯỜNG TRƯỜNG', 'KQ ĐT': 'ĐƯỜNG TRƯỜNG', 'TH ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG',
        'KẾT QUẢ': 'KẾT QUẢ', 'KET QUA': 'KẾT QUẢ', 'KQ': 'KẾT QUẢ', 'KẾT QUẢ CHUNG CUỘC': 'KẾT QUẢ', 'KẾT QUẢ SÁT HẠCH': 'KẾT QUẢ',
        'SỐ CHỨNG MINH': 'SỐ CHỨNG MINH', 'CCCD': 'SỐ CHỨNG MINH', 'CMND': 'SỐ CHỨNG MINH', 'SỐ THẺ': 'SỐ CHỨNG MINH',
        'NGÀY SINH': 'NGÀY SINH', 'NGAY SINH': 'NGÀY SINH', 'NS': 'NGÀY SINH',
        'NGÀY THI': 'NGÀY THI', 'NGAY THI': 'NGÀY THI', 'NGÀY SÁT HẠCH': 'NGÀY THI', 'NGAY SH': 'NGÀY THI', 'DATE': 'NGÀY THI',
        'NƠI CƯ TRÚ': 'NƠI CƯ TRÚ', 'DIA CHI': 'NƠI CƯ TRÚ', 'HỘ KHẨU': 'NƠI CƯ TRÚ', 'TRÚ QUÁN': 'NƠI CƯ TRÚ'
    };

    Object.keys(record).forEach(key => {
        const cleanKey = key.trim().toUpperCase().replace(/\s+/g, ' ');
        const mapped = keyMap[cleanKey] || cleanKey;
        
        const value = record[key];
        
        // Nếu đã có giá trị là ĐẠT/TRƯỢT, không ghi đè bằng điểm số (số)
        if (normalized[mapped] !== undefined) {
            const existingStr = String(normalized[mapped]).trim().toUpperCase();
            const isExistingResult = ['ĐẠT', 'DAT', 'TRƯỢT', 'TRUOT', 'HỎNG', 'VẮNG', 'PASSED', 'FAILED'].includes(existingStr);
            const isNewValueNumber = !isNaN(Number(value)) && String(value).trim() !== '';
            
            if (isExistingResult && isNewValueNumber) {
                return; // Bỏ qua, không ghi đè
            }
        }
        
        normalized[mapped] = value;
    });

    // Chuẩn hóa các giá trị ngày tháng ngay trong quá trình normalize
    if (normalized['NGÀY SINH']) normalized['NGÀY SINH'] = parseDateValue(normalized['NGÀY SINH']);
    if (normalized['NGÀY THI']) normalized['NGÀY THI'] = parseDateValue(normalized['NGÀY THI']);

    if (!normalized['NỘI DUNG THI']) {
        const parts = [];
        if (normalized['LÝ THUYẾT'] !== undefined && String(normalized['LÝ THUYẾT']).trim() !== '') parts.push('L');
        if (normalized['MÔ PHỎNG'] !== undefined && String(normalized['MÔ PHỎNG']).trim() !== '') parts.push('M');
        if (normalized['SA HÌNH'] !== undefined && String(normalized['SA HÌNH']).trim() !== '') parts.push('H');
        if (normalized['ĐƯỜNG TRƯỜNG'] !== undefined && String(normalized['ĐƯỜNG TRƯỜNG']).trim() !== '') parts.push('Đ');
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
        const isRetake = maHV.startsWith('2721') || maHV.startsWith('2722') || maHV.startsWith('2411');
        const target = isRetake ? retake : firstTime;

        if (!target[className]) target[className] = createEmptyClass(className);
        const data = target[className];

        data.totalApplications++;
        if (!isStudentAbsent(record)) data.totalParticipants++;

        const noiDung = parseNoiDungThi(record['NỘI DUNG THI'] as string);

        if (noiDung.includes('L') || (!noiDung && getResultStatus(record['LÝ THUYẾT']).participated)) {
            const status = getResultStatus(record['LÝ THUYẾT']);
            if (status.participated) {
                data.theory.total++;
                if (status.passed) data.theory.pass++;
            }
        }
        if (noiDung.includes('M') || (!noiDung && getResultStatus(record['MÔ PHỎNG']).participated)) {
            const status = getResultStatus(record['MÔ PHỎNG']);
            if (status.participated) {
                data.simulation.total++;
                if (status.passed) data.simulation.pass++;
            }
        }
        if (noiDung.includes('H') || (!noiDung && getResultStatus(record['SA HÌNH']).participated)) {
            const status = getResultStatus(record['SA HÌNH']);
            if (status.participated) {
                data.practicalCourse.total++;
                if (status.passed) data.practicalCourse.pass++;
            }
        }
        if (noiDung.includes('D') || (!noiDung && getResultStatus(record['ĐƯỜNG TRƯỜNG']).participated)) {
            const status = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
            if (status.participated) {
                data.onRoad.total++;
                if (status.passed) data.onRoad.pass++;
            }
        }
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
