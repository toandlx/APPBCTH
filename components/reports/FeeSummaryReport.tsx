
import React, { useMemo } from 'react';
import type { LicenseClassData, ReportMetadata, StudentRecord } from '../../types';
import { toVietnameseWords } from '../../services/vietnameseNumberToWords';
import { getResultStatus } from '../../services/reportUtils';

interface FeeSummaryReportProps {
    grandTotal: LicenseClassData | null;
    reportMetadata: ReportMetadata;
    studentRecords: StudentRecord[] | null;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN');
};

const FEE_RATES = {
    theory: 100000,
    simulation: 100000,
    practicalCourse: 350000,
    onRoad: 80000,
    licensing: 115000, // Cập nhật từ 135.000 thành 115.000
};

export const FeeSummaryReport: React.FC<FeeSummaryReportProps> = ({ grandTotal, reportMetadata, studentRecords }) => {
    const feeData = useMemo(() => {
        if (!grandTotal || !studentRecords) return null;

        // I. Phí sát hạch theo Quyết định (Tính trên cột NỘI DUNG THI)
        let qdCountL = 0, qdCountM = 0, qdCountH = 0, qdCountD = 0;

        // II. Phí sát hạch thực tế (Tính trên thực tế có dự thi - không vắng)
        let realCountL = 0, realCountM = 0, realCountH = 0, realCountD = 0;

        studentRecords.forEach(record => {
            // Logic Quyết định
            const nd = String(record['NỘI DUNG THI'] || '').toUpperCase().replace(/Đ/g, 'D');
            if (nd.includes('L')) qdCountL++;
            if (nd.includes('M')) qdCountM++;
            if (nd.includes('H')) qdCountH++;
            if (nd.includes('D')) qdCountD++;

            // Logic Thực tế
            if (getResultStatus(record['LÝ THUYẾT']).participated) realCountL++;
            if (getResultStatus(record['MÔ PHỎNG']).participated) realCountM++;
            if (getResultStatus(record['SA HÌNH']).participated) realCountH++;
            if (getResultStatus(record['ĐƯỜNG TRƯỜNG']).participated) realCountD++;
        });

        const qdTheory = qdCountL * FEE_RATES.theory;
        const qdSim = qdCountM * FEE_RATES.simulation;
        const qdField = qdCountH * FEE_RATES.practicalCourse;
        const qdRoad = qdCountD * FEE_RATES.onRoad;
        const qdTotal = qdTheory + qdSim + qdField + qdRoad;

        const realTheory = realCountL * FEE_RATES.theory;
        const realSim = realCountM * FEE_RATES.simulation;
        const realField = realCountH * FEE_RATES.practicalCourse;
        const realRoad = realCountD * FEE_RATES.onRoad;
        const realTotal = realTheory + realSim + realField + realRoad;

        // III. Lệ phí cấp GPLX
        const licensingTotal = grandTotal.finalPass * FEE_RATES.licensing;

        return {
            qd: {
                theory: { count: qdCountL, total: qdTheory },
                sim: { count: qdCountM, total: qdSim },
                field: { count: qdCountH, total: qdField },
                road: { count: qdCountD, total: qdRoad },
                total: qdTotal
            },
            real: {
                theory: { count: realCountL, total: realTheory },
                sim: { count: realCountM, total: realSim },
                field: { count: realCountH, total: realField },
                road: { count: realCountD, total: realRoad },
                total: realTotal
            },
            licensing: { count: grandTotal.finalPass, total: licensingTotal },
            sumRealLicensing: realTotal + licensingTotal,
            sumQdLicensing: qdTotal + licensingTotal
        };
    }, [grandTotal, studentRecords]);

    if (!grandTotal || !feeData) {
        return null;
    }

    const passRate = grandTotal.totalParticipants > 0 ? (grandTotal.finalPass / grandTotal.totalParticipants) * 100 : 0;
    const theoryPassRate = grandTotal.theory.total > 0 ? (grandTotal.theory.pass / grandTotal.theory.total) * 100 : 0;
    const simulationPassRate = grandTotal.simulation.total > 0 ? (grandTotal.simulation.pass / grandTotal.simulation.total) * 100 : 0;
    const practicalCoursePassRate = grandTotal.practicalCourse.total > 0 ? (grandTotal.practicalCourse.pass / grandTotal.practicalCourse.total) * 100 : 0;
    const onRoadPassRate = grandTotal.onRoad.total > 0 ? (grandTotal.onRoad.pass / grandTotal.onRoad.total) * 100 : 0;

    const tableCellStyle = "p-1.5 border border-black text-center text-[13px]";
    const tableHeaderCellStyle = `${tableCellStyle} font-bold bg-gray-50`;
    const sectionCellStyle = `${tableCellStyle} font-bold text-left text-red-600`;
    const totalRowCellStyle = `${tableCellStyle} font-bold`;

    return (
        <section className="mt-8 text-sm sm:text-base leading-snug">
            <div className="space-y-1">
                <p>
                    Như vậy tổng số thí sinh trúng tuyển được đề nghị cấp GPLX là: <strong>{grandTotal.finalPass}</strong> thí sinh; Đạt tỷ lệ: <strong>{passRate.toFixed(2)}%</strong>
                </p>
                <p className="pl-4 italic text-gray-700">
                    (Trong đó thi lý thuyết là: {theoryPassRate.toFixed(2)}%; thi mô phỏng là: {simulationPassRate.toFixed(2)}%; thi thực hành trong hình là: {practicalCoursePassRate.toFixed(2)}%; thi thực hành trên đường là: {onRoadPassRate.toFixed(2)}%)
                </p>
            </div>
            
            <div className="mt-4">
                <h3 className="font-bold mb-2">II. Nhận xét kỳ sát hạch:</h3>
                <ul className="list-inside space-y-0.5 pl-4 text-[14px]">
                    <li>- Kỳ thi được thực hiện đúng quy chế và nghiêm túc, không có trường hợp nào giám khảo và thí sinh vi phạm nội quy, quy chế thi.</li>
                    <li>- Đội ngũ cán bộ sát hạch có trình độ và nghiệp vụ, trong quá trình tổ chức thi thực hiện đúng chức trách;</li>
                    <li>- Cơ sở vật chất kỹ thuật phục vụ kỳ thi chuẩn bị tốt, cán bộ cơ sở chu đáo, nhiệt tình.</li>
                    <li>- Giữa Hội đồng, CS Đào tạo và TT Sát hạch có sự phối hợp chặt chẽ thực hiện kỳ thi đảm bảo an toàn.</li>
                    {reportMetadata.technicalErrorSBD && (
                        <li className="font-bold text-blue-700">- Xét lỗi kỹ thuật: SBD : {reportMetadata.technicalErrorSBD}</li>
                    )}
                </ul>
            </div>

            <div className="mt-6">
                 <h3 className="font-bold uppercase mb-2">III. Tổng hợp số thu phí sát hạch và lệ phí cấp GPLX</h3>
                 <table className="w-full border-collapse border border-black">
                    <thead>
                        <tr>
                            <th className={tableHeaderCellStyle}>TT</th>
                            <th className={tableHeaderCellStyle}>Nội dung</th>
                            <th className={tableHeaderCellStyle}>Số lượng</th>
                            <th className={tableHeaderCellStyle}>Số tiền/1 thí sinh</th>
                            <th className={tableHeaderCellStyle}>Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* PHẦN I: PHÍ SÁT HẠCH THEO QUYẾT ĐỊNH */}
                        <tr>
                            <td className={`${tableCellStyle} font-bold text-red-600`}>I</td>
                            <td className={`${sectionCellStyle}`}>Phí Sát hạch lái xe theo Quyết định</td>
                            <td className={tableCellStyle}></td>
                            <td className={tableCellStyle}></td>
                            <td className={tableCellStyle}></td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>1</td>
                            <td className={`${tableCellStyle} text-left`}>Lý thuyết</td>
                            <td className={tableCellStyle}>{feeData.qd.theory.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.theory)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.qd.theory.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>2</td>
                            <td className={`${tableCellStyle} text-left`}>Mô phỏng các tình huống giao thông</td>
                            <td className={tableCellStyle}>{feeData.qd.sim.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.simulation)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.qd.sim.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>3</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trong hình</td>
                            <td className={tableCellStyle}>{feeData.qd.field.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.practicalCourse)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.qd.field.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>4</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trên đường giao thông</td>
                            <td className={tableCellStyle}>{feeData.qd.road.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.onRoad)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.qd.road.total)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className={`${tableCellStyle} font-bold text-right pr-4 italic`}>Tổng (I)</td>
                            <td className={`${totalRowCellStyle} text-right pr-2 bg-gray-50`}>{formatCurrency(feeData.qd.total)}</td>
                        </tr>

                        {/* PHẦN II: PHÍ SÁT HẠCH THỰC TẾ */}
                        <tr>
                            <td className={`${tableCellStyle} font-bold text-red-600`}>II</td>
                            <td className={`${sectionCellStyle}`}>Phí sát hạch thực tế thí sinh tham dự</td>
                            <td className={tableCellStyle}></td>
                            <td className={tableCellStyle}></td>
                            <td className={tableCellStyle}></td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>1</td>
                            <td className={`${tableCellStyle} text-left`}>Lý thuyết</td>
                            <td className={tableCellStyle}>{feeData.real.theory.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.theory)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.real.theory.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>2</td>
                            <td className={`${tableCellStyle} text-left`}>Mô phỏng các tình huống giao thông</td>
                            <td className={tableCellStyle}>{feeData.real.sim.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.simulation)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.real.sim.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>3</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trong hình</td>
                            <td className={tableCellStyle}>{feeData.real.field.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.practicalCourse)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.real.field.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>4</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trên đường giao thông</td>
                            <td className={tableCellStyle}>{feeData.real.road.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.onRoad)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.real.road.total)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className={`${tableCellStyle} font-bold text-right pr-4 italic`}>Tổng (II)</td>
                            <td className={`${totalRowCellStyle} text-right pr-2 bg-gray-50`}>{formatCurrency(feeData.real.total)}</td>
                        </tr>

                        {/* PHẦN III & IV */}
                        <tr>
                            <td className={`${tableCellStyle} font-bold`}>III</td>
                            <td className={`${tableCellStyle} text-left font-bold`}>Lệ phí cấp GPLX</td>
                            <td className={tableCellStyle}>{feeData.licensing.count}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(FEE_RATES.licensing)}</td>
                            <td className={`${tableCellStyle} text-right pr-2`}>{formatCurrency(feeData.licensing.total)}</td>
                        </tr>
                        <tr>
                            <td rowSpan={2} className={`${tableCellStyle} font-bold`}>IV</td>
                            <td colSpan={3} className={`${tableCellStyle} text-right pr-4 font-bold`}>Tổng cộng (II+ III)</td>
                            <td className={`${totalRowCellStyle} text-right pr-2 bg-yellow-50`}>{formatCurrency(feeData.sumRealLicensing)}</td>
                        </tr>
                        <tr>
                            <td colSpan={3} className={`${tableCellStyle} text-right pr-4 font-bold`}>Tổng cộng (I + III)</td>
                            <td className={`${totalRowCellStyle} text-right pr-2 bg-blue-50`}>{formatCurrency(feeData.sumQdLicensing)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className={`${tableCellStyle} text-left italic`}>
                                <strong>Bằng chữ (II + III):</strong> {toVietnameseWords(feeData.sumRealLicensing)}
                            </td>
                        </tr>
                    </tbody>
                 </table>
            </div>
        </section>
    );
};
