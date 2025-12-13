import React, { useMemo } from 'react';
import type { LicenseClassData, ReportMetadata } from '../../types';
import { toVietnameseWords } from '../../services/vietnameseNumberToWords';

interface FeeSummaryReportProps {
    grandTotal: LicenseClassData | null;
    reportMetadata: ReportMetadata;
}

const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN');
};

const FEE_RATES = {
    theory: 100000,
    simulation: 100000,
    practicalCourse: 350000,
    onRoad: 80000,
    licensing: 135000,
};

export const FeeSummaryReport: React.FC<FeeSummaryReportProps> = ({ grandTotal, reportMetadata }) => {
    const feeData = useMemo(() => {
        if (!grandTotal) return null;

        const theoryTotal = grandTotal.theory.total * FEE_RATES.theory;
        const simulationTotal = grandTotal.simulation.total * FEE_RATES.simulation;
        const practicalCourseTotal = grandTotal.practicalCourse.total * FEE_RATES.practicalCourse;
        const onRoadTotal = grandTotal.onRoad.total * FEE_RATES.onRoad;
        const licensingTotal = grandTotal.finalPass * FEE_RATES.licensing;

        const totalExaminationFee = theoryTotal + simulationTotal + practicalCourseTotal + onRoadTotal;
        const grandTotalFee = totalExaminationFee + licensingTotal;

        return {
            theory: { count: grandTotal.theory.total, total: theoryTotal },
            simulation: { count: grandTotal.simulation.total, total: simulationTotal },
            practicalCourse: { count: grandTotal.practicalCourse.total, total: practicalCourseTotal },
            onRoad: { count: grandTotal.onRoad.total, total: onRoadTotal },
            licensing: { count: grandTotal.finalPass, total: licensingTotal },
            totalExaminationFee,
            grandTotalFee,
        };
    }, [grandTotal]);

    if (!grandTotal || !feeData) {
        return null;
    }

    const passRate = grandTotal.totalApplications > 0 ? (grandTotal.finalPass / grandTotal.totalApplications) * 100 : 0;
    const theoryPassRate = grandTotal.theory.total > 0 ? (grandTotal.theory.pass / grandTotal.theory.total) * 100 : 0;
    const simulationPassRate = grandTotal.simulation.total > 0 ? (grandTotal.simulation.pass / grandTotal.simulation.total) * 100 : 0;
    const practicalCoursePassRate = grandTotal.practicalCourse.total > 0 ? (grandTotal.practicalCourse.pass / grandTotal.practicalCourse.total) * 100 : 0;
    const onRoadPassRate = grandTotal.onRoad.total > 0 ? (grandTotal.onRoad.pass / grandTotal.onRoad.total) * 100 : 0;

    const tableCellStyle = "p-2 border border-black text-center text-sm";
    const tableHeaderCellStyle = `${tableCellStyle} font-bold`;
    const sectionCellStyle = `${tableCellStyle} font-bold text-left`;
    const totalRowCellStyle = `${tableCellStyle} font-bold`;

    return (
        <section className="mt-8 text-sm sm:text-base">
            <div className="space-y-1">
                <p>
                    Như vậy tổng số thí sinh trúng tuyển được đề nghị cấp GPLX là: <strong>{grandTotal.finalPass}</strong> thí sinh; Đạt tỷ lệ: <strong>{passRate.toFixed(2)}%</strong>
                </p>
                <p className="pl-4">
                    (Trong đó thi lý thuyết là: {theoryPassRate.toFixed(2)}%; thi mô phỏng là: {simulationPassRate.toFixed(2)}%; thi thực hành trong hình là: {practicalCoursePassRate.toFixed(2)}%; thi thực hành trên đường là: {onRoadPassRate.toFixed(2)}%)
                </p>
            </div>
            <div className="mt-4">
                <h3 className="font-bold">II. Nhận xét kỳ sát hạch:</h3>
                <ul className="list-inside mt-2 space-y-1 pl-4">
                    <li>- Kỳ thi được thực hiện đúng quy chế và nghiêm túc, không có trường hợp nào giám khảo và thí sinh vi phạm nội quy, quy chế thi.</li>
                    <li>- Đội ngũ cán bộ sát hạch có trình độ và nghiệp vụ, trong quá trình tổ chức thi thực hiện đúng chức trách;</li>
                    <li>- Cơ sở vật chất kỹ thuật phục vụ kỳ thi chuẩn bị tốt, cán bộ cơ sở chu đáo, nhiệt tình.</li>
                    <li>- Giữa Hội đồng, CS Đào tạo và TT Sát hạch có sự phối hợp chặt chẽ thực hiện kỳ thi đảm bảo an toàn.</li>
                    {reportMetadata.technicalErrorSBD && (
                        <li>- Xét lỗi kỹ thuật: SBD : {reportMetadata.technicalErrorSBD}</li>
                    )}
                </ul>
            </div>

            <div className="mt-4">
                 <h3 className="font-bold">III. Tổng hợp số thu phí sát hạch và lệ phí cấp GPLX:</h3>
                 <table className="w-full border-collapse border border-black mt-2">
                    <thead>
                        <tr>
                            <th className={tableHeaderCellStyle}>STT</th>
                            <th className={tableHeaderCellStyle}>Nội Dung</th>
                            <th className={tableHeaderCellStyle}>Số Lượng</th>
                            <th className={tableHeaderCellStyle}>Mỗi Thí Sinh Nộp</th>
                            <th className={tableHeaderCellStyle}>Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className={`${sectionCellStyle} text-center` }>I</td>
                            <td className={sectionCellStyle}>Phí Sát Hạch Lái Xe</td>
                            <td className={tableCellStyle}></td>
                            <td className={tableCellStyle}></td>
                            <td className={`${totalRowCellStyle} text-right pr-4`}>{formatCurrency(feeData.totalExaminationFee)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>1</td>
                            <td className={`${tableCellStyle} text-left`}>Lý Thuyết</td>
                            <td className={tableCellStyle}>{feeData.theory.count}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(FEE_RATES.theory)}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(feeData.theory.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>2</td>
                            <td className={`${tableCellStyle} text-left`}>Mô phỏng các tình huống giao thông</td>
                            <td className={tableCellStyle}>{feeData.simulation.count}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(FEE_RATES.simulation)}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(feeData.simulation.total)}</td>
                        </tr>
                         <tr>
                            <td className={tableCellStyle}>3</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trong hình</td>
                            <td className={tableCellStyle}>{feeData.practicalCourse.count}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(FEE_RATES.practicalCourse)}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(feeData.practicalCourse.total)}</td>
                        </tr>
                        <tr>
                            <td className={tableCellStyle}>4</td>
                            <td className={`${tableCellStyle} text-left`}>Thực hành trên đường giao thông</td>
                            <td className={tableCellStyle}>{feeData.onRoad.count}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(FEE_RATES.onRoad)}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(feeData.onRoad.total)}</td>
                        </tr>
                         <tr>
                            <td className={`${sectionCellStyle} text-center`}>II</td>
                            <td className={sectionCellStyle}>Lệ phí cấp Giấy phép lái xe</td>
                            <td className={tableCellStyle}>{feeData.licensing.count}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(FEE_RATES.licensing)}</td>
                            <td className={`${tableCellStyle} text-right pr-4`}>{formatCurrency(feeData.licensing.total)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className={`${totalRowCellStyle} text-center`}>Tổng phí sát hạch (I+II)</td>
                            <td className={`${totalRowCellStyle} text-right pr-4`}>{formatCurrency(feeData.grandTotalFee)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className={`${tableCellStyle} text-left`}>
                                <strong>Bằng Chữ:</strong> {toVietnameseWords(feeData.grandTotalFee)}
                            </td>
                        </tr>
                    </tbody>
                 </table>
            </div>
        </section>
    );
};