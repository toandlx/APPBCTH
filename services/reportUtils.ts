import type { StudentRecord, TrainingUnit } from '../types';

export const getResultStatus = (result: string | number | undefined | null): { participated: boolean, passed: boolean } => {
    if (result === undefined || result === null) return { participated: false, passed: false };
    const normalized = result.toString().trim().toUpperCase();
    if (normalized === '' || normalized === 'VẮNG' || normalized === 'V') return { participated: false, passed: false };
    const isPassed = normalized === 'ĐẠT' || normalized === 'PASSED' || normalized === 'P' || normalized === '1';
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

    // Kiểm tra tất cả các phần thi bắt buộc có trong cột NỘI DUNG THI
    const requiredTestsPassed =
        (!noiDungThi.includes('L') || getResultStatus(record['LÝ THUYẾT']).passed) &&
        (!noiDungThi.includes('M') || getResultStatus(record['MÔ PHỎNG']).passed) &&
        (!noiDungThi.includes('H') || getResultStatus(record['SA HÌNH']).passed) &&
        (!noiDungThi.includes('D') || getResultStatus(record['ĐƯỜNG TRƯỜNG']).passed);
    
    return requiredTestsPassed;
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
    const isRetake = maHocVien.startsWith('2721') || maHocVien.startsWith('2722');
    
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
