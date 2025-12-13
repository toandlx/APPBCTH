
import type { StudentRecord, TrainingUnit } from '../types';

// Helper to check result status, handles empty/null values.
export const getResultStatus = (result: string | undefined | null): { participated: boolean, passed: boolean } => {
    const normalized = typeof result === 'string' ? result.trim().toUpperCase() : '';
    if (normalized === '' || normalized === 'VẮNG') return { participated: false, passed: false };
    return { participated: true, passed: normalized === 'ĐẠT' };
};

// Check if a student is considered absent (took no tests).
export const isStudentAbsent = (record: StudentRecord): boolean => {
    const theory = getResultStatus(record['LÝ THUYẾT']);
    const simulation = getResultStatus(record['MÔ PHỎNG']);
    const practical = getResultStatus(record['SA HÌNH']);
    const onRoad = getResultStatus(record['ĐƯỜNG TRƯỜNG']);
    return !theory.participated && !simulation.participated && !practical.participated && !onRoad.participated;
};

// Check if a student passed, based on their required tests.
export const isStudentPassed = (record: StudentRecord): boolean => {
    // An absent student cannot pass.
    if (isStudentAbsent(record)) {
        return false;
    }
    
    // Normalize input: convert to string, uppercase, and replace 'Đ' with 'D' for consistency
    // This supports "L+M+H+D", "LMHD", "L+M+H+Đ" formats.
    let noiDungThi = (record['NỘI DUNG THI'] || '').toString().trim().toUpperCase();
    noiDungThi = noiDungThi.replace(/Đ/g, 'D');

    if (noiDungThi.length === 0) return false; // Must have required tests to pass.

    // 'includes' works even if there are separators like +, -, or space (e.g., "L+M+H+D")
    const requiredTestsPassed =
        (!noiDungThi.includes('L') || getResultStatus(record['LÝ THUYẾT']).passed) &&
        (!noiDungThi.includes('M') || getResultStatus(record['MÔ PHỎNG']).passed) &&
        (!noiDungThi.includes('H') || getResultStatus(record['SA HÌNH']).passed) &&
        (!noiDungThi.includes('D') || getResultStatus(record['ĐƯỜNG TRƯỜNG']).passed);
    
    return requiredTestsPassed;
};

// Generate the summary string (Total: X, Class B: Y, ...)
export const generateClassSummaryString = (students: StudentRecord[]): string => {
    if (!students || students.length === 0) {
        return "Tổng số: 0";
    }
    const classCounts: { [key: string]: number } = {};
    for (const student of students) {
        const className = String(student['HẠNG GPLX'] || 'Khác').trim();
        classCounts[className] = (classCounts[className] || 0) + 1;
    }
    
    const sortedClasses = Object.keys(classCounts).sort();
    
    const parts = sortedClasses.map(className => `Hạng ${className}: ${classCounts[className]}`);
    
    return `Tổng số: ${students.length}\u00A0\u00A0\u00A0\u00A0${parts.join('; ')}`;
};

// Generate the "Ghi chú" (Note) for a student.
export const generateGhiChu = (record: StudentRecord): string => {
    const maHocVien = (record['MÃ HỌC VIÊN'] || '').toString().trim();
    const isRetake = maHocVien.startsWith('2721') || maHocVien.startsWith('2722');
    
    // Also normalize 'Đ' -> 'D' for display in notes if needed, 
    // though usually we display what was entered or a cleaner version.
    let testsTaken = (record['NỘI DUNG THI'] || '').toString().trim().toUpperCase();
    testsTaken = testsTaken.replace(/Đ/g, 'D');

    if (isRetake) {
        return `Thi lại nội dung: ${testsTaken}`;
    }
    return `Thi lần đầu`;
};

// Identify training unit based on student ID
// NOTE: `units` MUST be provided to this function now, we removed the sync storage call.
export const identifyTrainingUnit = (studentId: string | number | undefined, units: TrainingUnit[] = []): string => {
    if (!studentId) return '';
    const sId = studentId.toString().trim();
    
    // Find the matching unit. We assume the student ID starts with the unit code.
    // Sort units by code length desc to match specific sub-units first if overlap exists (e.g. 12 vs 123)
    const sortedUnits = [...units].sort((a, b) => b.code.length - a.code.length);
    
    const matchedUnit = sortedUnits.find(u => sId.startsWith(u.code));
    
    return matchedUnit ? matchedUnit.name : '';
};
