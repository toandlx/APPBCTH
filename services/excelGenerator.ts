
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, TrainingUnit, SavedSession } from '../types';
import { toVietnameseWords } from './vietnameseNumberToWords';
import { getResultStatus } from './reportUtils';

declare const XLSX: any;

const formatDateForFilename = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

const FEE_RATES = {
    theory: 100000,
    simulation: 100000,
    practicalCourse: 350000,
    onRoad: 80000,
    licensing: 115000,
};

const s = {
    header: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    title: { font: { sz: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    subtitle: { font: { sz: 14, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    date: { alignment: { horizontal: 'right' }, font: { italic: true } },
    bold: { font: { bold: true } },
    wrapText: { alignment: { wrapText: true, vertical: 'top' } },
    tableHeader: {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: "D9D9D9" } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    },
    cell: {
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    },
    cell_left: {
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'left', vertical: 'center' }
    },
    cell_right: {
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        numFmt: "#,##0"
    },
    totalRow: {
        font: { bold: true },
        fill: { fgColor: { rgb: "D9D9D9" } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    },
    grandTotalRow: {
        font: { bold: true },
        fill: { fgColor: { rgb: "FDEAA8" } },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    }
};

export const exportGeneralReportToExcel = (
    summaryData: AppData,
    grandTotal: LicenseClassData | null,
    reportDate: Date,
    reportMetadata: ReportMetadata,
    studentRecords: StudentRecord[] | null = null
) => {
    if (!grandTotal) return;

    const wb = XLSX.utils.book_new();
    const ws = {};
    let R = 0;
    const merges: any[] = [];

    // Header Section
    ws['A1'] = { v: 'CÔNG AN TỈNH BẮC NINH', s: s.header };
    ws['J1'] = { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: s.header };
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
    merges.push({ s: { r: 0, c: 9 }, e: { r: 0, c: 15 } });
    
    ws['A2'] = { v: 'PHÒNG CSGT', s: s.header };
    ws['J2'] = { v: 'Độc lập - Tự do - Hạnh phúc', s: s.header };
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });
    merges.push({ s: { r: 1, c: 9 }, e: { r: 1, c: 15 } });
    R = 3;
    
    ws[`J${R + 1}`] = { v: `Bắc Ninh, ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`, s: s.date };
    merges.push({ s: { r: R, c: 9 }, e: { r: R, c: 15 } });
    R += 2;

    ws[`A${R + 1}`] = { v: 'BIÊN BẢN', s: s.title };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    ws[`A${R + 1}`] = { v: 'TỔNG HỢP KẾT QUẢ KỲ SÁT HẠCH LÁI XE Ô TÔ', s: s.subtitle };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R += 2;

    // Meeting Minutes Section
    ws[`A${R + 1}`] = { v: `Ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}, vào hồi ${reportMetadata.meetingTime}, tại ${reportMetadata.meetingLocation}...`, s: s.wrapText };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R += 2;

    const addResultsTable = (title: string, data: LicenseClassData[], isRetake: boolean) => {
        ws[`B${R + 1}`] = { v: title, s: s.bold };
        R++;

        const header1 = ["Hạng GPLX", "Tổng số hồ sơ", "Tổng số dự thi", "Thi lý thuyết", null, null, "Mô phỏng các tình huống", null, null, "Thực hành trong hình", null, null, "Thực hành trên đường", null, null, "Kết quả đạt"];
        const header2 = [null, null, null, "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", null];
        
        header1.forEach((h, C) => { if (h) ws[XLSX.utils.encode_cell({ r: R, c: C })] = { v: h, s: s.tableHeader } });
        header2.forEach((h, C) => { if (h) ws[XLSX.utils.encode_cell({ r: R + 1, c: C })] = { v: h, s: s.tableHeader } });

        // FIX Merges for Table Header
        merges.push({ s: { r: R, c: 0 }, e: { r: R + 1, c: 0 } });
        merges.push({ s: { r: R, c: 1 }, e: { r: R + 1, c: 1 } });
        merges.push({ s: { r: R, c: 2 }, e: { r: R + 1, c: 2 } });
        merges.push({ s: { r: R, c: 3 }, e: { r: R, c: 5 } }); // Thi lý thuyết
        merges.push({ s: { r: R, c: 6 }, e: { r: R, c: 8 } }); // Mô phỏng
        merges.push({ s: { r: R, c: 9 }, e: { r: R, c: 11 } }); // Sa hình
        merges.push({ s: { r: R, c: 12 }, e: { r: R, c: 14 } }); // Đường trường
        merges.push({ s: { r: R, c: 15 }, e: { r: R + 1, c: 15 } }); // Kết quả đạt
        R += 2;

        data.forEach(row => {
            const cells = [
                { v: row.class, s: { ...s.cell, ...s.bold } }, { v: row.totalApplications, s: s.cell }, { v: row.totalParticipants, s: s.cell },
                { v: row.theory.total, s: s.cell }, { v: row.theory.pass, s: s.cell }, { v: row.theory.fail, s: s.cell },
                { v: row.simulation.total, s: s.cell }, { v: row.simulation.pass, s: s.cell }, { v: row.simulation.fail, s: s.cell },
                { v: row.practicalCourse.total, s: s.cell }, { v: row.practicalCourse.pass, s: s.cell }, { v: row.practicalCourse.fail, s: s.cell },
                { v: row.onRoad.total, s: s.cell }, { v: row.onRoad.pass, s: s.cell }, { v: row.onRoad.fail, s: s.cell },
                { v: row.finalPass, s: { ...s.cell, ...s.bold } }
            ];
            cells.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
            R++;
        });

        // Add "Cộng" row
        const sum = data.reduce((acc, row) => ({
            apps: acc.apps + row.totalApplications,
            parts: acc.parts + row.totalParticipants,
            lt: { t: acc.lt.t + row.theory.total, p: acc.lt.p + row.theory.pass, f: acc.lt.f + row.theory.fail },
            mp: { t: acc.mp.t + row.simulation.total, p: acc.mp.p + row.simulation.pass, f: acc.mp.f + row.simulation.fail },
            sh: { t: acc.sh.t + row.practicalCourse.total, p: acc.sh.p + row.practicalCourse.pass, f: acc.sh.f + row.practicalCourse.fail },
            dt: { t: acc.dt.t + row.onRoad.total, p: acc.dt.p + row.onRoad.pass, f: acc.dt.f + row.onRoad.fail },
            dat: acc.dat + row.finalPass
        }), { apps: 0, parts: 0, lt: { t: 0, p: 0, f: 0 }, mp: { t: 0, p: 0, f: 0 }, sh: { t: 0, p: 0, f: 0 }, dt: { t: 0, p: 0, f: 0 }, dat: 0 });

        const sumCells = [
            { v: 'Cộng', s: s.totalRow }, { v: sum.apps, s: s.totalRow }, { v: sum.parts, s: s.totalRow },
            { v: sum.lt.t, s: s.totalRow }, { v: sum.lt.p, s: s.totalRow }, { v: sum.lt.f, s: s.totalRow },
            { v: sum.mp.t, s: s.totalRow }, { v: sum.mp.p, s: s.totalRow }, { v: sum.mp.f, s: s.totalRow },
            { v: sum.sh.t, s: s.totalRow }, { v: sum.sh.p, s: s.totalRow }, { v: sum.sh.f, s: s.totalRow },
            { v: sum.dt.t, s: s.totalRow }, { v: sum.dt.p, s: s.totalRow }, { v: sum.dt.f, s: s.totalRow },
            { v: sum.dat, s: s.totalRow }
        ];
        sumCells.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
        R++;

        if (isRetake && grandTotal) {
            const gtCells = [
                { v: 'Tổng a+b', s: s.grandTotalRow }, { v: grandTotal.totalApplications, s: s.grandTotalRow }, { v: grandTotal.totalParticipants, s: s.grandTotalRow },
                { v: grandTotal.theory.total, s: s.grandTotalRow }, { v: grandTotal.theory.pass, s: s.grandTotalRow }, { v: grandTotal.theory.fail, s: s.grandTotalRow },
                { v: grandTotal.simulation.total, s: s.grandTotalRow }, { v: grandTotal.simulation.pass, s: s.grandTotalRow }, { v: grandTotal.simulation.fail, s: s.grandTotalRow },
                { v: grandTotal.practicalCourse.total, s: s.grandTotalRow }, { v: grandTotal.practicalCourse.pass, s: s.grandTotalRow }, { v: grandTotal.practicalCourse.fail, s: s.grandTotalRow },
                { v: grandTotal.onRoad.total, s: s.grandTotalRow }, { v: grandTotal.onRoad.pass, s: s.grandTotalRow }, { v: grandTotal.onRoad.fail, s: s.grandTotalRow },
                { v: grandTotal.finalPass, s: s.grandTotalRow }
            ];
            gtCells.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
            R++;
        }
        R++;
    };

    addResultsTable(summaryData.firstTime.title, summaryData.firstTime.rows, false);
    addResultsTable(summaryData.retake.title, summaryData.retake.rows, true);

    // Section III: Fees
    ws[`A${R + 1}`] = { v: 'III. Tổng hợp số thu phí sát hạch và lệ phí cấp GPLX:', s: s.bold };
    R++;

    let qdCountL = 0, qdCountM = 0, qdCountH = 0, qdCountD = 0;
    let realCountL = 0, realCountM = 0, realCountH = 0, realCountD = 0;

    if (studentRecords) {
        studentRecords.forEach(record => {
            const nd = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
            if (nd.includes('L')) qdCountL++;
            if (nd.includes('M')) qdCountM++;
            if (nd.includes('H')) qdCountH++;
            if (nd.includes('D')) qdCountD++;

            if (getResultStatus(record['LÝ THUYẾT']).participated) realCountL++;
            if (getResultStatus(record['MÔ PHỎNG']).participated) realCountM++;
            if (getResultStatus(record['SA HÌNH']).participated) realCountH++;
            if (getResultStatus(record['ĐƯỜNG TRƯỜNG']).participated) realCountD++;
        });
    }

    const qdTotal = (qdCountL * FEE_RATES.theory) + (qdCountM * FEE_RATES.simulation) + (qdCountH * FEE_RATES.practicalCourse) + (qdCountD * FEE_RATES.onRoad);
    const realTotal = (realCountL * FEE_RATES.theory) + (realCountM * FEE_RATES.simulation) + (realCountH * FEE_RATES.practicalCourse) + (realCountD * FEE_RATES.onRoad);
    const licensingTotal = grandTotal.finalPass * FEE_RATES.licensing;

    const feeRows = [
        ['I', 'Phí Sát hạch lái xe theo Quyết định', null, null, qdTotal],
        ['1', 'Lý thuyết', qdCountL, FEE_RATES.theory, qdCountL * FEE_RATES.theory],
        ['2', 'Mô phỏng', qdCountM, FEE_RATES.simulation, qdCountM * FEE_RATES.simulation],
        ['3', 'Sa hình', qdCountH, FEE_RATES.practicalCourse, qdCountH * FEE_RATES.practicalCourse],
        ['4', 'Đường trường', qdCountD, FEE_RATES.onRoad, qdCountD * FEE_RATES.onRoad],
        ['II', 'Phí sát hạch thực tế thí sinh tham dự', null, null, realTotal],
        ['1', 'Lý thuyết', realCountL, FEE_RATES.theory, realCountL * FEE_RATES.theory],
        ['2', 'Mô phỏng', realCountM, FEE_RATES.simulation, realCountM * FEE_RATES.simulation],
        ['3', 'Sa hình', realCountH, FEE_RATES.practicalCourse, realCountH * FEE_RATES.practicalCourse],
        ['4', 'Đường trường', realCountD, FEE_RATES.onRoad, realCountD * FEE_RATES.onRoad],
        ['III', 'Lệ phí cấp GPLX', grandTotal.finalPass, FEE_RATES.licensing, licensingTotal],
        ['IV', 'Tổng cộng (II + III)', null, null, realTotal + licensingTotal],
        [null, 'Tổng cộng (I + III)', null, null, qdTotal + licensingTotal],
        ['Bằng chữ (II+III):', toVietnameseWords(realTotal + licensingTotal), null, null, null]
    ];

    feeRows.forEach(row => {
        const isHeader = typeof row[0] === 'string' && ['I', 'II', 'III', 'IV'].includes(row[0]);
        const cells = [
            { v: row[0], s: isHeader ? s.totalRow : s.cell },
            { v: row[1], s: isHeader ? { ...s.totalRow, alignment: { horizontal: 'left' } } : s.cell_left },
            { v: row[2], s: s.cell },
            { v: row[3], s: s.cell_right },
            { v: row[4], s: isHeader ? s.grandTotalRow : s.cell_right }
        ];
        cells.forEach((cell, C) => { if (cell.v !== null) ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
        if (isHeader || row[0] === 'Bằng chữ (II+III):') merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 3 } });
        R++;
    });

    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: 15, r: R } });

    XLSX.utils.book_append_sheet(wb, ws, "BaoCao");
    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${formatDateForFilename(reportDate)}.xlsx`);
};

export const exportStudentListToExcel = (students: StudentRecord[], filename: string, reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(students);
    XLSX.utils.book_append_sheet(wb, ws, "DanhSach");
    XLSX.writeFile(wb, `${filename}_${formatDateForFilename(reportDate)}.xlsx`);
};

export const exportUnitStatisticsToExcel = (students: StudentRecord[], units: TrainingUnit[], reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(students);
    XLSX.utils.book_append_sheet(wb, ws, "ThongKe");
    XLSX.writeFile(wb, `Thong_Ke_Don_Vi_${formatDateForFilename(reportDate)}.xlsx`);
};

export const exportMasterListToExcel = (students: StudentRecord[], units: TrainingUnit[], reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(students);
    XLSX.utils.book_append_sheet(wb, ws, "ChiTiet");
    XLSX.writeFile(wb, `Tong_Hop_Chi_Tiet_${formatDateForFilename(reportDate)}.xlsx`);
};

export const exportAggregateReportToExcel = (data: SavedSession[], totals: any, title: string) => {
    const wb = XLSX.utils.book_new();
    const headers = ["STT", "Kỳ sát hạch", "Ngày", "Hồ sơ", "Lý thuyết", "Mô phỏng", "Sa hình", "Đường trường"];
    const rows = data.map((s, idx) => [
        idx + 1,
        s.name,
        new Date(s.reportDate).toLocaleDateString('vi-VN'),
        s.grandTotal.totalApplications,
        s.grandTotal.theory.total,
        s.grandTotal.simulation.total,
        s.grandTotal.practicalCourse.total,
        s.grandTotal.onRoad.total
    ]);
    const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "TongHop");
    XLSX.writeFile(wb, `Bao_Cao_Luy_Ke_${formatDateForFilename(new Date())}.xlsx`);
};
