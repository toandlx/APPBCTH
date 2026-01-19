
import type { StudentRecord, TrainingUnit, SavedSession, ConflictWarning } from '../types';

// Helper chuẩn hóa ID để so khớp (Loại bỏ số 0 ở đầu, khoảng trắng)
const normalizeIdForMatch = (id: string | number | undefined): string => {
    if (id === undefined || id === null) return '';
    return String(id).trim().toUpperCase().replace(/^0+/, '');
};

export const getResultStatus = (result: string | number | undefined | null): { participated: boolean, passed: boolean } => {
    if (result === undefined || result === null) return { participated: false, passed: false };
    const normalized = result.toString().trim().toUpperCase();
    if (normalized === '' || normalized === 'VẮNG' || normalized === 'V') return { participated: false, passed: false };
    const isPassed = normalized === 'ĐẠT' || normalized === 'PASSED' || normalized === 'P' || normalized === '1' || normalized === 'CHẠM';
    return { participated: true, passed: isPassed };
};

export const isStudentAbsent = (record: StudentRecord): boolean => {
    const theory = getResultStatus(record['LÝ THUYẾT']);
    const simulation = getResultStatus(record['MÔ PHỎNG']);
    const practical = getResultStatus(record['SA HÌNH']);
    const onRoad = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
    return !theory.participated && !simulation.participated && !practical.participated && !onRoad.participated;
};

export const isStudentPassed = (record: StudentRecord): boolean => {
    if (isStudentAbsent(record)) return false;
    
    let noiDungThi = (record['NỘI DUNG THI'] || '').toString().trim().toUpperCase();
    noiDungThi = noiDungThi.replace(/Đ/g, 'D');

    if (noiDungThi.length === 0) return false;

    const requiredTestsPassed =
        (!noiDungThi.includes('L') || getResultStatus(record['LÝ THUYẾT']).passed) &&
        (!noiDungThi.includes('M') || getResultStatus(record['MÔ PHỎNG']).passed) &&
        (!noiDungThi.includes('H') || getResultStatus(record['SA HÌNH']).passed) &&
        (!noiDungThi.includes('D') || getResultStatus(record['ĐƯỜNG TRƯỜNG']).passed);
    
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
