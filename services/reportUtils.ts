import type { StudentRecord, TrainingUnit, SavedSession, ConflictWarning } from '../types';

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

export const checkHistoricalConflicts = (
    currentRecords: StudentRecord[],
    history: SavedSession[]
): ConflictWarning[] => {
    const warnings: ConflictWarning[] = [];
    
    // 1. Lưu các môn đã ĐẠT theo từng học viên
    const passedMap = new Map<string, Map<string, { session: string, date: string }>>();
    // 2. Lưu BỘ KHUNG nội dung thi lần đầu tiên xuất hiện
    const firstContentMap = new Map<string, { parts: Set<string>, session: string, date: string }>();

    // Sắp xếp lịch sử theo thời gian từ cũ nhất để xác định "Lần đầu" chuẩn xác
    const sortedHistory = [...history].sort((a, b) => 
        new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

    sortedHistory.forEach(session => {
        session.studentRecords.forEach(record => {
            const sid = String(record['MÃ HỌC VIÊN'] || '').trim();
            if (!sid) return;

            const sessionDate = new Date(session.reportDate).toLocaleDateString('vi-VN');

            // Ghi nhận BỘ KHUNG nội dung thi lần đầu tiên (Mốc khởi đầu)
            if (!firstContentMap.has(sid)) {
                const contentStr = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
                const parts = new Set<string>();
                ['L', 'M', 'H', 'D'].forEach(p => {
                    if (contentStr.includes(p)) parts.add(p);
                });

                firstContentMap.set(sid, {
                    parts,
                    session: session.name,
                    date: sessionDate
                });
            }

            // Ghi nhận tất cả các kết quả ĐẠT trong quá khứ
            if (!passedMap.has(sid)) passedMap.set(sid, new Map());
            const studentPassed = passedMap.get(sid)!;
            if (getResultStatus(record['LÝ THUYẾT']).passed) studentPassed.set('L', { session: session.name, date: sessionDate });
            if (getResultStatus(record['MÔ PHỎNG']).passed) studentPassed.set('M', { session: session.name, date: sessionDate });
            if (getResultStatus(record['SA HÌNH']).passed) studentPassed.set('H', { session: session.name, date: sessionDate });
            if (getResultStatus(record['ĐƯỜNG TRƯỜNG']).passed) studentPassed.set('D', { session: session.name, date: sessionDate });
        });
    });

    // 3. Thực hiện đối soát dữ liệu hiện tại
    currentRecords.forEach(record => {
        const sid = String(record['MÃ HỌC VIÊN'] || '').trim();
        const currentContent = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
        
        const firstAppearance = firstContentMap.get(sid);
        const historyPassed = passedMap.get(sid);

        ['L', 'M', 'H', 'D'].forEach(partCode => {
            if (currentContent.includes(partCode)) {
                
                // KIỂM TRA 1: Nếu môn này đã ĐẠT rồi thì KHÔNG được phép thi lại
                if (historyPassed && historyPassed.has(partCode)) {
                    const prev = historyPassed.get(partCode)!;
                    warnings.push({
                        studentName: record['HỌ VÀ TÊN'],
                        studentId: sid,
                        conflictPart: `Sai phạm: Đăng ký thi lại môn đã ĐẠT (${getPartName(partCode)})`,
                        previousSessionName: prev.session,
                        previousDate: prev.date
                    });
                    return; // Nếu đã báo lỗi thi lại môn đạt thì không cần báo lỗi bộ khung
                }

                // KIỂM TRA 2: Môn này có nằm trong BỘ KHUNG GỐC không?
                if (firstAppearance) {
                    // Nếu môn đăng ký hiện tại không nằm trong danh sách đăng ký lần đầu
                    if (!firstAppearance.parts.has(partCode)) {
                        warnings.push({
                            studentName: record['HỌ VÀ TÊN'],
                            studentId: sid,
                            conflictPart: `Nghịch lý: Môn ${getPartName(partCode)} không thuộc nội dung thi lần đầu (${Array.from(firstAppearance.parts).map(getPartName).join(', ')})`,
                            previousSessionName: firstAppearance.session,
                            previousDate: firstAppearance.date
                        });
                    }
                }
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