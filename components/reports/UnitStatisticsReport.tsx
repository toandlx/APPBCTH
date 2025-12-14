
import React, { useMemo } from 'react';
import type { StudentRecord, TrainingUnit } from '../../types';
import { identifyTrainingUnit, isStudentPassed, isStudentAbsent, getResultStatus } from '../../services/reportUtils';

interface UnitStatisticsReportProps {
    students: StudentRecord[];
    trainingUnits: TrainingUnit[];
    reportDate: Date;
}

export const UnitStatisticsReport: React.FC<UnitStatisticsReportProps> = ({ students, trainingUnits, reportDate }) => {
    
    const stats = useMemo(() => {
        const data: Record<string, { 
            name: string; 
            total: number; 
            pass: number; 
            fail: number; 
            absent: number;
            theoryPass: number;
            simPass: number;
            fieldPass: number;
            roadPass: number;
        }> = {};

        students.forEach(student => {
            const unitName = identifyTrainingUnit(student['MÃ HỌC VIÊN'], trainingUnits) || 'Thí sinh tự do / Khác';
            
            if (!data[unitName]) {
                data[unitName] = { 
                    name: unitName, total: 0, pass: 0, fail: 0, absent: 0,
                    theoryPass: 0, simPass: 0, fieldPass: 0, roadPass: 0
                };
            }

            data[unitName].total++;

            if (isStudentAbsent(student)) {
                data[unitName].absent++;
            } else if (isStudentPassed(student)) {
                data[unitName].pass++;
            } else {
                data[unitName].fail++;
            }

            // Count individual subject passes
            if (getResultStatus(student['LÝ THUYẾT']).passed) data[unitName].theoryPass++;
            if (getResultStatus(student['MÔ PHỎNG']).passed) data[unitName].simPass++;
            if (getResultStatus(student['SA HÌNH']).passed) data[unitName].fieldPass++;
            if (getResultStatus(student['ĐƯỜNG TRƯỜNG']).passed) data[unitName].roadPass++;
        });

        // Convert to array and sort by name
        return Object.values(data).sort((a, b) => a.name.localeCompare(b.name));
    }, [students, trainingUnits]);

    const tableHeaderStyle = "p-3 border border-gray-400 bg-gray-200 font-bold text-center align-middle text-sm";
    const tableCellStyle = "p-2 border border-gray-400 text-center text-sm";
    const tableCellLeftStyle = "p-2 border border-gray-400 text-left text-sm font-semibold";

    return (
        <div className="p-2">
            <div className="text-center mb-6">
                <h1 className="text-lg font-bold uppercase">BÁO CÁO THỐNG KÊ KẾT QUẢ THEO ĐƠN VỊ ĐÀO TẠO</h1>
                <p className="text-sm italic">Ngày báo cáo: {reportDate.toLocaleDateString('vi-VN')}</p>
            </div>

            <table className="w-full border-collapse border border-gray-400">
                <thead>
                    <tr>
                        <th rowSpan={2} className={tableHeaderStyle}>STT</th>
                        <th rowSpan={2} className={tableHeaderStyle}>Đơn vị đào tạo</th>
                        <th rowSpan={2} className={tableHeaderStyle}>Tổng số</th>
                        <th colSpan={3} className={tableHeaderStyle}>Kết quả Tổng hợp</th>
                        <th colSpan={4} className={tableHeaderStyle}>Đạt từng môn (Chi tiết)</th>
                        <th rowSpan={2} className={tableHeaderStyle}>Tỷ lệ Đạt</th>
                    </tr>
                    <tr>
                        <th className={`${tableHeaderStyle} text-green-700`}>Đạt</th>
                        <th className={`${tableHeaderStyle} text-red-700`}>Trượt</th>
                        <th className={tableHeaderStyle}>Vắng</th>
                        
                        <th className={tableHeaderStyle}>Lý thuyết</th>
                        <th className={tableHeaderStyle}>Mô phỏng</th>
                        <th className={tableHeaderStyle}>Sa hình</th>
                        <th className={tableHeaderStyle}>Đường trường</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map((item, index) => (
                        <tr key={index}>
                            <td className={tableCellStyle}>{index + 1}</td>
                            <td className={tableCellLeftStyle}>{item.name}</td>
                            <td className={`${tableCellStyle} font-bold`}>{item.total}</td>
                            
                            <td className={`${tableCellStyle} font-bold text-green-600 bg-green-50`}>{item.pass}</td>
                            <td className={`${tableCellStyle} font-bold text-red-600 bg-red-50`}>{item.fail}</td>
                            <td className={tableCellStyle}>{item.absent}</td>

                            <td className={tableCellStyle}>{item.theoryPass}</td>
                            <td className={tableCellStyle}>{item.simPass}</td>
                            <td className={tableCellStyle}>{item.fieldPass}</td>
                            <td className={tableCellStyle}>{item.roadPass}</td>

                            <td className={`${tableCellStyle} font-bold`}>
                                {item.total > 0 ? ((item.pass / item.total) * 100).toFixed(1) : 0}%
                            </td>
                        </tr>
                    ))}
                    {stats.length === 0 && (
                        <tr>
                            <td colSpan={11} className="p-4 text-center text-gray-500 italic">Chưa có dữ liệu</td>
                        </tr>
                    )}
                    {/* Summary Row */}
                    {stats.length > 0 && (() => {
                        const total = stats.reduce((acc, cur) => acc + cur.total, 0);
                        const pass = stats.reduce((acc, cur) => acc + cur.pass, 0);
                        const fail = stats.reduce((acc, cur) => acc + cur.fail, 0);
                        const absent = stats.reduce((acc, cur) => acc + cur.absent, 0);
                        return (
                            <tr className="bg-gray-100 font-bold">
                                <td colSpan={2} className={tableCellStyle}>TỔNG CỘNG</td>
                                <td className={tableCellStyle}>{total}</td>
                                <td className={`${tableCellStyle} text-green-700`}>{pass}</td>
                                <td className={`${tableCellStyle} text-red-700`}>{fail}</td>
                                <td className={tableCellStyle}>{absent}</td>
                                <td colSpan={4} className={tableCellStyle}></td>
                                <td className={tableCellStyle}>{total > 0 ? ((pass/total)*100).toFixed(1) : 0}%</td>
                            </tr>
                        );
                    })()}
                </tbody>
            </table>
        </div>
    );
};
