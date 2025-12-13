
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata } from '../types';
import { toVietnameseWords } from './vietnameseNumberToWords';
import { generateClassSummaryString, generateGhiChu } from './reportUtils';

// This tells TypeScript that the XLSX global variable exists,
// since it's loaded from a script tag in index.html.
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
    licensing: 135000,
};

// --- STYLING DEFINITIONS ---
const s = { // s for styles
    header: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    header_left: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    header_right: { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    title: { font: { sz: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    subtitle: { font: { sz: 14, bold: true }, alignment: { horizontal: 'center', vertical: 'center' } },
    date: { alignment: { horizontal: 'right' }, font: { italic: true } },
    bold: { font: { bold: true } },
    wrapText: { alignment: { wrapText: true, vertical: 'top' } },
    attendee: { alignment: { vertical: 'top' } },
    tableHeader: {
        font: { bold: true, color: { rgb: "000000" } },
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
        fill: { fgColor: { rgb: "FDEAA8" } }, // Yellowish color
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
        alignment: { horizontal: 'center', vertical: 'center' }
    },
    currency: { numFmt: "#,##0" }
};


// Function to export the main summary report
export const exportGeneralReportToExcel = (
    summaryData: AppData,
    grandTotal: LicenseClassData | null,
    reportDate: Date,
    reportMetadata: ReportMetadata
) => {
    if (!grandTotal) return;

    const wb = XLSX.utils.book_new();
    const ws = {}; // working sheet
    let R = 0; // current row tracker

    const merges: any[] = [];

    // --- 1. HEADER ---
    ws['A1'] = { v: 'CÔNG AN TỈNH BẮC NINH', s: s.header };
    ws['J1'] = { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: s.header };
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
    merges.push({ s: { r: 0, c: 9 }, e: { r: 0, c: 15 } });
    
    ws['A2'] = { v: 'PHÒNG CSGT', s: s.header };
    ws['J2'] = { v: 'Độc lập - Tự do - Hạnh phúc', s: s.header };
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 3 } });
    merges.push({ s: { r: 1, c: 9 }, e: { r: 1, c: 15 } });
    R = 2;
    
    R++;
    ws[`J${R + 1}`] = { v: `Bắc Ninh, ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`, s: s.date };
    merges.push({ s: { r: R, c: 9 }, e: { r: R, c: 15 } });
    R++;

    R += 2;
    ws[`A${R + 1}`] = { v: 'BIÊN BẢN', s: s.title };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    ws[`A${R + 1}`] = { v: 'TỔNG HỢP KẾT QUẢ KỲ SÁT HẠCH LÁI XE Ô TÔ', s: s.subtitle };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    
    // --- 2. MEETING MINUTES ---
    R += 2;
    const formattedDateForMeeting = `Ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`;
    ws[`A${R + 1}`] = { v: `${formattedDateForMeeting}, vào hồi ${reportMetadata.meetingTime}, tại ${reportMetadata.meetingLocation}. Hội đồng sát hạch lái xe cho ${grandTotal.totalApplications} học viên của ${reportMetadata.organizer}, đã họp toàn thể để xét công nhận kết quả kỳ sát hạch.`, s: s.wrapText };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    R++;
    ws[`A${R + 1}`] = { v: 'Thành phần gồm có:', s: s.bold };
    R++;
    reportMetadata.attendees.forEach((attendee, index) => {
        ws[`A${R + 1}`] = { v: `${index + 1}. ${attendee.name}`, s: s.attendee };
        ws[`E${R + 1}`] = { v: `- ${attendee.role}`, s: s.attendee };
        merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 3 } });
        merges.push({ s: { r: R, c: 4 }, e: { r: R, c: 15 } });
        R++;
    });

    // --- 3. SUMMARY & RESULTS ---
    R++;
    ws[`A${R + 1}`] = { v: 'NỘI DUNG CUỘC HỌP', s: s.title };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    const absent = grandTotal.totalApplications - grandTotal.totalParticipants;
    ws[`A${R + 1}`] = { v: 'I. Thông qua kết quả kỳ sát hạch:', s: { font: { sz: 12, bold: true } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    ws[`B${R + 1}`] = { v: `1. Tổng số hồ sơ đăng ký dự thi: ${grandTotal.totalApplications} hồ sơ` };
    merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 15 } });
    R++;
    ws[`B${R + 1}`] = { v: `Tổng số thí sinh dự thi: ${grandTotal.totalParticipants} thí sinh; Vắng không dự thi: ${absent > 0 ? absent : 0} thí sinh (có danh sách kèm theo)` };
    merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 15 } });
    R++;
    ws[`B${R + 1}`] = { v: '2. Kết quả:' };
    R++;

    // --- 4. RESULTS TABLES ---
    const addResultsTable = (title: string, data: LicenseClassData[], isRetake: boolean) => {
        R++;
        ws[`B${R + 1}`] = { v: title, s: s.bold };
        R++;

        // Table Header
        const header1 = ["Hạng GPLX", "Tổng số hồ sơ", "Tổng số dự thi", "Thi lý thuyết", null, null, "Mô phỏng các tình huống giao thông", null, null, "Thực hành trong hình", null, null, "Thực hành trên đường giao thông", null, null, "Kết quả đạt"];
        const header2 = [null, null, null, "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", "T.số", "Đạt", "Trượt", null];
        
        let headerR = R;
        header1.forEach((h, C) => { if (h) ws[XLSX.utils.encode_cell({ r: headerR, c: C })] = { v: h, s: s.tableHeader } });
        header2.forEach((h, C) => { if (h) ws[XLSX.utils.encode_cell({ r: headerR + 1, c: C })] = { v: h, s: s.tableHeader } });

        merges.push({ s: { r: headerR, c: 0 }, e: { r: headerR + 1, c: 0 } });
        merges.push({ s: { r: headerR, c: 1 }, e: { r: headerR + 1, c: 1 } });
        merges.push({ s: { r: headerR, c: 2 }, e: { r: headerR + 1, c: 2 } });
        merges.push({ s: { r: headerR, c: 3 }, e: { r: headerR, c: 5 } });
        merges.push({ s: { r: headerR, c: 6 }, e: { r: headerR, c: 8 } });
        merges.push({ s: { r: headerR, c: 9 }, e: { r: headerR, c: 11 } });
        merges.push({ s: { r: headerR, c: 12 }, e: { r: headerR, c: 14 } });
        merges.push({ s: { r: headerR, c: 15 }, e: { r: headerR + 1, c: 15 } });
        R += 2;

        // Table Body
        const tableData = data.map(row => [
            { v: row.class, s: { ...s.cell, ...s.bold } }, { v: row.totalApplications, s: s.cell }, { v: row.totalParticipants, s: s.cell },
            { v: row.theory.total, s: s.cell }, { v: row.theory.pass, s: s.cell }, { v: row.theory.fail, s: s.cell },
            { v: row.simulation.total, s: s.cell }, { v: row.simulation.pass, s: s.cell }, { v: row.simulation.fail, s: s.cell },
            { v: row.practicalCourse.total, s: s.cell }, { v: row.practicalCourse.pass, s: s.cell }, { v: row.practicalCourse.fail, s: s.cell },
            { v: row.onRoad.total, s: s.cell }, { v: row.onRoad.pass, s: s.cell }, { v: row.onRoad.fail, s: s.cell },
            { v: row.finalPass, s: { ...s.cell, ...s.bold } },
        ]);
        tableData.forEach(row => {
            row.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
            R++;
        });

        // Table Footer (Total Row)
        const totalRow = data.reduce((acc, row) => {
            acc.totalApplications += row.totalApplications; acc.totalParticipants += row.totalParticipants;
            acc.theory.total += row.theory.total; acc.theory.pass += row.theory.pass; acc.theory.fail += row.theory.fail;
            acc.simulation.total += row.simulation.total; acc.simulation.pass += row.simulation.pass; acc.simulation.fail += row.simulation.fail;
            acc.practicalCourse.total += row.practicalCourse.total; acc.practicalCourse.pass += row.practicalCourse.pass; acc.practicalCourse.fail += row.practicalCourse.fail;
            acc.onRoad.total += row.onRoad.total; acc.onRoad.pass += row.onRoad.pass; acc.onRoad.fail += row.onRoad.fail;
            acc.finalPass += row.finalPass;
            return acc;
        }, { totalApplications: 0, totalParticipants: 0, theory: { total: 0, pass: 0, fail: 0 }, simulation: { total: 0, pass: 0, fail: 0 }, practicalCourse: { total: 0, pass: 0, fail: 0 }, onRoad: { total: 0, pass: 0, fail: 0 }, finalPass: 0 });

        const totalRowData = [
            { v: 'Cộng', s: s.totalRow }, { v: totalRow.totalApplications, s: s.totalRow }, { v: totalRow.totalParticipants, s: s.totalRow },
            { v: totalRow.theory.total, s: s.totalRow }, { v: totalRow.theory.pass, s: s.totalRow }, { v: totalRow.theory.fail, s: s.totalRow },
            { v: totalRow.simulation.total, s: s.totalRow }, { v: totalRow.simulation.pass, s: s.totalRow }, { v: totalRow.simulation.fail, s: s.totalRow },
            { v: totalRow.practicalCourse.total, s: s.totalRow }, { v: totalRow.practicalCourse.pass, s: s.totalRow }, { v: totalRow.practicalCourse.fail, s: s.totalRow },
            { v: totalRow.onRoad.total, s: s.totalRow }, { v: totalRow.onRoad.pass, s: s.totalRow }, { v: totalRow.onRoad.fail, s: s.totalRow },
            { v: totalRow.finalPass, s: s.totalRow },
        ];
        totalRowData.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
        R++;
        
        if (isRetake) {
            const grandTotalData = [
                { v: 'Tổng a+b', s: s.grandTotalRow }, { v: grandTotal.totalApplications, s: s.grandTotalRow }, { v: grandTotal.totalParticipants, s: s.grandTotalRow },
                { v: grandTotal.theory.total, s: s.grandTotalRow }, { v: grandTotal.theory.pass, s: s.grandTotalRow }, { v: grandTotal.theory.fail, s: s.grandTotalRow },
                { v: grandTotal.simulation.total, s: s.grandTotalRow }, { v: grandTotal.simulation.pass, s: s.grandTotalRow }, { v: grandTotal.simulation.fail, s: s.grandTotalRow },
                { v: grandTotal.practicalCourse.total, s: s.grandTotalRow }, { v: grandTotal.practicalCourse.pass, s: s.grandTotalRow }, { v: grandTotal.practicalCourse.fail, s: s.grandTotalRow },
                { v: grandTotal.onRoad.total, s: s.grandTotalRow }, { v: grandTotal.onRoad.pass, s: s.grandTotalRow }, { v: grandTotal.onRoad.fail, s: s.grandTotalRow },
                { v: grandTotal.finalPass, s: s.grandTotalRow },
            ];
            grandTotalData.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
            R++;
        }
    }

    addResultsTable(summaryData.firstTime.title, summaryData.firstTime.rows, false);
    addResultsTable(summaryData.retake.title, summaryData.retake.rows, true);

    // --- 5. FEE SUMMARY & COMMENTS ---
    R++;
    const passRate = grandTotal.totalParticipants > 0 ? (grandTotal.finalPass / grandTotal.totalParticipants) * 100 : 0;
    const theoryPassRate = grandTotal.theory.total > 0 ? (grandTotal.theory.pass / grandTotal.theory.total) * 100 : 0;
    const simulationPassRate = grandTotal.simulation.total > 0 ? (grandTotal.simulation.pass / grandTotal.simulation.total) * 100 : 0;
    const practicalCoursePassRate = grandTotal.practicalCourse.total > 0 ? (grandTotal.practicalCourse.pass / grandTotal.practicalCourse.total) * 100 : 0;
    const onRoadPassRate = grandTotal.onRoad.total > 0 ? (grandTotal.onRoad.pass / grandTotal.onRoad.total) * 100 : 0;
    
    ws[`A${R + 1}`] = { v: `Như vậy tổng số thí sinh trúng tuyển được đề nghị cấp GPLX là: ${grandTotal.finalPass} thí sinh; Đạt tỷ lệ: ${passRate.toFixed(2)}%` };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    ws[`A${R + 1}`] = { v: `(Trong đó thi lý thuyết là: ${theoryPassRate.toFixed(2)}%; thi mô phỏng là: ${simulationPassRate.toFixed(2)}%; thi thực hành trong hình là: ${practicalCoursePassRate.toFixed(2)}%; thi thực hành trên đường là: ${onRoadPassRate.toFixed(2)}%)` };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    R++;
    ws[`A${R + 1}`] = { v: 'II. Nhận xét kỳ sát hạch:', s: { font: { sz: 12, bold: true } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    const comments = [
        '- Kỳ thi được thực hiện đúng quy chế và nghiêm túc, không có trường hợp nào giám khảo và thí sinh vi phạm nội quy, quy chế thi.',
        '- Đội ngũ cán bộ sát hạch có trình độ và nghiệp vụ, trong quá trình tổ chức thi thực hiện đúng chức trách;',
        '- Cơ sở vật chất kỹ thuật phục vụ kỳ thi chuẩn bị tốt, cán bộ cơ sở chu đáo, nhiệt tình.',
        '- Giữa Hội đồng, CS Đào tạo và TT Sát hạch có sự phối hợp chặt chẽ thực hiện kỳ thi đảm bảo an toàn.',
    ];
    if (reportMetadata.technicalErrorSBD) {
        comments.push(`- Xét lỗi kỹ thuật: SBD : ${reportMetadata.technicalErrorSBD}`);
    }
    comments.forEach(comment => {
        ws[`B${R + 1}`] = { v: comment, s: s.wrapText };
        merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 15 } });
        R++;
    });

    // Fee Table
    R++;
    ws[`A${R + 1}`] = { v: 'III. Tổng hợp số thu phí sát hạch và lệ phí cấp GPLX:', s: { font: { sz: 12, bold: true } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;
    const feeHeaders = ['STT', 'Nội Dung', null, 'Số Lượng', 'Mỗi Thí Sinh Nộp', 'Thành Tiền'];
    feeHeaders.forEach((h, C) => { if (h) ws[XLSX.utils.encode_cell({ r: R, c: [0, 1, 3, 4, 5][C] })] = { v: h, s: s.tableHeader }; });
    merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 2 } });
    R++;

    const theoryTotalFee = grandTotal.theory.total * FEE_RATES.theory;
    const simulationTotalFee = grandTotal.simulation.total * FEE_RATES.simulation;
    const practicalCourseTotalFee = grandTotal.practicalCourse.total * FEE_RATES.practicalCourse;
    const onRoadTotalFee = grandTotal.onRoad.total * FEE_RATES.onRoad;
    const licensingTotalFee = grandTotal.finalPass * FEE_RATES.licensing;
    const totalExaminationFee = theoryTotalFee + simulationTotalFee + practicalCourseTotalFee + onRoadTotalFee;
    const grandTotalFee = totalExaminationFee + licensingTotalFee;

    const feeData = [
        [{v: 'I', s: s.totalRow}, {v: 'Phí Sát Hạch Lái Xe', s: {...s.totalRow, alignment: { horizontal: 'left' }}}, null, null, null, {v: totalExaminationFee, s: {...s.totalRow, ...s.cell_right}}],
        [{v: '1', s: s.cell}, {v: 'Lý Thuyết', s: s.cell_left}, null, {v: grandTotal.theory.total, s: s.cell}, {v: FEE_RATES.theory, s: s.cell_right}, {v: theoryTotalFee, s: s.cell_right}],
        [{v: '2', s: s.cell}, {v: 'Mô phỏng các tình huống giao thông', s: s.cell_left}, null, {v: grandTotal.simulation.total, s: s.cell}, {v: FEE_RATES.simulation, s: s.cell_right}, {v: simulationTotalFee, s: s.cell_right}],
        [{v: '3', s: s.cell}, {v: 'Thực hành trong hình', s: s.cell_left}, null, {v: grandTotal.practicalCourse.total, s: s.cell}, {v: FEE_RATES.practicalCourse, s: s.cell_right}, {v: practicalCourseTotalFee, s: s.cell_right}],
        [{v: '4', s: s.cell}, {v: 'Thực hành trên đường giao thông', s: s.cell_left}, null, {v: grandTotal.onRoad.total, s: s.cell}, {v: FEE_RATES.onRoad, s: s.cell_right}, {v: onRoadTotalFee, s: s.cell_right}],
        [{v: 'II', s: s.totalRow}, {v: 'Lệ phí cấp Giấy phép lái xe', s: {...s.totalRow, alignment: { horizontal: 'left' }}}, null, {v: grandTotal.finalPass, s: s.totalRow}, {v: FEE_RATES.licensing, s: {...s.totalRow, ...s.cell_right}}, {v: licensingTotalFee, s: {...s.totalRow, ...s.cell_right}}],
        [null, {v: 'Tổng phí sát hạch (I+II)', s: s.totalRow}, null, null, null, {v: grandTotalFee, s: {...s.totalRow, ...s.cell_right}}],
        [{v: 'Bằng Chữ:', s: s.bold}, {v: toVietnameseWords(grandTotalFee), s: { font: { italic: true } }}]
    ];
    feeData.forEach(row => {
        const C_MAP = [0, 1, 1, 3, 4, 5];
        row.forEach((cell, cIdx) => { if(cell) ws[XLSX.utils.encode_cell({ r: R, c: C_MAP[cIdx] })] = cell });
        // Merges for this row
        if (row[1] && row[1].v === 'Phí Sát Hạch Lái Xe' || row[1].v === 'Lệ phí cấp Giấy phép lái xe') {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 2 } });
        } else if (row[1] && row[1].v === 'Tổng phí sát hạch (I+II)') {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 4 } });
        } else if(row[0] && row[0].v === 'Bằng Chữ:') {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 5 } });
        } else {
             merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 2 } });
        }
        R++;
    });

    // --- FINAL SETUP ---
    ws['!merges'] = merges;
    // Tweak column widths for better readability
    ws['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 12 }, // A-C
        { wch: 8 }, { wch: 8 }, { wch: 8 },   // D-F
        { wch: 8 }, { wch: 8 }, { wch: 8 },   // G-I
        { wch: 8 }, { wch: 8 }, { wch: 8 },   // J-L
        { wch: 8 }, { wch: 8 }, { wch: 8 },   // M-O
        { wch: 12 }                          // P
    ];
    // Specific widths for fee table (overrides previous settings for these columns)
    ws['!cols'][1] = { wch: 35 }; // Col B for 'Nội Dung'
    ws['!cols'][4] = { wch: 15 }; // Col E for 'Mỗi Thí Sinh Nộp'
    ws['!cols'][5] = { wch: 15 }; // Col F for 'Thành Tiền'

    const range = { s: { c: 0, r: 0 }, e: { c: 15, r: R } };
    ws['!ref'] = XLSX.utils.encode_range(range);

    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTongHop");
    
    const fileName = `Bien_Ban_Tong_Hop_${formatDateForFilename(reportDate)}.xlsx`;
    XLSX.writeFile(wb, fileName);
};


const formatDateForCell = (date: string | number | undefined) => {
    if (!date) return '';
    if (typeof date === 'number') { 
         const excelEpoch = new Date(Date.UTC(1899, 11, 30));
         const dateObj = new Date(excelEpoch.getTime() + date * 86400000);
         return dateObj.toLocaleDateString('vi-VN');
    }
    const parsedDate = new Date(date);
    return parsedDate.toLocaleDateString('vi-VN') !== 'Invalid Date' ? parsedDate.toLocaleDateString('vi-VN') : String(date);
}

// Function to export student lists (Passed, Failed, Absent) with full report formatting
export const exportStudentListToExcel = (
    students: StudentRecord[],
    baseName: string,
    reportDate: Date
) => {
    const wb = XLSX.utils.book_new();
    const ws = {};
    let R = 0;
    const merges: any[] = [];

    const isPassedList = baseName.includes('Dat');
    const isAbsentList = baseName.includes('Vang');
    const title = isPassedList 
        ? "DANH SÁCH THÍ SINH ĐẠT SÁT HẠCH LÁI XE Ô TÔ" 
        : (isAbsentList ? "DANH SÁCH THÍ SINH VẮNG SÁT HẠCH LÁI XE Ô TÔ" : "DANH SÁCH THÍ SINH TRƯỢT SÁT HẠCH LÁI XE Ô TÔ");
    
    const numCols = isPassedList ? 7 : 11;

    // --- 1. HEADER ---
    ws['A1'] = { v: 'CÔNG AN TỈNH BẮC NINH', s: s.header_left };
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });
    ws[XLSX.utils.encode_cell({ r: 0, c: numCols - 3 })] = { v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: s.header_right };
    merges.push({ s: { r: 0, c: numCols - 3 }, e: { r: 0, c: numCols - 1 } });

    ws['A2'] = { v: 'PHÒNG CẢNH SÁT GIAO THÔNG', s: s.header_left };
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });
    ws[XLSX.utils.encode_cell({ r: 1, c: numCols - 3 })] = { v: 'Độc lập - Tự do - Hạnh phúc', s: s.header_right };
    merges.push({ s: { r: 1, c: numCols - 3 }, e: { r: 1, c: numCols - 1 } });
    R = 2;

    // --- 2. TITLE ---
    R += 2;
    ws[`A${R + 1}`] = { v: title, s: { ...s.subtitle, font: { ...s.subtitle.font, sz: 13 } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: numCols - 1 } });
    R++;
    ws[`A${R + 1}`] = { v: '(Tại Trung tâm đào tạo và sát hạch lái xe Đông Đô)', s: { alignment: { horizontal: 'center' } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: numCols - 1 } });
    R++;
    
    // --- 3. SUB-HEADER ---
    R++;
    const detailedClassSummary = generateClassSummaryString(students);

    ws[`A${R + 1}`] = { v: `Khóa thi: ${reportDate.toLocaleDateString('vi-VN')}` };
    const midCol = Math.floor((numCols-1) / 2);
    ws[XLSX.utils.encode_cell({r: R, c: midCol + 1})] = { v: `Ngày sát hạch: ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`, s: { alignment: { horizontal: 'right'} } };
    merges.push({ s: { r: R, c: midCol + 1 }, e: { r: R, c: numCols - 1 } });
    R++;
    ws[`A${R + 1}`] = { v: detailedClassSummary, s: { font: { bold: true } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: numCols - 1 } });
    R++;
    R++;

    // --- 4. TABLE ---
    const headerRow = R;
    if (isPassedList) {
        const headers = ['SBD', 'Họ và tên', 'Ngày sinh', 'Số CCCD', 'Nơi cư trú', 'Hạng GPLX', 'Ghi chú'];
        headers.forEach((h, C) => {
            ws[XLSX.utils.encode_cell({ r: headerRow, c: C })] = { v: h, s: s.tableHeader };
        });
        R++;
        // Data rows for passed
        students.forEach((student, index) => {
            const rowData = [
                { v: student['SỐ BÁO DANH'], s: s.cell },
                { v: student['HỌ VÀ TÊN'], s: s.cell_left }, // UPDATED KEY
                { v: formatDateForCell(student['NGÀY SINH']), s: s.cell }, // UPDATED KEY
                { v: student['SỐ CHỨNG MINH'], s: s.cell }, // UPDATED KEY
                { v: student['NƠI CƯ TRÚ'], s: s.cell_left }, // UPDATED KEY
                { v: student['HẠNG GPLX'], s: s.cell },
                { v: generateGhiChu(student), s: s.cell_left }
            ];
            rowData.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R + index, c: C })] = cell; });
        });
        R += students.length;

    } else { // Failed or Absent
        const headers1 = ['SBD', 'Họ và tên', 'Ngày sinh', 'Số Căn Cước', 'Nơi cư trú', 'Hạng', 'Nội dung thi sát hạch', null, null, null, 'Ghi chú'];
        const headers2 = [null, null, null, null, null, null, 'L', 'M', 'H', 'Đ', null];
        
        headers1.forEach((h, C) => { if(h) ws[XLSX.utils.encode_cell({ r: headerRow, c: C })] = { v: h, s: s.tableHeader }; });
        headers2.forEach((h, C) => { if(h) ws[XLSX.utils.encode_cell({ r: headerRow + 1, c: C })] = { v: h, s: s.tableHeader }; });
        
        // Merges for header
        merges.push({ s: { r: headerRow, c: 0 }, e: { r: headerRow + 1, c: 0 } }); // SBD
        merges.push({ s: { r: headerRow, c: 1 }, e: { r: headerRow + 1, c: 1 } }); // Ho ten
        merges.push({ s: { r: headerRow, c: 2 }, e: { r: headerRow + 1, c: 2 } }); // Ngay sinh
        merges.push({ s: { r: headerRow, c: 3 }, e: { r: headerRow + 1, c: 3 } }); // CCCD
        merges.push({ s: { r: headerRow, c: 4 }, e: { r: headerRow + 1, c: 4 } }); // Noi cu tru
        merges.push({ s: { r: headerRow, c: 5 }, e: { r: headerRow + 1, c: 5 } }); // Hang
        merges.push({ s: { r: headerRow, c: 6 }, e: { r: headerRow, c: 9 } });     // Noi dung thi
        merges.push({ s: { r: headerRow, c: 10 }, e: { r: headerRow + 1, c: 10 } });// Ghi chu
        R += 2;

        // Data rows for failed/absent
        students.forEach((student, index) => {
            const rowData = [
                { v: student['SỐ BÁO DANH'], s: s.cell },
                { v: student['HỌ VÀ TÊN'], s: s.cell_left }, // UPDATED KEY
                { v: formatDateForCell(student['NGÀY SINH']), s: s.cell }, // UPDATED KEY
                { v: student['SỐ CHỨNG MINH'], s: s.cell }, // UPDATED KEY
                { v: student['NƠI CƯ TRÚ'], s: s.cell_left }, // UPDATED KEY
                { v: student['HẠNG GPLX'], s: s.cell },
                { v: isAbsentList ? 'Vắng' : (student['LÝ THUYẾT'] || ''), s: s.cell },
                { v: isAbsentList ? 'Vắng' : (student['MÔ PHỎNG'] || ''), s: s.cell },
                { v: isAbsentList ? 'Vắng' : (student['SA HÌNH'] || ''), s: s.cell },
                { v: isAbsentList ? 'Vắng' : (student['ĐƯỜNG TRƯỜNG'] || ''), s: s.cell },
                { v: '', s: s.cell } // Ghi chu is empty
            ];
            rowData.forEach((cell, C) => { ws[XLSX.utils.encode_cell({ r: R + index, c: C })] = cell; });
        });
        R += students.length;
    }

    // --- FINAL SETUP ---
    ws['!merges'] = merges;

    // Column widths
    if (isPassedList) {
        ws['!cols'] = [ { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 20 } ];
    } else {
        ws['!cols'] = [ { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 } ];
    }
    
    const range = { s: { c: 0, r: 0 }, e: { c: numCols - 1, r: R } };
    ws['!ref'] = XLSX.utils.encode_range(range);

    XLSX.utils.book_append_sheet(wb, ws, baseName);
    const fileName = `${baseName}_${formatDateForFilename(reportDate)}.xlsx`;
    XLSX.writeFile(wb, fileName);
};
