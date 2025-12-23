import type { AppData, LicenseClassData, StudentRecord } from '../types';
import { getResultStatus, isStudentAbsent, isStudentPassed } from './reportUtils';

export const normalizeRecord = (record: any): StudentRecord => {
    if (!record) return {} as StudentRecord;
    const normalized: any = {};
    
    // Bản đồ ánh xạ mở rộng để nhận diện tiêu đề cột linh hoạt
    const keyMap: {[key: string]: string} = {
        'SỐ BÁO DANH': 'SỐ BÁO DANH', 'SBD': 'SỐ BÁO DANH', 'SO BAO DANH': 'SỐ BÁO DANH',
        'MÃ HỌC VIÊN': 'MÃ HỌC VIÊN', 'MÃ HV': 'MÃ HỌC VIÊN', 'MA HOC VIEN': 'MÃ HỌC VIÊN', 'MAHV': 'MÃ HỌC VIÊN', 'MÃ DK': 'MÃ HỌC VIÊN', 'MADK': 'MÃ HỌC VIÊN',
        'HỌ VÀ TÊN': 'HỌ VÀ TÊN', 'HO VA TEN': 'HỌ VÀ TÊN', 'HỌ TÊN': 'HỌ VÀ TÊN', 'HOTEN': 'HỌ VÀ TÊN', 'TÊN HỌC VIÊN': 'HỌ VÀ TÊN', 'HO VA TEN HOC VIEN': 'HỌ VÀ TÊN',
        'HẠNG GPLX': 'HẠNG GPLX', 'HẠNG': 'HẠNG GPLX', 'HANG': 'HẠNG GPLX', 'HANG GPLX': 'HẠNG GPLX', 'HẠNG XE': 'HẠNG GPLX',
        'NỘI DUNG THI': 'NỘI DUNG THI', 'NOI DUNG THI': 'NỘI DUNG THI', 'ND THI': 'NỘI DUNG THI', 'MÔN THI': 'NỘI DUNG THI', 'NDSH': 'NỘI DUNG THI',
        'LÝ THUYẾT': 'LÝ THUYẾT', 'LY THUYET': 'LÝ THUYẾT', 'LT': 'LÝ THUYẾT', 'KQ LT': 'LÝ THUYẾT', 'KQ LY THUYET': 'LÝ THUYẾT',
        'MÔ PHỎNG': 'MÔ PHỎNG', 'MO PHONG': 'MÔ PHỎNG', 'MP': 'MÔ PHỎNG', 'KQ MP': 'MÔ PHỎNG', 'KQ MO PHONG': 'MÔ PHỎNG',
        'SA HÌNH': 'SA HÌNH', 'THỰC HÀNH TRONG HÌNH': 'SA HÌNH', 'SH': 'SA HÌNH', 'KQ SH': 'SA HÌNH', 'TH HINH': 'SA HÌNH',
        'ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'THỰC HÀNH ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'ĐT': 'ĐƯỜNG TRƯỜNG', 'DT': 'ĐƯỜNG TRƯỜNG', 'KQ ĐT': 'ĐƯỜNG TRƯỜNG', 'TH DUONG': 'ĐƯỜNG TRƯỜNG',
        'NGÀY SINH': 'NGÀY SINH', 'NGAY SINH': 'NGÀY SINH', 'NS': 'NGÀY SINH',
        'SỐ CHỨNG MINH': 'SỐ CHỨNG MINH', 'CCCD': 'SỐ CHỨNG MINH', 'CMND': 'SỐ CHỨNG MINH', 'SO CMND': 'SỐ CHỨNG MINH', 'SO CCCD': 'SỐ CHỨNG MINH',
        'NƠI CƯ TRÚ': 'NƠI CƯ TRÚ', 'ĐỊA CHỈ': 'NƠI CƯ TRÚ', 'DIA CHI': 'NƠI CƯ TRÚ', 'HO KHAU': 'NƠI CƯ TRÚ'
    };

    Object.keys(record).forEach(key => {
        const cleanKey = key.trim().toUpperCase().replace(/\s+/g, ' ');
        let mappedKey = keyMap[cleanKey];
        
        // Logic bổ sung nếu không khớp map cứng
        if (!mappedKey) {
            if (cleanKey.includes('LY THUYET') || cleanKey.includes('LÝ THUYẾT')) mappedKey = 'LÝ THUYẾT';
            else if (cleanKey.includes('MO PHONG') || cleanKey.includes('MÔ PHỎNG')) mappedKey = 'MÔ PHỎNG';
            else if (cleanKey.includes('SA HINH') || cleanKey.includes('SA HÌNH')) mappedKey = 'SA HÌNH';
            else if (cleanKey.includes('DUONG TRUONG') || cleanKey.includes('ĐƯỜNG TRƯỜNG')) mappedKey = 'ĐƯỜNG TRƯỜNG';
            else mappedKey = cleanKey;
        }
        normalized[mappedKey] = record[key];
    });
    return normalized as StudentRecord;
};

const createNewClassData = (className: string): LicenseClassData => ({
    class: className,
    totalApplications: 0,
    totalParticipants: 0,
    theory: { total: 0, pass: 0, fail: 0 },
    simulation: { total: 0, pass: 0, fail: 0 },
    practicalCourse: { total: 0, pass: 0, fail: 0 },
    onRoad: { total: 0, pass: 0, fail: 0 },
    finalPass: 0,
});

export const normalizeData = (rawRecords: any[]): StudentRecord[] => {
    return rawRecords.map(raw => {
        const record = normalizeRecord(raw);
        // Tự động tạo NỘI DUNG THI dựa trên điểm nếu thiếu
        if (!record['NỘI DUNG THI']) {
             const parts: string[] = [];
             if (record['LÝ THUYẾT'] !== undefined && record['LÝ THUYẾT'] !== '') parts.push('L');
             if (record['MÔ PHỎNG'] !== undefined && record['MÔ PHỎNG'] !== '') parts.push('M');
             if (record['SA HÌNH'] !== undefined && record['SA HÌNH'] !== '') parts.push('H');
             if (record['ĐƯỜNG TRƯỜNG'] !== undefined && record['ĐƯỜNG TRƯỜNG'] !== '') parts.push('Đ');
             if (parts.length > 0) record['NỘI DUNG THI'] = parts.join('+');
        }
        return record;
    });
};

export const processExcelData = (rawRecords: StudentRecord[]): AppData => {
    const records = normalizeData(rawRecords);
    const firstTimeData: { [className: string]: LicenseClassData } = {};
    const retakeData: { [className: string]: LicenseClassData } = {};

    for (const record of records) {
        const className = record['HẠNG GPLX']?.toString().trim();
        if (!className) continue;

        const maHocVien = (record['MÃ HỌC VIÊN'] || '').toString().trim();
        const isRetake = maHocVien.startsWith('2721') || maHocVien.startsWith('2722');
        const targetData = isRetake ? retakeData : firstTimeData;

        if (!targetData[className]) targetData[className] = createNewClassData(className);
        const classData = targetData[className];

        classData.totalApplications += 1;
        if (!isStudentAbsent(record)) classData.totalParticipants += 1;

        const theoryRes = getResultStatus(record['LÝ THUYẾT']);
        if (theoryRes.participated) {
            classData.theory.total += 1;
            if (theoryRes.passed) classData.theory.pass += 1;
        }
        const simRes = getResultStatus(record['MÔ PHỎNG']);
        if (simRes.participated) {
            classData.simulation.total += 1;
            if (simRes.passed) classData.simulation.pass += 1;
        }
        const practicalRes = getResultStatus(record['SA HÌNH']);
        if (practicalRes.participated) {
            classData.practicalCourse.total += 1;
            if (practicalRes.passed) classData.practicalCourse.pass += 1;
        }
        const onRoadRes = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
        if (onRoadRes.participated) {
            classData.onRoad.total += 1;
            if (onRoadRes.passed) classData.onRoad.pass += 1;
        }
        if (isStudentPassed(record)) classData.finalPass += 1;
    }

    const finalizeData = (data: { [className: string]: LicenseClassData }): LicenseClassData[] => {
        const arr = Object.values(data);
        for (const cd of arr) {
            cd.theory.fail = Math.max(0, cd.theory.total - cd.theory.pass);
            cd.simulation.fail = Math.max(0, cd.simulation.total - cd.simulation.pass);
            cd.practicalCourse.fail = Math.max(0, cd.practicalCourse.total - cd.practicalCourse.pass);
            cd.onRoad.fail = Math.max(0, cd.onRoad.total - cd.onRoad.pass);
        }
        return arr.sort((a, b) => a.class.localeCompare(b.class));
    };
    
    return {
        firstTime: { title: 'a) Học viên dự thi lần đầu:', rows: finalizeData(firstTimeData) },
        retake: { title: 'b) Thí sinh thuộc đối tượng cấp lại giấy phép lái xe và thí sinh tự do:', rows: finalizeData(retakeData) }
    };
};
