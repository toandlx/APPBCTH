
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

// Helper for Inline Editing Cell
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
        if (e.key === 'Enter') {
            handleBlur();
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
                className="w-full p-1 text-center bg-yellow-50 border border-blue-500 outline-none"
                autoFocus
            />
        );
    }

    return (
        <div 
            onDoubleClick={handleDoubleClick} 
            className={onUpdate ? "cursor-pointer hover:bg-yellow-50 transition-colors h-full flex items-center justify-center min-h-[24px]" : ""}
            title={onUpdate ? "Click đúp để sửa" : ""}
        >
            {value}
        </div>
    );
};

export const StudentListReport: React.FC<StudentListReportProps> = ({ title, students, reportType, reportDate, trainingUnits = [], onStudentUpdate }) => {
    
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

    // --- MOBILE CARD VIEW ---
    const renderMobileCards = () => (
        <div className="grid grid-cols-1 gap-4 md:hidden print:hidden">
            {students.map((s, index) => (
                <div key={index} className="bg-white border rounded-lg shadow-sm p-4 space-y-2 border-gray-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Họ và tên</span>
                            <h3 className="font-bold text-gray-800 text-lg">{s['HỌ VÀ TÊN']}</h3>
                        </div>
                        <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">SBD: {s['SỐ BÁO DANH']}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-xs text-gray-400 block">Ngày sinh</span>
                            <span>{formatDate(s['NGÀY SINH'])}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block">Hạng</span>
                            <span className="font-bold">{s['HẠNG GPLX']}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block">Mã HV</span>
                            <span>{s['MÃ HỌC VIÊN']}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-400 block">CCCD</span>
                            <span>{s['SỐ CHỨNG MINH']}</span>
                        </div>
                    </div>

                    <div className="border-t pt-2 mt-2">
                        <span className="text-xs text-gray-400 block mb-1">Kết quả</span>
                        <div className="grid grid-cols-4 gap-1 text-center text-xs">
                            <div className={`${(s['LÝ THUYẾT'] === 'ĐẠT' || s['LÝ THUYẾT'] === 'Đạt') ? 'bg-green-100 text-green-700' : 'bg-gray-100'} rounded py-1`}>
                                LT: {s['LÝ THUYẾT'] || '-'}
                            </div>
                            <div className={`${(s['MÔ PHỎNG'] === 'ĐẠT' || s['MÔ PHỎNG'] === 'Đạt') ? 'bg-green-100 text-green-700' : 'bg-gray-100'} rounded py-1`}>
                                MP: {s['MÔ PHỎNG'] || '-'}
                            </div>
                            <div className={`${(s['SA HÌNH'] === 'ĐẠT' || s['SA HÌNH'] === 'Đạt') ? 'bg-green-100 text-green-700' : 'bg-gray-100'} rounded py-1`}>
                                SH: {s['SA HÌNH'] || '-'}
                            </div>
                            <div className={`${(s['ĐƯỜNG TRƯỜNG'] === 'ĐẠT' || s['ĐƯỜNG TRƯỜNG'] === 'Đạt') ? 'bg-green-100 text-green-700' : 'bg-gray-100'} rounded py-1`}>
                                ĐT: {s['ĐƯỜNG TRƯỜNG'] || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // --- DESKTOP TABLE VIEW ---
    const renderPassedTable = () => (
        <div className="hidden md:block">
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
                        <td className={`${tableCellStyle} text-left`}>
                            <EditableCell 
                                value={s['HỌ VÀ TÊN']} 
                                id={String(s['SỐ BÁO DANH'])} 
                                field="HỌ VÀ TÊN" 
                                onUpdate={onStudentUpdate} 
                            />
                        </td>
                        <td className={tableCellStyle}>{formatDate(s['NGÀY SINH'])}</td>
                        <td className={tableCellStyle}>
                            <EditableCell 
                                value={s['SỐ CHỨNG MINH'] || ''} 
                                id={String(s['SỐ BÁO DANH'])} 
                                field="SỐ CHỨNG MINH" 
                                onUpdate={onStudentUpdate} 
                            />
                        </td>
                        <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                        <td className={tableCellStyle}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], trainingUnits)}</td>
                        <td className={tableCellStyle}>{generateGhiChu(s)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>
    );

    const renderFailedOrAbsentTable = () => (
         <div className="hidden md:block">
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
                        <td className={`${tableCellStyle} text-left`}>
                            <EditableCell 
                                value={s['HỌ VÀ TÊN']} 
                                id={String(s['SỐ BÁO DANH'])} 
                                field="HỌ VÀ TÊN" 
                                onUpdate={onStudentUpdate} 
                            />
                        </td>
                        <td className={tableCellStyle}>{formatDate(s['NGÀY SINH'])}</td>
                        <td className={tableCellStyle}>{s['HẠNG GPLX']}</td>
                        <td className={tableCellStyle}>{identifyTrainingUnit(s['MÃ HỌC VIÊN'], trainingUnits)}</td>
                        
                        {/* Inline Editing for Scores */}
                        <td className={tableCellStyle}>
                            {reportType === 'absent' ? 'Vắng' : (
                                <EditableCell 
                                    value={s['LÝ THUYẾT'] || ''} 
                                    id={String(s['SỐ BÁO DANH'])} 
                                    field="LÝ THUYẾT" 
                                    onUpdate={onStudentUpdate} 
                                />
                            )}
                        </td>
                        <td className={tableCellStyle}>
                             {reportType === 'absent' ? 'Vắng' : (
                                <EditableCell 
                                    value={s['MÔ PHỎNG'] || ''} 
                                    id={String(s['SỐ BÁO DANH'])} 
                                    field="MÔ PHỎNG" 
                                    onUpdate={onStudentUpdate} 
                                />
                            )}
                        </td>
                        <td className={tableCellStyle}>
                             {reportType === 'absent' ? 'Vắng' : (
                                <EditableCell 
                                    value={s['SA HÌNH'] || ''} 
                                    id={String(s['SỐ BÁO DANH'])} 
                                    field="SA HÌNH" 
                                    onUpdate={onStudentUpdate} 
                                />
                            )}
                        </td>
                        <td className={tableCellStyle}>
                             {reportType === 'absent' ? 'Vắng' : (
                                <EditableCell 
                                    value={s['ĐƯỜNG TRƯỜNG'] || ''} 
                                    id={String(s['SỐ BÁO DANH'])} 
                                    field="ĐƯỜNG TRƯỜNG" 
                                    onUpdate={onStudentUpdate} 
                                />
                            )}
                        </td>
                        <td className={tableCellStyle}></td>
                    </tr>
                ))}
            </tbody>
        </table>
        </div>
    );

    return (
        <div className="p-2">
            {renderHeader()}
            {renderSubHeader()}
            
            {/* Mobile View */}
            {renderMobileCards()}
            
            {/* Desktop View */}
            {reportType === 'passed' ? renderPassedTable() : renderFailedOrAbsentTable()}

            <div className="mt-4 text-xs text-gray-500 italic print:hidden text-center md:text-left">
                * Click đúp vào ô dữ liệu (Tên, CCCD, Điểm thi) để chỉnh sửa trực tiếp.
            </div>
        </div>
    );
};
