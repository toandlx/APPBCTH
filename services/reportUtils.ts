
import type { StudentRecord, TrainingUnit, SavedSession, ConflictWarning } from '../types';

// Helper chuẩn hóa ID để so khớp (Loại bỏ số 0 ở đầu, khoảng trắng)
const normalizeIdForMatch = (id: string | number | undefined): string => {
    if (id === undefined || id === null) return '';
    return String(id).trim().toUpperCase().replace(/^0+/, '');
};

export const getResultStatus = (result: string | number | undefined | null): { participated: boolean, passed: boolean, absent: boolean } => {
    if (result === undefined || result === null) return { participated: false, passed: false, absent: false };
    const normalized = result.toString().trim().toUpperCase();
    if (normalized === '') return { participated: false, passed: false, absent: false };
    if (normalized === 'VẮNG' || normalized === 'VANG' || normalized === 'V') return { participated: false, passed: false, absent: true };
    const isPassed = normalized === 'ĐẠT' || normalized === 'DAT' || normalized === 'PASSED' || normalized === 'P' || normalized === '1' || normalized === 'CHẠM';
    return { participated: true, passed: isPassed, absent: false };
};

export const isStudentAbsent = (record: StudentRecord): boolean => {
    const theory = getResultStatus(record['LÝ THUYẾT']);
    const simulation = getResultStatus(record['MÔ PHỎNG']);
    const practical = getResultStatus(record['SA HÌNH']);
    const onRoad = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
    return !theory.participated && !simulation.participated && !practical.participated && !onRoad.participated;
};

export const parseNoiDungThi = (raw: string | undefined | null): string => {
    const str = String(raw || '').toUpperCase().replace(/Đ/g, 'D');
    let parsed = '';
    
    const hasTheory = str.includes('LÝ THUYẾT') || str.includes('LY THUYET') || str.match(/\bLT\b/);
    const hasSim = str.includes('MÔ PHỎNG') || str.includes('MO PHONG') || str.match(/\bMP\b/);
    const hasPrac = str.includes('SA HÌNH') || str.includes('SA HINH') || str.match(/\bSH\b/) || str.includes('THỰC HÀNH') || str.includes('THUC HANH') || str.includes('TRONG HÌNH');
    const hasRoad = str.includes('DƯỜNG TRƯỜNG') || str.includes('DUONG TRUONG') || str.match(/\bDT\b/);

    if (hasTheory) parsed += 'L';
    if (hasSim) parsed += 'M';
    if (hasPrac) parsed += 'H';
    if (hasRoad) parsed += 'D';

    if (parsed.length > 0) return parsed;

    // Check if the string is just a combination of L, M, H, D (e.g., "L+M+H+D", "L, M", "LMHD")
    // Remove all non-alphabet characters to check
    const lettersOnly = str.replace(/[^A-Z]/g, '');
    if (lettersOnly.length > 0 && /^[LMHD]+$/.test(lettersOnly)) {
        if (lettersOnly.includes('L')) parsed += 'L';
        if (lettersOnly.includes('M')) parsed += 'M';
        if (lettersOnly.includes('H')) parsed += 'H';
        if (lettersOnly.includes('D')) parsed += 'D';
        return parsed;
    }

    return parsed;
};

export const isStudentPassed = (record: StudentRecord): boolean => {
    if (isStudentAbsent(record)) return false;
    
    // Check explicit KẾT QUẢ column first if it exists
    const finalResultStr = record['KẾT QUẢ']?.toString().trim().toUpperCase();
    if (finalResultStr === 'ĐẠT' || finalResultStr === 'DAT' || finalResultStr === 'PASSED') return true;
    if (finalResultStr === 'TRƯỢT' || finalResultStr === 'TRUOT' || finalResultStr === 'HỎNG' || finalResultStr === 'FAILED') return false;

    const theory = getResultStatus(record['LÝ THUYẾT']);
    const simulation = getResultStatus(record['MÔ PHỎNG']);
    const practical = getResultStatus(record['SA HÌNH']);
    const onRoad = getResultStatus(record['ĐƯỜNG TRƯỜNG']);

    const noiDungThi = parseNoiDungThi(record['NỘI DUNG THI'] as string);

    if (noiDungThi.length === 0) {
        // Nếu không có cột NDTHI, kiểm tra xem tất cả những môn có tham gia thi đều phải Đạt
        if (theory.participated && !theory.passed) return false;
        if (simulation.participated && !simulation.passed) return false;
        if (practical.participated && !practical.passed) return false;
        if (onRoad.participated && !onRoad.passed) return false;
        
        // Nếu vắng ở bất kỳ môn nào, thì trượt
        if (theory.absent || simulation.absent || practical.absent || onRoad.absent) return false;

        // Phải tham gia ít nhất 1 môn và đạt môn đó
        return theory.participated || simulation.participated || practical.participated || onRoad.participated;
    }

    // Yêu cầu học viên phải có kết quả "ĐẠT" ở TẤT CẢ các môn được liệt kê trong cột NỘI DUNG THI
    const requiredTestsPassed =
        (!noiDungThi.includes('L') || theory.passed) &&
        (!noiDungThi.includes('M') || simulation.passed) &&
        (!noiDungThi.includes('H') || practical.passed) &&
        (!noiDungThi.includes('D') || onRoad.passed);
    
    return requiredTestsPassed;
};

const getPartName = (code: string) => {
    switch(code) {
        case 'L': return 'Lý thuyết';
        case 'M': return 'Mô phỏng';
        case 'H': return 'Sa hình';
        case 'D': return 'Đường trường';
        default: return code;
    }
};

const PART_ORDER = ['L', 'M', 'H', 'D'];

export const checkHistoricalConflicts = (
    currentRecords: StudentRecord[],
    history: SavedSession[],
    currentSessionId: string = "new-upload"
): ConflictWarning[] => {
    const warnings: ConflictWarning[] = [];
    
    // Bản đồ lưu thông tin lịch sử
    const studentHistory = new Map<string, {
        passed: Set<string>,
        failed: Set<string>,
        firstFramework: Set<string>,
        lastSession: { id: string, name: string, date: string }
    }>();

    // Sắp xếp lịch sử theo thời gian để quét từ cũ đến mới
    const sortedHistory = [...history].sort((a, b) => 
        new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

    sortedHistory.forEach(session => {
        // Không đối soát chính nó
        if (session.id === currentSessionId) return;

        const sessionDate = new Date(session.reportDate).toLocaleDateString('vi-VN');
        
        session.studentRecords.forEach(record => {
            const sid = normalizeIdForMatch(record['MÃ HỌC VIÊN']);
            const cccd = normalizeIdForMatch(record['SỐ CHỨNG MINH']);
            if (!sid && !cccd) return;

            const key = sid || `cccd-${cccd}`;
            
            if (!studentHistory.has(key)) {
                studentHistory.set(key, {
                    passed: new Set(),
                    failed: new Set(),
                    firstFramework: new Set(),
                    lastSession: { id: session.id, name: session.name, date: sessionDate }
                });
            }

            const historyData = studentHistory.get(key)!;
            historyData.lastSession = { id: session.id, name: session.name, date: sessionDate };

            if (historyData.firstFramework.size === 0) {
                const content = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                PART_ORDER.forEach(p => { if (content.includes(p)) historyData.firstFramework.add(p); });
            }

            const subjects = [
                { code: 'L', val: record['LÝ THUYẾT'] },
                { code: 'M', val: record['MÔ PHỎNG'] },
                { code: 'H', val: record['SA HÌNH'] },
                { code: 'D', val: record['ĐƯỜNG TRƯỜNG'] }
            ];

            subjects.forEach(sub => {
                const status = getResultStatus(sub.val);
                if (status.participated) {
                    if (status.passed) {
                        historyData.passed.add(sub.code);
                        historyData.failed.delete(sub.code);
                    } else if (!historyData.passed.has(sub.code)) {
                        historyData.failed.add(sub.code);
                    }
                }
            });
        });
    });

    // Đối soát
    currentRecords.forEach(record => {
        const sid = normalizeIdForMatch(record['MÃ HỌC VIÊN']);
        const cccd = normalizeIdForMatch(record['SỐ CHỨNG MINH']);
        const key = sid || `cccd-${cccd}`;
        
        const historyData = studentHistory.get(key);
        if (!historyData) return;

        const currentContent = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
        const currentParts = new Set<string>();
        PART_ORDER.forEach(p => { if (currentContent.includes(p)) currentParts.add(p); });

        // 1. Thi lại môn đã đỗ
        currentParts.forEach(p => {
            if (historyData.passed.has(p)) {
                warnings.push({
                    studentName: record['HỌ VÀ TÊN'],
                    studentId: String(record['MÃ HỌC VIÊN']),
                    conflictPart: `Môn ${getPartName(p)} đã ĐẠT trong quá khứ`,
                    previousSessionName: historyData.lastSession.name,
                    previousDate: historyData.lastSession.date,
                    sourceSessionId: currentSessionId,
                    targetSessionId: historyData.lastSession.id
                });
            }
        });

        // 2. Sai bộ khung
        currentParts.forEach(p => {
            if (historyData.firstFramework.size > 0 && !historyData.firstFramework.has(p)) {
                warnings.push({
                    studentName: record['HỌ VÀ TÊN'],
                    studentId: String(record['MÃ HỌC VIÊN']),
                    conflictPart: `Môn ${getPartName(p)} không có trong nội dung đăng ký lần đầu`,
                    previousSessionName: historyData.lastSession.name,
                    previousDate: historyData.lastSession.date,
                    sourceSessionId: currentSessionId,
                    targetSessionId: historyData.lastSession.id
                });
            }
        });
    });

    return warnings;
};

export const generateClassSummaryString = (students: StudentRecord[]): string => {
    if (!students || students.length === 0) return "Tổng số: 0";
    const classCounts: { [key: string]: number } = {};
    for (const student of students) {
        const className = String(student['HẠNG GPLX'] || 'Khác').trim();
        classCounts[className] = (classCounts[className] || 0) + 1;
    }
    const sortedClasses = Object.keys(classCounts).sort();
    const parts = sortedClasses.map(className => `Hạng ${className}: ${classCounts[className]}`);
    return `Tổng số: ${students.length}\u00A0\u00A0\u00A0\u00A0${parts.join('; ')}`;
};

export const generateGhiChu = (record: StudentRecord): string => {
    const maHocVien = (record['MÃ HỌC VIÊN'] || '').toString().trim();
    // Cập nhật logic: thêm mã 2411
    const isRetake = maHocVien.startsWith('2721') || maHocVien.startsWith('2722') || maHocVien.startsWith('2411');
    
    let testsTaken = (record['NỘI DUNG THI'] || '').toString().trim().toUpperCase();
    if (isRetake) return `Thi lại: ${testsTaken}`;
    return `Thi lần đầu`;
};

export const identifyTrainingUnit = (studentId: string | number | undefined, units: TrainingUnit[] = []): string => {
    if (!studentId || !units || units.length === 0) return '';
    const sId = studentId.toString().trim();
    const sortedUnits = [...units].sort((a, b) => b.code.length - a.code.length);
    const matchedUnit = sortedUnits.find(u => sId.startsWith(u.code));
    return matchedUnit ? matchedUnit.name : '';
};
