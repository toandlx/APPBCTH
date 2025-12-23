import React, { useState, useMemo, useEffect } from 'react';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, TrainingUnit, ConflictWarning } from '../../types';
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
    mode?: 'preview' | 'view';
    onSaveSession?: (sessionName: string, reportDate: Date) => void;
    onUpdateSession?: (sessionName: string, reportDate: Date, metadata: ReportMetadata) => void;
    initialReportDate?: string;
    sessionName?: string;
    trainingUnits?: TrainingUnit[];
    onStudentUpdate?: (id: string, field: string, value: any) => void;
    isLoading?: boolean;
    conflicts?: ConflictWarning[];
}

type ReportView = 'summary' | 'unit-stats' | 'passed' | 'failed' | 'absent' | 'master-list' | 'audit';

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
    trainingUnits = [],
    onStudentUpdate,
    isLoading = false,
    conflicts = []
}) => {
    const [view, setView] = useState<ReportView>('summary');
    const [reportDate, setReportDate] = useState<Date>(initialReportDate ? new Date(initialReportDate) : new Date());
    const [sessionName, setSessionName] = useState(initialSessionName || `Kỳ sát hạch ngày ${new Date().toLocaleDateString('vi-VN')}`);
    
    const [isEditing, setIsEditing] = useState(false);
    const [localMetadata, setLocalMetadata] = useState<ReportMetadata>(reportMetadata);
    const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

    useEffect(() => {
        if (mode === 'view') {
            if (initialReportDate) setReportDate(new Date(initialReportDate));
            if (initialSessionName) setSessionName(initialSessionName);
            setLocalMetadata(reportMetadata);
            setIsEditing(false);
        }
    }, [initialReportDate, initialSessionName, reportMetadata, mode]);

    useEffect(() => {
        if (mode === 'preview' && !initialReportDate) {
             setSessionName(`Kỳ sát hạch ngày ${reportDate.toLocaleDateString('vi-VN')}`);
        }
    }, [reportDate, mode, initialReportDate]);

    const hasDetailedData = studentRecords && studentRecords.length > 0;

    useEffect(() => {
        if (!hasDetailedData && view !== 'audit') {
            setView('summary');
        }
    }, [hasDetailedData, view]);

    // Gom nhóm conflicts theo Mã học viên để hiển thị gọn gàng
    const groupedConflicts = useMemo(() => {
        const map = new Map<string, { studentId: string, studentName: string, findings: any[] }>();
        conflicts.forEach(c => {
            if (!map.has(c.studentId)) {
                map.set(c.studentId, {
                    studentId: c.studentId,
                    studentName: c.studentName,
                    findings: []
                });
            }
            map.get(c.studentId)!.findings.push({
                part: c.conflictPart,
                session: c.previousSessionName,
                date: c.previousDate
            });
        });
        return Array.from(map.values());
    }, [conflicts]);

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
            case 'audit':
                alert('Tính năng xuất Excel báo cáo kiểm toán sẽ được cập nhật sau.');
                break;
        }
    };

    const handleSaveClick = () => {
        if (isLoading) return;
        if (mode === 'preview' && onSaveSession) {
            onSaveSession(sessionName, reportDate);
        } else if (mode === 'view' && onUpdateSession) {
            onUpdateSession(sessionName, reportDate, localMetadata);
            setIsEditing(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if (initialReportDate) setReportDate(new Date(initialReportDate));
        if (initialSessionName) setSessionName(initialSessionName);
        setLocalMetadata(reportMetadata);
    };

    const renderAuditView = () => {
        return (
            <div className="p-4 space-y-6 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400">
                        <i className="fa-solid fa-shield-halved text-2xl"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">Đối soát & Kiểm toán Nội dung thi</h2>
                        <p className="text-sm text-gray-500">Phát hiện thí sinh dự thi lại nội dung đã đạt dựa trên lịch sử hệ thống.</p>
                    </div>
                </div>

                {groupedConflicts.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4 text-green-500 shadow-inner">
                            <i className="fa-solid fa-check text-4xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Dữ liệu Nhất quán</h3>
                        <p className="text-gray-500 max-w-sm mt-1">Không phát hiện thí sinh nào thi lại các môn đã ĐẠT trong quá khứ.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-r-lg flex items-start gap-3">
                            <i className="fa-solid fa-circle-exclamation text-orange-600 mt-1"></i>
                            <p className="text-sm text-orange-800 dark:text-orange-300 font-medium">
                                Phát hiện <strong>{groupedConflicts.length}</strong> thí sinh có nghi vấn về nội dung đăng ký thi. Vui lòng rà soát kỹ trước khi lưu kỳ sát hạch.
                            </p>
                        </div>

                        <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-1/3">Thí sinh / Mã HV</th>
                                        <th className="px-6 py-4">Nội dung đã đạt & Lịch sử</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {groupedConflicts.map((group, idx) => (
                                        <tr key={idx} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/10 transition-colors align-top">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-gray-900 dark:text-white text-base">{group.studentName}</div>
                                                <div className="text-xs text-blue-600 dark:text-blue-400 font-mono mt-1">ID: {group.studentId}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-3">
                                                    {group.findings.map((f, fIdx) => (
                                                        <div key={fIdx} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-750 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded text-[10px] font-black uppercase border border-orange-200 dark:border-orange-800 w-24 text-center shrink-0">
                                                                {f.part}
                                                            </span>
                                                            <div className="text-xs">
                                                                <div className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">Đã đạt tại:</div>
                                                                <div className="font-bold text-gray-800 dark:text-gray-200">{f.session}</div>
                                                                <div className="text-gray-500 italic text-[10px]">{f.date}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
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
                            onStudentUpdate={onStudentUpdate}
                        />;
            case 'failed':
                return <StudentListReport 
                            title="DANH SÁCH THÍ SINH TRƯỢT SÁT HẠCH LÁI XE Ô TÔ" 
                            students={failedStudents} 
                            reportType="failed" 
                            reportDate={reportDate} 
                            trainingUnits={trainingUnits}
                            onStudentUpdate={onStudentUpdate}
                        />;
            case 'absent':
                 return <StudentListReport 
                            title="DANH SÁCH THÍ SINH VẮNG SÁT HẠCH LÁI XE Ô TÔ" 
                            students={absentStudents} 
                            reportType="absent" 
                            reportDate={reportDate} 
                            trainingUnits={trainingUnits}
                            onStudentUpdate={onStudentUpdate}
                        />;
            case 'master-list':
                return studentRecords ? <MasterStudentListReport students={studentRecords} trainingUnits={trainingUnits} reportDate={reportDate} /> : null;
            case 'audit':
                return renderAuditView();
            default:
                return null;
        }
    };
    
    const TabButton: React.FC<{reportView: ReportView; label: string; icon: string; badge?: number; colorClass?: string}> = ({reportView, label, icon, badge, colorClass}) => (
        <button
            onClick={() => setView(reportView)}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 whitespace-nowrap relative ${
                view === reportView 
                    ? (colorClass || 'bg-blue-600 text-white shadow') 
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
            <i className={`fa-solid ${icon}`}></i> {label}
            {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
                    {badge}
                </span>
            )}
        </button>
    );

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 print:hidden flex flex-col xl:flex-row gap-4 justify-between xl:items-start sticky top-0 z-10 shadow-sm">
                
                <div className="flex flex-col gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
                    <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-100 dark:border-gray-600 w-fit">
                        <span className="text-[10px] uppercase font-bold text-gray-400 px-2">Tổng hợp</span>
                        <TabButton reportView="summary" label="Biên bản chung" icon="fa-chart-pie" />
                        {hasDetailedData && <TabButton reportView="unit-stats" label="Thống kê Đơn vị" icon="fa-building-columns" />}
                        {(mode === 'preview' || conflicts.length > 0) && (
                            <TabButton 
                                reportView="audit" 
                                label="Kiểm toán nội dung" 
                                icon="fa-shield-halved" 
                                badge={groupedConflicts.length}
                                colorClass={conflicts.length > 0 ? "bg-orange-600 text-white shadow" : undefined}
                            />
                        )}
                    </div>

                    {hasDetailedData && (
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-100 dark:border-gray-600 w-fit">
                            <span className="text-[10px] uppercase font-bold text-gray-400 px-2">Danh sách</span>
                            <TabButton reportView="master-list" label="Tất cả (Chi tiết)" icon="fa-list" />
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                            <TabButton reportView="passed" label="Đạt" icon="fa-circle-check" />
                            <TabButton reportView="failed" label="Trượt" icon="fa-circle-xmark" />
                            <TabButton reportView="absent" label="Vắng" icon="fa-user-slash" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {(mode === 'preview' || isEditing) ? (
                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg border border-blue-100 dark:border-blue-800 animate-fade-in">
                             <div className="flex flex-col">
                                <label className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-0.5">Tên kỳ sát hạch</label>
                                <input 
                                    type="text"
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    className="px-2 py-1.5 border border-blue-200 dark:border-blue-700 rounded-md text-sm w-48 sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:text-white"
                                    placeholder="Nhập tên kỳ..."
                                    disabled={isLoading}
                                />
                             </div>
                             
                             <div className="flex flex-col">
                                <label className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-0.5">Ngày báo cáo</label>
                                <input 
                                    type="date" 
                                    value={reportDate.toISOString().split('T')[0]}
                                    onChange={(e) => setReportDate(new Date(e.target.value))}
                                    className="px-2 py-1.5 border border-blue-200 dark:border-blue-700 rounded-md text-sm w-36 focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-800 dark:text-white"
                                    disabled={isLoading}
                                />
                             </div>

                             {isEditing && (
                                <button
                                    onClick={() => setIsMetadataModalOpen(true)}
                                    className="px-3 py-1.5 mt-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-sm font-medium"
                                    title="Sửa thông tin biên bản"
                                    disabled={isLoading}
                                >
                                    <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                             )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4 mr-4 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded border dark:border-gray-600">
                            <div className="text-right">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Ngày báo cáo</div>
                                <div className="font-semibold text-sm dark:text-white">{reportDate.toLocaleDateString('vi-VN')}</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-4 sm:mt-0">
                         <button
                            onClick={handleDownload}
                            className="px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                            title="Tải file Excel"
                            disabled={isLoading}
                        >
                            <i className="fa-solid fa-file-excel"></i> <span className="hidden sm:inline">Excel</span>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                            title="In báo cáo"
                            disabled={isLoading}
                        >
                            <i className="fa-solid fa-print"></i> <span className="hidden sm:inline">In</span>
                        </button>
                        
                        {mode === 'preview' && (
                            <button
                                onClick={handleSaveClick}
                                disabled={isLoading}
                                className={`px-5 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-bold shadow-md ml-2 border-2 ${
                                    isLoading 
                                    ? 'bg-gray-400 border-gray-400 cursor-not-allowed text-white' 
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse hover:animate-none border-indigo-500 hover:border-indigo-600'
                                }`}
                            >
                                {isLoading ? (
                                    <>
                                        <i className="fa-solid fa-spinner animate-spin"></i> Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-floppy-disk"></i> Lưu
                                    </>
                                )}
                            </button>
                        )}

                        {mode === 'view' && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm ml-2"
                                disabled={isLoading}
                            >
                                <i className="fa-solid fa-pen"></i> Sửa
                            </button>
                        )}

                        {mode === 'view' && isEditing && (
                            <>
                                <button
                                    onClick={handleSaveClick}
                                    disabled={isLoading}
                                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium shadow-sm ml-2 ${
                                        isLoading ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {isLoading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-check"></i>}
                                    {isLoading ? ' Đang lưu...' : ' Lưu'}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
                                >
                                    <i className="fa-solid fa-xmark"></i> Hủy
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="report-content flex-1 p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto print:p-0 print:bg-white">
                 <div className="max-w-[297mm] mx-auto bg-white shadow-lg p-10 min-h-[210mm] print:shadow-none print:p-0 transition-colors">
                    {renderActiveReport()}
                 </div>
            </div>

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
            <style dangerouslySetInnerHTML={{ __html: `
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}} />
        </div>
    );
};