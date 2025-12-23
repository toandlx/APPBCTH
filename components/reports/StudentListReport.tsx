import React, { useMemo, useState } from 'react';
import type { StudentRecord, TrainingUnit } from '../../types';
import { generateClassSummaryString, generateGhiChu, identifyTrainingUnit } from '../../services/reportUtils';

interface StudentListReportProps {
    title: string;
    students: StudentRecord[];
    reportType: 'passed' | 'failed' | 'absent';
    reportDate: Date;
    trainingUnits?: TrainingUnit[];
    onStudentUpdate?: (id: string, field: string, value: any) => void;
}

const tableHeaderCellStyle = "p-2 border border-black font-bold text-center text-sm bg-gray-100 print:bg-transparent";
const tableCellStyle = "p-2 border border-black text-center text-sm";

// Helper để định dạng ngày tháng an toàn
const formatDateDisplay = (dateValue: string | number | undefined) => {
    if (dateValue === undefined || dateValue === null || dateValue === '') return '';
    
    // Nếu là số (Excel Serial Date)
    if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const dateObj = new Date(excelEpoch.getTime() + dateValue * 86400000);
        return dateObj.toLocaleDateString('vi-VN');
    }
    
    // Nếu là chuỗi, thử parse
    const dateStr = String(dateValue).trim();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('vi-VN');
    }
    
    // Nếu không parse được, trả về chuỗi gốc (giả sử người dùng nhập dd/mm/yyyy)
    return dateStr;
};

const EditableCell = ({ value, id, field, onUpdate }: { value: any, id: string, field: string, onUpdate?: (id: string, field: string, value: any) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    const handleDoubleClick = () => {
        if (onUpdate) setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value && onUpdate) {
            onUpdate(id, field, localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setLocalValue(value);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <input 
                type="text" 
                value={localValue} 
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full p-1 text-center bg-yellow-50 border border-blue-500 outline-none rounded"
                autoFocus
            />
        );
    }

    return (
        <div 
            onDoubleClick={handleDoubleClick} 
            className={onUpdate ? "cursor-pointer hover:bg-yellow-50 hover:text-blue-700 transition-colors h-full flex items-center justify-center min-h-[24px]" : ""}
            title={onUpdate ? "Nháy đúp để sửa nhanh" : ""}
        >
            {value}
        </div>
    );
};

export const StudentListReport: React.FC<StudentListReportProps> = ({ title, students, reportType, reportDate, trainingUnits = [], onStudentUpdate }) => {
    const classSummary = useMemo(() => generateClassSummaryString(students), [students]);

    return (
        <div className="p-2 select-none dark:text-gray-900">
            <div className="grid grid-cols-2 text-center font-semibold mb-8">
                <div>
                    <h2 className="text-sm">CÔNG AN TỈNH BẮC NINH</h2>
                    <h3 className="text-sm">PHÒNG CẢNH SÁT GIAO THÔNG</h3>
                    <div className="w-24 h-px bg-black mx-auto mt-0.5"></div>
                </div>
                <div>
                    <h2 className="text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                    <h3 className="text-sm font-bold">Độc lập - Tự do - Hạnh phúc</h3>
                    <div className="w-32 h-px bg-black mx-auto mt-0.5"></div>
                </div>
            </div>

            <div className="text-center mt-4 mb-6">
                <h1 className="text-lg font-bold">{title}</h1>
                <h2 className="text-md italic">(Tại Trung tâm đào tạo và sát hạch lái xe Đông Đô)</h2>
            </div>

            <div className="grid grid-cols-2 text-sm my-4 px-2">
                <div>
                    <p><strong>Khóa thi:</strong> {reportDate.toLocaleDateString('vi-VN')}</p>
                    <p className="mt-1"><strong>{classSummary}</strong></p>
                </div>
                <div className="text-right">
                    <p className="italic">Bắc Ninh, {`ngày ${reportDate.getDate()} tháng ${reportDate.getMonth() + 1} năm ${reportDate.getFullYear()}`}</p>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black">
                    <thead>
                        {reportType === 'passed' ? (
                            <tr>
                                <th className={tableHeaderCellStyle}>SBD</th>
                                <th className={tableHeaderCellStyle}>Mã HV</th>
                                <th className={tableHeaderCellStyle}>Họ và tên</th>
                                <th className={tableHeaderCellStyle}>Ngày sinh</th>
                                <th className={tableHeaderCellStyle}>Số CCCD</th>
                                <th className={tableHeaderCellStyle}>Hạng</th>
                                <th className={tableHeaderCellStyle}>Đơn vị ĐT</th>
                                <th className={tableHeaderCellStyle}>Ghi chú</th>
                            </tr>
                        ) : (
                            <>
                                <tr>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>SBD</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Mã HV</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Họ và tên</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Ngày sinh</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Hạng</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Đơn vị ĐT</th>
                                    <th colSpan={4} className={tableHeaderCellStyle}>Nội dung sát hạch</th>
                                    <th rowSpan={2} className={tableHeaderCellStyle}>Ghi chú</th>
                                </tr>
                                <tr>
                                    <th className={tableHeaderCellStyle}>L</th>
                                    <th className={tableHeaderCellStyle}>M</th>
                                    <th className={tableHeaderCellStyle}>H</th>
                                    <th className={tableHeaderCellStyle}>Đ</th>
                                </tr>
                            </>
                        )}
                    </thead>
                    <tbody>
                        {students.map((s, index) => (
                            <tr key={s['SỐ BÁO DANH'] || index} className="hover:bg-gray-50 print:bg-transparent">
                                <td className={tableCellStyle}>{s['SỐ BÁO DANH']}</td>
                                <td className={tableCellStyle}>{s['MÃ HỌC VIÊN']}</td>
                                <td className={`${tableCellStyle} text-left min-w-[180px]`}>
                                    <EditableCell 
                                        value={s['HỌ VÀ TÊN']} 
                                        id={String(s['SỐ BÁO DANH'])} 
                                        field="HỌ VÀ TÊN" 
                                        onUpdate={onStudentUpdate} 
                                    />
                                </td>
                                <td className={tableCellStyle}>{formatDateDisplay(s['NGÀY SINH'])}</td>
                                {reportType === 'passed' && (
                                    <td className={tableCellStyle}>
                                        <EditableCell 
                                            value={s['SỐ CHỨNG MINH'] || ''} 
                                            id={String(s['SỐ BÁO DANH'])} 
                                            field="SỐ CHỨNG MINH" 
                                            onUpdate={onStudentUpdate} 
                                        />
                                    </td>
                                )}
                                <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                                <td className={`${tableCellStyle} text-left text-[11px]`}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], trainingUnits)}</td>
                                
                                {reportType !== 'passed' && (
                                    <>
                                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : s['LÝ THUYẾT']}</td>
                                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : s['MÔ PHỎNG']}</td>
                                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : s['SA HÌNH']}</td>
                                        <td className={tableCellStyle}>{reportType === 'absent' ? 'Vắng' : s['ĐƯỜNG TRƯỜNG']}</td>
                                    </>
                                )}
                                <td className={`${tableCellStyle} text-left text-[11px]`}>{generateGhiChu(s)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 text-[10px] text-gray-500 italic print:hidden flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-blue-500"></i>
                Mẹo: Nháy đúp vào Họ tên hoặc CCCD để chỉnh sửa nhanh nếu có sai sót.
            </div>
        </div>
    );
};
