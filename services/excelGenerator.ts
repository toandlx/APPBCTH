
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, TrainingUnit, SavedSession } from '../types';
import { toVietnameseWords } from './vietnameseNumberToWords';
import { generateClassSummaryString, generateGhiChu, identifyTrainingUnit, isStudentAbsent, isStudentPassed, getResultStatus } from './reportUtils';

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
    licensing: 115000, // Cập nhật thành 115.000
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
    reportMetadata: ReportMetadata,
    studentRecords: StudentRecord[] | null = null
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
        merges.push({ s: { r: headerR, c: 3 }, e: { r: headerR + 1, c: 5 } });
        merges.push({ s: { r: headerR, c: 6 }, e: { r: headerR + 1, c: 8 } });
        merges.push({ s: { r: headerR, c: 9 }, e: { r: headerR + 1, c: 11 } });
        merges.push({ s: { r: headerR, c: 12 }, e: { r: headerR + 1, c: 14 } });
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

    // --- 5. COMMENTS & FEE SUMMARY ---
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

    // --- III. PHÍ VÀ LỆ PHÍ ---
    R++;
    ws[`A${R + 1}`] = { v: 'III. Tổng hợp số thu phí sát hạch và lệ phí cấp GPLX:', s: { font: { sz: 12, bold: true } } };
    merges.push({ s: { r: R, c: 0 }, e: { r: R, c: 15 } });
    R++;

    const feeHeaders = ['TT', 'Nội dung', 'Số lượng', 'Số tiền/1 thí sinh', 'Thành tiền'];
    feeHeaders.forEach((h, C) => { 
        ws[XLSX.utils.encode_cell({ r: R, c: C })] = { v: h, s: s.tableHeader }; 
    });
    R++;

    // Dữ liệu tính phí (Phần II thực tế sử dụng grandTotal đã được fix logic participated)
    let qdCountL = 0, qdCountM = 0, qdCountH = 0, qdCountD = 0;
    if (studentRecords) {
        studentRecords.forEach(record => {
            const nd = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
            if (nd.includes('L')) qdCountL++;
            if (nd.includes('M')) qdCountM++;
            if (nd.includes('H')) qdCountH++;
            if (nd.includes('D')) qdCountD++;
        });
    } else {
        qdCountL = qdCountM = qdCountH = qdCountD = grandTotal.totalApplications;
    }

    const qdTheory = qdCountL * FEE_RATES.theory;
    const qdSim = qdCountM * FEE_RATES.simulation;
    const qdField = qdCountH * FEE_RATES.practicalCourse;
    const qdRoad = qdCountD * FEE_RATES.onRoad;
    const qdTotal = qdTheory + qdSim + qdField + qdRoad;

    const realTheory = grandTotal.theory.total * FEE_RATES.theory;
    const realSim = grandTotal.simulation.total * FEE_RATES.simulation;
    const realField = grandTotal.practicalCourse.total * FEE_RATES.practicalCourse;
    const realRoad = grandTotal.onRoad.total * FEE_RATES.onRoad;
    const realTotal = realTheory + realSim + realField + realRoad;

    const licensingTotal = grandTotal.finalPass * FEE_RATES.licensing;

    const feeRows = [
        [{v: 'I', s: {...s.totalRow, font: {bold:true, color:{rgb:"FF0000"}}}}, {v: 'Phí Sát hạch lái xe theo Quyết định', s: {...s.totalRow, alignment:{horizontal:'left'}, font:{bold:true, color:{rgb:"FF0000"}}}}, null, null, null],
        [{v: '1', s: s.cell}, {v: 'Lý thuyết', s: s.cell_left}, {v: qdCountL, s: s.cell}, {v: FEE_RATES.theory, s: s.cell_right}, {v: qdTheory, s: s.cell_right}],
        [{v: '2', s: s.cell}, {v: 'Mô phỏng các tình huống giao thông', s: s.cell_left}, {v: qdCountM, s: s.cell}, {v: FEE_RATES.simulation, s: s.cell_right}, {v: qdSim, s: s.cell_right}],
        [{v: '3', s: s.cell}, {v: 'Thực hành trong hình', s: s.cell_left}, {v: qdCountH, s: s.cell}, {v: FEE_RATES.practicalCourse, s: s.cell_right}, {v: qdField, s: s.cell_right}],
        [{v: '4', s: s.cell}, {v: 'Thực hành trên đường giao thông', s: s.cell_left}, {v: qdCountD, s: s.cell}, {v: FEE_RATES.onRoad, s: s.cell_right}, {v: qdRoad, s: s.cell_right}],
        [null, {v: 'Tổng (I)', s: {...s.cell_right, font:{bold:true, italic:true}}}, null, null, {v: qdTotal, s: s.totalRow}],

        [{v: 'II', s: {...s.totalRow, font: {bold:true, color:{rgb:"FF0000"}}}}, {v: 'Phí sát hạch thực tế thí sinh tham dự', s: {...s.totalRow, alignment:{horizontal:'left'}, font:{bold:true, color:{rgb:"FF0000"}}}}, null, null, null],
        [{v: '1', s: s.cell}, {v: 'Lý thuyết', s: s.cell_left}, {v: grandTotal.theory.total, s: s.cell}, {v: FEE_RATES.theory, s: s.cell_right}, {v: realTheory, s: s.cell_right}],
        [{v: '2', s: s.cell}, {v: 'Mô phỏng các tình huống giao thông', s: s.cell_left}, {v: grandTotal.simulation.total, s: s.cell}, {v: FEE_RATES.simulation, s: s.cell_right}, {v: realSim, s: s.cell_right}],
        [{v: '3', s: s.cell}, {v: 'Thực hành trong hình', s: s.cell_left}, {v: grandTotal.practicalCourse.total, s: s.cell}, {v: FEE_RATES.practicalCourse, s: s.cell_right}, {v: realField, s: s.cell_right}],
        [{v: '4', s: s.cell}, {v: 'Thực hành trên đường giao thông', s: s.cell_left}, {v: grandTotal.onRoad.total, s: s.cell}, {v: FEE_RATES.onRoad, s: s.cell_right}, {v: realRoad, s: s.cell_right}],
        [null, {v: 'Tổng (II)', s: {...s.cell_right, font:{bold:true, italic:true}}}, null, null, {v: realTotal, s: s.totalRow}],

        [{v: 'III', s: s.totalRow}, {v: 'Lệ phí cấp GPLX', s: s.totalRow}, {v: grandTotal.finalPass, s: s.cell}, {v: FEE_RATES.licensing, s: s.cell_right}, {v: licensingTotal, s: s.cell_right}],
        [{v: 'IV', s: s.totalRow}, {v: 'Tổng cộng (II + III)', s: s.totalRow}, null, null, {v: realTotal + licensingTotal, s: s.grandTotalRow}],
        [null, {v: 'Tổng cộng (I + III)', s: s.totalRow}, null, null, {v: qdTotal + licensingTotal, s: s.grandTotalRow}],
        [{v: 'Bằng chữ (II+III):', s: s.bold}, {v: toVietnameseWords(realTotal + licensingTotal), s: { font: { italic: true } }}]
    ];

    feeRows.forEach((row, rowIndex) => {
        row.forEach((cell, C) => { if(cell) ws[XLSX.utils.encode_cell({ r: R, c: C })] = cell; });
        const v = row[1]?.v;
        if (row[1] && typeof v === 'string' && (v.includes('Phí Sát hạch') || v.includes('Tổng cộng (II + III)') || v.includes('Tổng cộng (I + III)'))) {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 3 } });
        } else if (row[1] && (v === 'Tổng (I)' || v === 'Tổng (II)')) {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 3 } });
        } else if (row[0] && row[0].v === 'Bằng chữ (II+III):') {
            merges.push({ s: { r: R, c: 1 }, e: { r: R, c: 4 } });
        }
        R++;
    });

    // --- FINAL SETUP ---
    ws['!merges'] = merges;
    ws['!cols'] = [
        { wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 18 }
    ];

    const range = { s: { c: 0, r: 0 }, e: { c: 15, r: R } };
    ws['!ref'] = XLSX.utils.encode_range(range);

    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTongHop");
    
    const fileName = `Bien_Ban_Tong_Hop_${formatDateForFilename(reportDate)}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
    XLSX.utils.book_append_sheet(wb, ws, "ThongKeDonVi");
    XLSX.writeFile(wb, `Thong_Ke_Don_Vi_${formatDateForFilename(reportDate)}.xlsx`);
};

export const exportMasterListToExcel = (students: StudentRecord[], units: TrainingUnit[], reportDate: Date) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(students);
    XLSX.utils.book_append_sheet(wb, ws, "TongHopChiTiet");
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
    
    rows.push([
        "", "TỔNG CỘNG", "", 
        totals.applications, 
        totals.theory, 
        totals.simulation, 
        totals.practical, 
        totals.road
    ]);

    const ws = XLSX.utils.aoa_to_sheet([[title], [], headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, "BaoCaoTongHop");
    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${formatDateForFilename(new Date())}.xlsx`);
};
