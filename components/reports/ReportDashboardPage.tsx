import React, { useState, useMemo, useEffect } from 'react';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, TrainingUnit } from '../../types';
import { GeneralReport } from './GeneralReport';
import { StudentListReport } from './StudentListReport';
import { UnitStatisticsReport } from './UnitStatisticsReport';
import { MasterStudentListReport } from './MasterStudentListReport';
import { isStudentPassed, isStudentAbsent } from '../../services/reportUtils';
import { exportGeneralReportToExcel, exportStudentListToExcel, exportUnitStatisticsToExcel, exportMasterListToExcel } from '../../services/excelGenerator';
import { ReportMetadataModal } from '../ReportMetadataModal';

interface ReportDashboardPageProps {
    summaryData: AppData;
    studentRecords: StudentRecord[] | null;
    grandTotal: LicenseClassData | null;
    reportMetadata: ReportMetadata;
    
    // Props mới cho tính năng lưu trữ
    mode?: 'preview' | 'view'; // 'preview' khi tạo mới, 'view' khi xem từ DB
    onSaveSession?: (sessionName: string, reportDate: Date) => void;
    // New prop for updating existing session
    onUpdateSession?: (sessionName: string, reportDate: Date, metadata: ReportMetadata) => void;
    initialReportDate?: string; // ISO String
    sessionName?: string; // Initial name for view mode
    
    // Props for training units
    trainingUnits?: TrainingUnit[];
}

type ReportView = 'summary' | 'unit-stats' | 'passed' | 'failed' | 'absent' | 'master-list';

export const ReportDashboardPage: React.FC<ReportDashboardPageProps> = ({ 
    summaryData, 
    studentRecords, 
    grandTotal, 
    reportMetadata,
    mode = 'preview',
    onSaveSession,
    onUpdateSession,
    initialReportDate,
    sessionName: initialSessionName,
    trainingUnits = []
}) => {
    const [view, setView] = useState<ReportView>('summary');
    const [reportDate, setReportDate] = useState<Date>(initialReportDate ? new Date(initialReportDate) : new Date());
    const [sessionName, setSessionName] = useState(initialSessionName || `Kỳ sát hạch ngày ${new Date().toLocaleDateString('vi-VN')}`);
    
    // Editing states
    const [isEditing, setIsEditing] = useState(false);
    const [localMetadata, setLocalMetadata] = useState<ReportMetadata>(reportMetadata);
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

    // Sync props to state when switching sessions in view mode
    useEffect(() => {
        if (mode === 'view') {
            if (initialReportDate) setReportDate(new Date(initialReportDate));
            if (initialSessionName) setSessionName(initialSessionName);
            setLocalMetadata(reportMetadata);
            setIsEditing(false); // Reset edit mode when switching sessions
        }
    }, [initialReportDate, initialSessionName, reportMetadata, mode]);

    // Cập nhật tên mặc định khi ngày thay đổi trong mode preview
    useEffect(() => {
        if (mode === 'preview' && !initialReportDate) {
             setSessionName(`Kỳ sát hạch ngày ${reportDate.toLocaleDateString('vi-VN')}`);
        }
    }, [reportDate, mode, initialReportDate]);

    const hasDetailedData = studentRecords && studentRecords.length > 0;

    // Reset view to summary if detailed data becomes unavailable
    useEffect(() => {
        if (!hasDetailedData) {
            setView('summary');
        }
    }, [hasDetailedData]);

    const { passedStudents, failedStudents, absentStudents } = useMemo(() => {
        if (!hasDetailedData) {
            return { passedStudents: [], failedStudents: [], absentStudents: [] };
        }
        const passed: StudentRecord[] = [];
        const failed: StudentRecord[] = [];
        const absent: StudentRecord[] = [];

        for (const record of studentRecords!) {
            if (isStudentAbsent(record)) {
                absent.push(record);
            } else if (isStudentPassed(record)) {
                passed.push(record);
            } else {
                failed.push(record);
            }
        }
        return { passedStudents: passed, failedStudents: failed, absentStudents: absent };
    }, [studentRecords, hasDetailedData]);

    const handleDownload = () => {
        switch(view) {
            case 'summary':
                exportGeneralReportToExcel(summaryData, grandTotal, reportDate, localMetadata);
                break;
            case 'unit-stats':
                if (studentRecords) exportUnitStatisticsToExcel(studentRecords, trainingUnits, reportDate);
                break;
            case 'passed':
                exportStudentListToExcel(passedStudents, 'Danh_Sach_Dat', reportDate);
                break;
            case 'failed':
                exportStudentListToExcel(failedStudents, 'Danh_Sach_Truot', reportDate);
                break;
            case 'absent':
                exportStudentListToExcel(absentStudents, 'Danh_Sach_Vang', reportDate);
                break;
            case 'master-list':
                if (studentRecords) exportMasterListToExcel(studentRecords, trainingUnits, reportDate);
                break;
        }
    };

    const handleSaveClick = () => {
        if (mode === 'preview' && onSaveSession) {
            onSaveSession(sessionName, reportDate);
        } else if (mode === 'view' && onUpdateSession) {
            onUpdateSession(sessionName, reportDate, localMetadata);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        // Reset to initial values
        if (initialReportDate) setReportDate(new Date(initialReportDate));
        if (initialSessionName) setSessionName(initialSessionName);
        setLocalMetadata(reportMetadata);
    };

    const renderActiveReport = () => {
        switch(view) {
            case 'summary':
                return <GeneralReport appData={summaryData} grandTotal={grandTotal} reportDate={reportDate} reportMetadata={localMetadata} />;
            case 'unit-stats':
                return studentRecords ? <UnitStatisticsReport students={studentRecords} trainingUnits={trainingUnits} reportDate={reportDate} /> : null;
            case 'passed':
                return <StudentListReport 
                            title="DANH SÁCH THÍ SINH ĐẠT SÁT HẠCH LÁI XE Ô TÔ" 
                            students={passedStudents} 
                            reportType="passed" 
                            reportDate={reportDate} 
                            trainingUnits={trainingUnits}
                        />;
            case 'failed':
                return <StudentListReport 
                            title="DANH SÁCH THÍ SINH TRƯỢT SÁT HẠCH LÁI XE Ô TÔ" 
                            students={failedStudents} 
                            reportType="failed" 
                            reportDate={reportDate} 
                            trainingUnits={trainingUnits}
                        />;
            case 'absent':
                 return <StudentListReport 
                            title="DANH SÁCH THÍ SINH VẮNG SÁT HẠCH LÁI XE Ô TÔ" 
                            students={absentStudents} 
                            reportType="absent" 
                            reportDate={reportDate} 
                            trainingUnits={trainingUnits}
                        />;
            case 'master-list':
                return studentRecords ? <MasterStudentListReport students={studentRecords} trainingUnits={trainingUnits} reportDate={reportDate} /> : null;
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{reportView: ReportView; label: string; icon: string}> = ({reportView, label, icon}) => (
        <button
            onClick={() => setView(reportView)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
                view === reportView 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
            }`}
        >
            <i className={`fa-solid ${icon}`}></i> {label}
        </button>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Control Bar */}
            <div className="bg-white border-b border-gray-200 p-3 print:hidden flex flex-col xl:flex-row gap-4 justify-between xl:items-start sticky top-0 z-10 shadow-sm">
                
                {/* Left: View Switcher */}
                <div className="flex flex-col gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                    {/* Group 1: General Reports */}
                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 w-fit">
                        <span className="text-[10px] uppercase font-bold text-gray-400 px-2">Tổng hợp</span>
                        <TabButton reportView="summary" label="Biên bản chung" icon="fa-chart-pie" />
                        {hasDetailedData && <TabButton reportView="unit-stats" label="Thống kê Đơn vị" icon="fa-building-columns" />}
                    </div>

                    {/* Group 2: Detailed Lists */}
                    {hasDetailedData && (
                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100 w-fit">
                            <span className="text-[10px] uppercase font-bold text-gray-400 px-2">Danh sách</span>
                            <TabButton reportView="master-list" label="Tất cả (Chi tiết)" icon="fa-list" />
                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                            <TabButton reportView="passed" label="Đạt" icon="fa-circle-check" />
                            <TabButton reportView="failed" label="Trượt" icon="fa-circle-xmark" />
                            <TabButton reportView="absent" label="Vắng" icon="fa-user-slash" />
                        </div>
                    )}
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    
                    {/* Mode specific controls */}
                    {(mode === 'preview' || isEditing) ? (
                        <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-100 animate-fade-in">
                             <div className="flex flex-col">
                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-0.5">Tên kỳ sát hạch</label>
                                <input 
                                    type="text"
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    className="px-2 py-1.5 border border-blue-200 rounded-md text-sm w-48 sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nhập tên kỳ..."
                                />
                             </div>
                             
                             <div className="flex flex-col">
                                <label className="text-[10px] text-blue-600 font-bold uppercase mb-0.5">Ngày báo cáo</label>
                                <input 
                                    type="date" 
                                    value={reportDate.toISOString().split('T')[0]}
                                    onChange={(e) => setReportDate(new Date(e.target.value))}
                                    className="px-2 py-1.5 border border-blue-200 rounded-md text-sm w-36 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                             </div>

                             {isEditing && (
                                <button
                                    onClick={() => setIsMetadataModalOpen(true)}
                                    className="px-3 py-1.5 mt-4 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium"
                                    title="Sửa thông tin biên bản"
                                >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                             )}
                        </div>
                    ) : (
                        // View Only Mode (Not Editing)
                        <div className="flex items-center gap-4 mr-4 bg-gray-50 px-3 py-1 rounded border">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">Ngày báo cáo</div>
                                <div className="font-semibold text-sm">{reportDate.toLocaleDateString('vi-VN')}</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                         <button
                            onClick={handleDownload}
                            className="px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                            title="Tải file Excel"
                        >
                            <i className="fa-solid fa-file-excel"></i> <span className="hidden sm:inline">Excel</span>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                            title="In báo cáo"
                        >
                            <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">In</span>
                        </button>
                        
                        {/* Action Buttons based on Mode */}
                        {mode === 'preview' && (
                            <button
                                onClick={handleSaveClick}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-bold shadow-md ml-2 animate-pulse hover:animate-none border-2 border-indigo-500 hover:border-indigo-600"
                            >
                                <i className="fa-solid fa-floppy-disk"></i> Lưu
                            </button>
                        )}

                        {mode === 'view' && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm ml-2"
                            >
                                <i className="fa-solid fa-pen"></i> Sửa
                            </button>
                        )}

                        {mode === 'view' && isEditing && (
                            <>
                                <button
                                    onClick={handleSaveClick}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm ml-2"
                                >
                                    <i className="fa-solid fa-check"></i> Lưu
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                                >
                                    <i className="fa-solid fa-xmark"></i> Hủy
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Report Content */}
            <div className="report-content flex-1 p-8 bg-gray-50 overflow-y-auto print:p-0 print:bg-white">
                 <div className="max-w-[297mm] mx-auto bg-white shadow-lg p-10 min-h-[210mm] print:shadow-none print:p-0">
                    {renderActiveReport()}
                 </div>
            </div>

            {/* Metadata Modal */}
            {isMetadataModalOpen && (
                <ReportMetadataModal
                    initialMetadata={localMetadata}
                    onSave={(newMetadata) => {
                        setLocalMetadata(newMetadata);
                        setIsMetadataModalOpen(false);
                    }}
                    onClose={() => setIsMetadataModalOpen(false)}
                />
            )}
        </div>
    );
};