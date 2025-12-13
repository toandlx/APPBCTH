import type { AppData, LicenseClassData, StudentRecord } from '../types';
import { getResultStatus, isStudentAbsent, isStudentPassed } from './reportUtils';

// Helper to normalize keys with better matching
const normalizeRecord = (record: any): StudentRecord => {
    const normalized: any = {};
    
    // Define mappings for common header variations
    const keyMap: {[key: string]: string} = {
        'HỌ VÀ TÊN': 'HỌ VÀ TÊN', 'HO VA TEN': 'HỌ VÀ TÊN', 'HỌ TÊN': 'HỌ VÀ TÊN', 'HOTEN': 'HỌ VÀ TÊN', 'TÊN HỌC VIÊN': 'HỌ VÀ TÊN',
        'SỐ BÁO DANH': 'SỐ BÁO DANH', 'SBD': 'SỐ BÁO DANH', 'SO BAO DANH': 'SỐ BÁO DANH',
        'MÃ HỌC VIÊN': 'MÃ HỌC VIÊN', 'MÃ HV': 'MÃ HỌC VIÊN', 'MA HOC VIEN': 'MÃ HỌC VIÊN', 'MAHV': 'MÃ HỌC VIÊN', 'MÃ DK': 'MÃ HỌC VIÊN',
        'HẠNG GPLX': 'HẠNG GPLX', 'HẠNG': 'HẠNG GPLX', 'HANG': 'HẠNG GPLX', 'HANG GPLX': 'HẠNG GPLX', 'HẠNG XE': 'HẠNG GPLX',
        'NỘI DUNG THI': 'NỘI DUNG THI', 'NOI DUNG THI': 'NỘI DUNG THI', 'ND THI': 'NỘI DUNG THI', 'MÔN THI': 'NỘI DUNG THI', 'NDSH': 'NỘI DUNG THI',
        
        // Results columns - Handle variations like "Kết quả lý thuyết", "LT", "Điểm LT"
        'LÝ THUYẾT': 'LÝ THUYẾT', 'LY THUYET': 'LÝ THUYẾT', 'KẾT QUẢ LÝ THUYẾT': 'LÝ THUYẾT', 'DIỂM LÝ THUYẾT': 'LÝ THUYẾT', 'LT': 'LÝ THUYẾT', 'ĐIỂM LT': 'LÝ THUYẾT', 'KQ LT': 'LÝ THUYẾT',
        'MÔ PHỎNG': 'MÔ PHỎNG', 'MO PHONG': 'MÔ PHỎNG', 'KẾT QUẢ MÔ PHỎNG': 'MÔ PHỎNG', 'DIỂM MÔ PHỎNG': 'MÔ PHỎNG', 'MP': 'MÔ PHỎNG', 'ĐIỂM MP': 'MÔ PHỎNG', 'KQ MP': 'MÔ PHỎNG',
        'SA HÌNH': 'SA HÌNH', 'THỰC HÀNH TRONG HÌNH': 'SA HÌNH', 'KET QUA SA HINH': 'SA HÌNH', 'KẾT QUẢ SA HÌNH': 'SA HÌNH', 'SH': 'SA HÌNH', 'ĐIỂM SH': 'SA HÌNH', 'KQ SH': 'SA HÌNH', 'TH TRONG HÌNH': 'SA HÌNH',
        'ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'THỰC HÀNH ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'KET QUA DUONG TRUONG': 'ĐƯỜNG TRƯỜNG', 'KẾT QUẢ ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG', 'ĐT': 'ĐƯỜNG TRƯỜNG', 'DT': 'ĐƯỜNG TRƯỜNG', 'ĐIỂM ĐT': 'ĐƯỜNG TRƯỜNG', 'KQ ĐT': 'ĐƯỜNG TRƯỜNG', 'TH ĐƯỜNG TRƯỜNG': 'ĐƯỜNG TRƯỜNG'
    };

    Object.keys(record).forEach(key => {
        const cleanKey = key.trim().toUpperCase().replace(/\s+/g, ' '); // Normalize spaces
        // Try direct match or partial match for result columns
        let mappedKey = keyMap[cleanKey];
        
        if (!mappedKey) {
            // Fuzzy match for specific columns if direct match fails
            if (cleanKey.includes('LY THUYET') || cleanKey.includes('LÝ THUYẾT')) mappedKey = 'LÝ THUYẾT';
            else if (cleanKey.includes('MO PHONG') || cleanKey.includes('MÔ PHỎNG')) mappedKey = 'MÔ PHỎNG';
            else if (cleanKey.includes('SA HINH') || cleanKey.includes('SA HÌNH')) mappedKey = 'SA HÌNH';
            else if (cleanKey.includes('DUONG TRUONG') || cleanKey.includes('ĐƯỜNG TRƯỜNG')) mappedKey = 'ĐƯỜNG TRƯỜNG';
            else mappedKey = cleanKey; // Keep original if no match
        }
        
        normalized[mappedKey] = record[key];
    });
    return normalized as StudentRecord;
};

// Helper to create a new, empty data structure for a license class.
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

export const processExcelData = (rawRecords: StudentRecord[]): AppData => {
    // Normalize headers first
    const records = rawRecords.map(normalizeRecord);

    // Use two separate objects to store aggregated data.
    const firstTimeData: { [className: string]: LicenseClassData } = {};
    const retakeData: { [className: string]: LicenseClassData } = {};

    for (const record of records) {
        const className = record['HẠNG GPLX']?.toString().trim();
        if (!className) continue; // Skip rows without a license class

        const maHocVien = (record['MÃ HỌC VIÊN'] || '').toString().trim();
        const isRetake = maHocVien.startsWith('2721') || maHocVien.startsWith('2722');
        
        const targetData = isRetake ? retakeData : firstTimeData;

        // Ensure the class entry exists
        if (!targetData[className]) {
            targetData[className] = createNewClassData(className);
        }
        const classData = targetData[className];

        // --- Auto-generate 'NỘI DUNG THI' if missing ---
        if (!record['NỘI DUNG THI']) {
             const parts: string[] = [];
             // If data exists in these columns, assume they registered for it
             if (record['LÝ THUYẾT'] !== undefined && record['LÝ THUYẾT'] !== '') parts.push('L');
             if (record['MÔ PHỎNG'] !== undefined && record['MÔ PHỎNG'] !== '') parts.push('M');
             if (record['SA HÌNH'] !== undefined && record['SA HÌNH'] !== '') parts.push('H');
             if (record['ĐƯỜNG TRƯỜNG'] !== undefined && record['ĐƯỜNG TRƯỜNG'] !== '') parts.push('Đ');
             
             if (parts.length > 0) {
                 record['NỘI DUNG THI'] = parts.join('+');
             }
        }

        // --- Core Calculation Logic ---

        // 1. Total Applications: Every valid row is an application.
        classData.totalApplications += 1;

        // 2. Total Participants: A student is a participant if they took at least one test.
        if (!isStudentAbsent(record)) {
            classData.totalParticipants += 1;
        }

        // 3. Individual Test Results
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
        
        // 4. Final Pass: A student passes if they meet all requirements for their specific test type.
        if (isStudentPassed(record)) {
            classData.finalPass += 1;
        }
    }

    // --- Finalize and Format Data ---
    
    const finalizeData = (data: { [className: string]: LicenseClassData }): LicenseClassData[] => {
        const classDataArray = Object.values(data);
        // Calculate 'fail' counts after all records are processed
        for (const classData of classDataArray) {
            classData.theory.fail = classData.theory.total - classData.theory.pass;
            classData.simulation.fail = classData.simulation.total - classData.simulation.pass;
            classData.practicalCourse.fail = classData.practicalCourse.total - classData.practicalCourse.pass;
            classData.onRoad.fail = classData.onRoad.total - classData.onRoad.pass;
        }
        // Sort by class name for consistent report ordering
        return classDataArray.sort((a, b) => a.class.localeCompare(b.class));
    };
    
    const firstTimeRows = finalizeData(firstTimeData);
    const retakeRows = finalizeData(retakeData);

    if (firstTimeRows.length === 0 && retakeRows.length === 0) {
        throw new Error("Không tìm thấy dữ liệu học viên hợp lệ trong file. Vui lòng kiểm tra lại các cột 'HẠNG GPLX', 'MÃ HỌC VIÊN', và các cột kết quả (Lý thuyết, Mô phỏng, Sa hình, Đường trường).");
    }
    
    return {
        firstTime: { title: 'a) Học viên dự thi lần đầu:', rows: firstTimeRows },
        retake: { title: 'b) Thí sinh thuộc đối tượng cấp lại giấy phép lái xe và thí sinh tự do:', rows: retakeRows }
    };
};