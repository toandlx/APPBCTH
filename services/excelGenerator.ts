
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, TrainingUnit, SavedSession } from '../types';
import { toVietnameseWords } from './vietnameseNumberToWords';
import { generateClassSummaryString, generateGhiChu, identifyTrainingUnit, isStudentAbsent, isStudentPassed, getResultStatus } from './reportUtils';

// This tells TypeScript that the XLSX global variable exists,
// since it's loaded from a script tag in index.html.
declare const XLSX: any;

/**
 * Formats a date object into a string suitable for filenames (dd-mm-yyyy).
 */
const formatDateForFilename = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Exports the general summary report to Excel.
 */
export const exportGeneralReportToExcel = (summaryData: AppData, grandTotal: LicenseClassData | null, reportDate: Date, reportMetadata: ReportMetadata) => {
    const wb = XLSX.utils.book_new();
    const rows: any[] = [];
    
    // Header information
    rows.push(["BIÊN BẢN TỔNG HỢP KẾT QUẢ KỲ SÁT HẠCH LÁI XE Ô TÔ"]);
    rows.push([`Ngày báo cáo: ${reportDate.toLocaleDateString('vi-VN')}`]);
    rows.push([`Địa điểm: ${reportMetadata.meetingLocation}`]);
    rows.push([]);

    const addTableRows = (tableData: any) => {
        rows.push([tableData.title]);
        rows.push([
            "Hạng GPLX", "Tổng hồ sơ", "Tổng dự thi", 
            "LT Tổng", "LT Đạt", "LT Trượt", 
            "MP Tổng", "MP Đạt", "MP Trượt", 
            "SH Tổng", "SH Đạt", "SH Trượt", 
            "ĐT Tổng", "ĐT Đạt", "ĐT Trượt", 
            "Kết quả đạt"
        ]);
        tableData.rows.forEach((r: LicenseClassData) => {
            rows.push([
                r.class, r.totalApplications, r.totalParticipants,
                r.theory.total, r.theory.pass, r.theory.fail,
                r.simulation.total, r.simulation.pass, r.simulation.fail,
                r.practicalCourse.total, r.practicalCourse.pass, r.practicalCourse.fail,
                r.onRoad.total, r.onRoad.pass, r.onRoad.fail,
                r.finalPass
            ]);
        });
        rows.push([]);
    };

    addTableRows(summaryData.firstTime);
    addTableRows(summaryData.retake);
    
    if (grandTotal) {
        rows.push(["TỔNG CỘNG a+b"]);
        rows.push([
            "Cộng", grandTotal.totalApplications, grandTotal.totalParticipants,
            grandTotal.theory.total, grandTotal.theory.pass, grandTotal.theory.fail,
            grandTotal.simulation.total, grandTotal.simulation.pass, grandTotal.simulation.fail,
            grandTotal.practicalCourse.total, grandTotal.practicalCourse.pass, grandTotal.practicalCourse.fail,
            grandTotal.onRoad.total, grandTotal.onRoad.pass, grandTotal.onRoad.fail,
            grandTotal.finalPass
        ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "TongHop");
    XLSX.writeFile(wb, `Bien_Ban_Chung_${formatDateForFilename(reportDate)}.xlsx`);
};

/**
 * Exports a specific student list (Passed/Failed/Absent) to Excel.
 */
export const exportStudentListToExcel = (students: StudentRecord[], filename: string, reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const data = students.map((s, idx) => ({
        'STT': idx + 1,
        'SBD': s['SỐ BÁO DANH'],
        'MÃ HỌC VIÊN': s['MÃ HỌC VIÊN'],
        'HỌ VÀ TÊN': s['HỌ VÀ TÊN'],
        'NGÀY SINH': s['NGÀY SINH'],
        'CCCD': s['SỐ CHỨNG MINH'],
        'HẠNG': s['HẠNG GPLX'],
        'LÝ THUYẾT': s['LÝ THUYẾT'],
        'MÔ PHỎNG': s['MÔ PHỎNG'],
        'SA HÌNH': s['SA HÌNH'],
        'ĐƯỜNG TRƯỜNG': s['ĐƯỜNG TRƯỜNG'],
        'GHI CHÚ': generateGhiChu(s)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach");
    XLSX.writeFile(wb, `${filename}_${formatDateForFilename(reportDate)}.xlsx`);
};

/**
 * Exports unit statistics to Excel.
 */
export const exportUnitStatisticsToExcel = (students: StudentRecord[], trainingUnits: TrainingUnit[], reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const stats: Record<string, any> = {};

    students.forEach(student => {
        const unitName = identifyTrainingUnit(student['MÃ HỌC VIÊN'], trainingUnits) || 'Khác';
        if (!stats[unitName]) {
            stats[unitName] = { total: 0, pass: 0, fail: 0, absent: 0 };
        }
        stats[unitName].total++;
        if (isStudentAbsent(student)) {
            stats[unitName].absent++;
        } else if (isStudentPassed(student)) {
            stats[unitName].pass++;
        } else {
            stats[unitName].fail++;
        }
    });

    const rows = Object.entries(stats).map(([name, s]) => ({
        'Đơn vị đào tạo': name,
        'Tổng số học viên': s.total,
        'Số lượng Đạt': s.pass,
        'Số lượng Trượt': s.fail,
        'Số lượng Vắng': s.absent,
        'Tỷ lệ Đạt (%)': s.total > 0 ? ((s.pass / s.total) * 100).toFixed(2) : "0"
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "ThongKeDonVi");
    XLSX.writeFile(wb, `Thong_Ke_Don_Vi_${formatDateForFilename(reportDate)}.xlsx`);
};

/**
 * Exports the master detailed student list to Excel.
 */
export const exportMasterListToExcel = (students: StudentRecord[], trainingUnits: TrainingUnit[], reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const data = students.map((s, idx) => ({
        'STT': idx + 1,
        'SBD': s['SỐ BÁO DANH'],
        'MÃ HỌC VIÊN': s['MÃ HỌC VIÊN'],
        'HỌ VÀ TÊN': s['HỌ VÀ TÊN'],
        'NGÀY SINH': s['NGÀY SINH'],
        'HẠNG': s['HẠNG GPLX'],
        'ĐƠN VỊ ĐÀO TẠO': identifyTrainingUnit(s['MÃ HỌC VIÊN'], trainingUnits),
        'LÝ THUYẾT': s['LÝ THUYẾT'],
        'MÔ PHỎNG': s['MÔ PHỎNG'],
        'SA HÌNH': s['SA HÌNH'],
        'ĐƯỜNG TRƯỜNG': s['ĐƯỜNG TRƯỜNG'],
        'KẾT QUẢ CHUNG': isStudentAbsent(s) ? 'VẮNG' : (isStudentPassed(s) ? 'ĐẠT' : 'TRƯỢT')
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "MasterList");
    XLSX.writeFile(wb, `Danh_Sach_Chi_Tiet_${formatDateForFilename(reportDate)}.xlsx`);
};

/**
 * Exports an aggregate report across multiple sessions to Excel.
 */
export const exportAggregateReportToExcel = (filteredData: SavedSession[], totals: any, title: string) => {
    const wb = XLSX.utils.book_new();
    const rows = filteredData.map((s, idx) => ({
        'STT': idx + 1,
        'Tên Kỳ Sát Hạch': s.name,
        'Ngày Báo Cáo': new Date(s.reportDate).toLocaleDateString('vi-VN'),
        'Tổng Hồ Sơ': s.grandTotal.totalApplications,
        'Tổng Dự Thi': s.grandTotal.totalParticipants,
        'Lượt Lý Thuyết': s.grandTotal.theory.total,
        'Lượt Mô Phỏng': s.grandTotal.simulation.total,
        'Lượt Sa Hình': s.grandTotal.practicalCourse.total,
        'Lượt Đường Trường': s.grandTotal.onRoad.total,
        'Tổng Đạt': s.grandTotal.finalPass
    }));
    
    // Add Summary row at the end
    rows.push({
        'STT': 'CỘNG',
        'Tên Kỳ Sát Hạch': title,
        'Ngày Báo Cáo': '',
        'Tổng Hồ Sơ': totals.applications,
        'Tổng Dự Thi': '',
        'Lượt Lý Thuyết': totals.theory,
        'Lượt Mô Phỏng': totals.simulation,
        'Lượt Sa Hình': totals.practical,
        'Lượt Đường Trường': totals.road,
        'Tổng Đạt': totals.pass
    } as any);

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTongHop");
    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${new Date().getTime()}.xlsx`);
};

/**
 * NEW/UPDATED: Export kết quả đối soát nội dung thi chuyên sâu.
 */
export const exportValidationResultsToExcel = (results: any[]) => {
    const wb = XLSX.utils.book_new();
    
    // Chuẩn bị dữ liệu: giữ nguyên các cột gốc và thêm cột trạng thái
    const excelData = results.map(r => {
        const { originalData, status, messages } = r;
        return {
            ...originalData,
            'TRẠNG THÁI': status === 'valid' ? 'Hợp lệ' : 'Cảnh báo trùng lịch sử',
            'CHI TIẾT CẢNH BÁO': messages.join('; ')
        };
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Tự động điều chỉnh độ rộng cột
    const wscols = [
        { wch: 10 }, // SBD
        { wch: 15 }, // MÃ HỌC VIÊN
        { wch: 25 }, // HỌ VÀ TÊN
        { wch: 15 }, // CCCD
        { wch: 12 }, // NGÀY SINH
        { wch: 20 }, // NƠI CƯ TRÚ
        { wch: 10 }, // HẠNG
        { wch: 15 }, // NỘI DUNG THI
        { wch: 18 }, // TRẠNG THÁI
        { wch: 60 }, // CHI TIẾT CẢNH BÁO
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "KetQuaDoiSoat");
    XLSX.writeFile(wb, `Ket_Qua_Kiem_Tra_Noi_Dung_${formatDateForFilename(new Date())}.xlsx`);
};
