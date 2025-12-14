
import React from 'react';
import type { StudentRecord, TrainingUnit } from '../../types';
import { identifyTrainingUnit, isStudentPassed, isStudentAbsent } from '../../services/reportUtils';

interface MasterStudentListReportProps {
    students: StudentRecord[];
    trainingUnits: TrainingUnit[];
    reportDate: Date;
}

export const MasterStudentListReport: React.FC<MasterStudentListReportProps> = ({ students, trainingUnits, reportDate }) => {
    
    const formatDate = (date: string | number | undefined) => {
        if (!date) return '';
        if (typeof date === 'number') { 
             const excelEpoch = new Date(1899, 11, 30);
             const dateObj = new Date(excelEpoch.getTime() + date * 86400000);
             return dateObj.toLocaleDateString('vi-VN');
        }
        return new Date(date).toLocaleDateString('vi-VN') !== 'Invalid Date' ? new Date(date).toLocaleDateString('vi-VN') : date;
    }

    const getStatusText = (student: StudentRecord) => {
        if (isStudentAbsent(student)) return <span className="text-gray-400 font-bold">Vắng</span>;
        if (isStudentPassed(student)) return <span className="text-green-600 font-bold">ĐẠT</span>;
        return <span className="text-red-600 font-bold">TRƯỢT</span>;
    };

    const tableHeaderStyle = "p-2 border border-gray-400 bg-gray-100 font-bold text-center text-xs";
    const tableCellStyle = "p-2 border border-gray-400 text-center text-xs";

    return (
        <div className="p-2">
             <div className="text-center mb-6">
                <h1 className="text-lg font-bold uppercase">BẢNG TỔNG HỢP KẾT QUẢ SÁT HẠCH CHI TIẾT</h1>
                <p className="text-sm italic">Ngày sát hạch: {reportDate.toLocaleDateString('vi-VN')}</p>
            </div>

            <table className="w-full border-collapse border border-gray-400">
                <thead>
                    <tr>
                        <th className={tableHeaderStyle}>STT</th>
                        <th className={tableHeaderStyle}>SBD</th>
                        <th className={tableHeaderStyle}>Họ và tên</th>
                        <th className={tableHeaderStyle}>Ngày sinh</th>
                        <th className={tableHeaderStyle}>Hạng</th>
                        <th className={tableHeaderStyle}>Đơn vị đào tạo</th>
                        <th className={tableHeaderStyle}>Lý thuyết</th>
                        <th className={tableHeaderStyle}>Mô phỏng</th>
                        <th className={tableHeaderStyle}>Sa hình</th>
                        <th className={tableHeaderStyle}>Đường trường</th>
                        <th className={tableHeaderStyle}>Kết quả chung</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((s, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                            <td className={tableCellStyle}>{index + 1}</td>
                            <td className={`${tableCellStyle} font-semibold`}>{s['SỐ BÁO DANH']}</td>
                            <td className={`${tableCellStyle} text-left font-medium`}>{s['HỌ VÀ TÊN']}</td>
                            <td className={tableCellStyle}>{formatDate(s['NGÀY SINH'])}</td>
                            <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                            <td className={`${tableCellStyle} text-left`}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], trainingUnits)}</td>
                            
                            <td className={tableCellStyle}>{s['LÝ THUYẾT']}</td>
                            <td className={tableCellStyle}>{s['MÔ PHỎNG']}</td>
                            <td className={tableCellStyle}>{s['SA HÌNH']}</td>
                            <td className={tableCellStyle}>{s['ĐƯỜNG TRƯỜNG']}</td>
                            
                            <td className={tableCellStyle}>
                                {getStatusText(s)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
