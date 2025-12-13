import React, { useMemo } from 'react';
import type { StudentRecord } from '../../types';
import { generateClassSummaryString, generateGhiChu, identifyTrainingUnit } from '../../services/reportUtils';

interface StudentListReportProps {
    title: string;
    students: StudentRecord[];
    reportType: 'passed' | 'failed' | 'absent';
    reportDate: Date;
}

const tableHeaderCellStyle = "p-2 border border-black font-bold text-center text-sm";
const tableCellStyle = "p-2 border border-black text-center text-sm";

export const StudentListReport: React.FC<StudentListReportProps> = ({ title, students, reportType, reportDate }) => {
    
    const classSummary = useMemo(() => generateClassSummaryString(students), [students]);

    // Format date for display, handling Excel's numeric date format
    const formatDate = (date: string | number | undefined) => {
        if (!date) return '';
        if (typeof date === 'number') { 
             const excelEpoch = new Date(1899, 11, 30);
             const dateObj = new Date(excelEpoch.getTime() + date * 86400000);
             return dateObj.toLocaleDateString('vi-VN');
        }
        // Handle 'dd/mm/yyyy' strings or other formats
        return new Date(date).toLocaleDateString('vi-VN') !== 'Invalid Date' ? new Date(date).toLocaleDateString('vi-VN') : date;
    }

    const renderHeader = () => (
        <>
            <div className="grid grid-cols-2 text-center font-semibold mb-8">
                <div>
                    <h2 className="text-sm">CÔNG AN TỈNH BẮC NINH</h2>
                    <h3 className="text-sm">PHÒNG CẢNH SÁT GIAO THÔNG</h3>
                </div>
                <div>
                    <h2 className="text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                    <h3 className="text-sm font-bold">Độc lập - Tự do - Hạnh phúc</h3>
                </div>
            </div>
             <div className="text-center mt-4">
                <h1 className="text-lg font-bold">{title}</h1>
                <h2 className="text-md">(Tại Trung tâm đào tạo và sát hạch lái xe Đông Đô)</h2>
            </div>
        </>
    );

    const renderSubHeader = () => (
        <div className="grid grid-cols-2 text-sm my-4">
            <div>
                 <p><strong>Khóa thi:</strong> {reportDate.toLocaleDateString('vi-VN')}</p>
                 <p><strong>{classSummary}</strong></p>
            </div>
            <div className="text-right">
                <p><strong>Ngày sát hạch:</strong> {`ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`}</p>
            </div>
        </div>
    );

    const renderPassedTable = () => (
        <table className="w-full border-collapse border border-black">
            <thead>
                <tr>
                    <th className={tableHeaderCellStyle}>SBD</th>
                    <th className={tableHeaderCellStyle}>Mã HV</th>
                    <th className={tableHeaderCellStyle}>Họ và tên</th>
                    <th className={tableHeaderCellStyle}>Ngày sinh</th>
                    <th className={tableHeaderCellStyle}>Số CCCD</th>
                    <th className={tableHeaderCellStyle}>Hạng GPLX</th>
                    <th className={tableHeaderCellStyle}>Đơn vị ĐT</th>
                    <th className={tableHeaderCellStyle}>Ghi chú</th>
                </tr>
            </thead>
            <tbody>
                {students.map((s, index) => (
                    <tr key={s['SỐ BÁO DANH'] || index}>
                        <td className={tableCellStyle}>{s['SỐ BÁO DANH']}</td>
                        <td className={tableCellStyle}>{s['MÃ HỌC VIÊN']}</td>
                        <td className={`${tableCellStyle} text-left`}>{s['HỌ VÀ TÊN']}</td>
                        <td className={tableCellStyle}>{formatDate(s['NGÀY SINH'])}</td>
                        <td className={tableCellStyle}>{s['SỐ CHỨNG MINH'] || ''}</td>
                        <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                        <td className={tableCellStyle}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], [])}</td>
                        <td className={tableCellStyle}>{generateGhiChu(s)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderFailedOrAbsentTable = () => (
         <table className="w-full border-collapse border border-black">
            <thead>
                <tr>
                    <th rowSpan={2} className={tableHeaderCellStyle}>SBD</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Mã HV</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Họ và tên</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Ngày sinh</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Hạng</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Đơn vị ĐT</th>
                    <th colSpan={4} className={tableHeaderCellStyle}>Nội dung thi sát hạch</th>
                    <th rowSpan={2} className={tableHeaderCellStyle}>Ghi chú</th>
                </tr>
                <tr>
                    <th className={tableHeaderCellStyle}>L</th>
                    <th className={tableHeaderCellStyle}>M</th>
                    <th className={tableHeaderCellStyle}>H</th>
                    <th className={tableHeaderCellStyle}>Đ</th>
                </tr>
            </thead>
            <tbody>
                 {students.map((s, index) => (
                    <tr key={s['SỐ BÁO DANH'] || index}>
                        <td className={tableCellStyle}>{s['SỐ BÁO DANH']}</td>
                        <td className={tableCellStyle}>{s['MÃ HỌC VIÊN']}</td>
                        <td className={`${tableCellStyle} text-left`}>{s['HỌ VÀ TÊN']}</td>
                        <td className={tableCellStyle}>{formatDate(s['NGÀY SINH'])}</td>
                        <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                        <td className={tableCellStyle}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], [])}</td>
                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : (s['LÝ THUYẾT'] || '')}</td>
                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : (s['MÔ PHỎNG'] || '')}</td>
                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : (s['SA HÌNH'] || '')}</td>
                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : (s['ĐƯỜNG TRƯỜNG'] || '')}</td>
                        <td className={tableCellStyle}></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );


    return (
        <div className="p-2">
            {renderHeader()}
            {renderSubHeader()}
            {reportType === 'passed' ? renderPassedTable() : renderFailedOrAbsentTable()}
        </div>
    );
};