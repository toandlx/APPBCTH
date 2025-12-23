import React, { useState, useMemo, useEffect } from 'react';
import { DataInputPage } from './components/DataInputPage';
import { ReportDashboardPage } from './components/reports/ReportDashboardPage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { SessionList } from './components/admin/SessionList';
import { SettingsPage } from './components/admin/SettingsPage';
import { TrainingUnitManager } from './components/admin/TrainingUnitManager';
import { AggregateReportPage } from './components/admin/AggregateReportPage';
import { StudentLookupPage } from './components/admin/StudentLookupPage';
import { ConflictAuditPage } from './components/admin/ConflictAuditPage';
import { storageService } from './services/storageService';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, SavedSession, TrainingUnit, ConflictWarning } from './types';
import { processExcelData, normalizeData } from './services/excelProcessor';
import { checkHistoricalConflicts } from './services/reportUtils';
import { Toast } from './components/ui/Toast';

type AppView = 'dashboard' | 'create' | 'detail' | 'settings' | 'training-units' | 'aggregate-report' | 'student-lookup' | 'conflict-audit';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    const [appData, setAppData] = useState<AppData | null>(null);
    const [studentRecords, setStudentRecords] = useState<StudentRecord[] | null>(null);
    const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
    const [trainingUnits, setTrainingUnits] = useState<TrainingUnit[]>([]);
    const [conflicts, setConflicts] = useState<ConflictWarning[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('theme') === 'dark');

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const [reportMetadata, setReportMetadata] = useState<ReportMetadata>({
        meetingTime: '18 giờ 00 phút',
        meetingLocation: 'Trung tâm dạy nghề và Sát hạch lái xe Đông Đô',
        organizer: 'Giám đốc Công an tỉnh',
        attendees: [
            { id: '1', name: 'Đồng chí: Trung tá Dương Kim Giang', role: 'Phó Trưởng phòng, Chủ tịch Hội đồng' },
            { id: '2', name: 'Đồng chí: Trung tá Trần Duy Giang', role: 'Đội trưởng, Phó Chủ tịch Hội đồng' },
            { id: '3', name: 'Ông: Vũ Tiến Tuế', role: 'Giám đốc Trung tâm sát hạch, Ủy viên' },
            { id: '4', name: 'Đồng chí: Vương Mai Phương', role: 'Thư ký' },
        ],
        technicalErrorSBD: '',
    });

    const loadData = async () => {
        const [sessions, units] = await Promise.all([
            storageService.getAllSessions(),
            storageService.getAllTrainingUnits()
        ]);
        setSavedSessions(sessions);
        setTrainingUnits(units);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

    useEffect(() => {
        loadData();
    }, []);

    const handleExcelSubmit = (rawRecords: StudentRecord[]) => {
        setIsLoading(true);
        setError(null);
        setConflicts([]);
        try {
            const cleanRecords = normalizeData(rawRecords);
            const processedData = processExcelData(cleanRecords);
            const detectedConflicts = checkHistoricalConflicts(cleanRecords, savedSessions);
            setConflicts(detectedConflicts);
            setStudentRecords(cleanRecords);
            setAppData(processedData);
            if (detectedConflicts.length > 0) {
                showToast(`Phát hiện ${detectedConflicts.length} thí sinh nghi vấn nội dung thi!`, 'info');
            } else {
                showToast('Xử lý dữ liệu thành công!', 'info');
            }
        } catch (e) {
             setError(`Lỗi xử lý file Excel: ${(e as Error).message}`);
             showToast('Lỗi xử lý file Excel', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const grandTotal = useMemo<LicenseClassData | null>(() => {
        if (!appData) return null;
        const allRows = [...appData.firstTime.rows, ...appData.retake.rows];
        if (allRows.length === 0) return null;
        return allRows.reduce((acc, row) => {
            acc.totalApplications += row.totalApplications;
            acc.totalParticipants += row.totalParticipants;
            acc.theory.total += row.theory.total; acc.theory.pass += row.theory.pass; acc.theory.fail += row.theory.fail;
            acc.simulation.total += row.simulation.total; acc.simulation.pass += row.simulation.pass; acc.simulation.fail += row.simulation.fail;
            acc.practicalCourse.total += row.practicalCourse.total; acc.practicalCourse.pass += row.practicalCourse.pass; acc.practicalCourse.fail += row.practicalCourse.fail;
            acc.onRoad.total += row.onRoad.total; acc.onRoad.pass += row.onRoad.pass; acc.onRoad.fail += row.onRoad.fail;
            acc.finalPass += row.finalPass;
            return acc;
        }, {
            class: 'a+b', totalApplications: 0, totalParticipants: 0,
            theory: { total: 0, pass: 0, fail: 0 }, simulation: { total: 0, pass: 0, fail: 0 },
            practicalCourse: { total: 0, pass: 0, fail: 0 }, onRoad: { total: 0, pass: 0, fail: 0 },
            finalPass: 0,
        });
    }, [appData]);

    const handleSaveSession = async (name: string, reportDate: Date) => {
        if (!appData || !grandTotal || !studentRecords) {
            showToast('Không có dữ liệu để lưu!', 'error');
            return;
        }
        setIsLoading(true);
        try {
            const newSession: SavedSession = {
                id: Date.now().toString(), 
                name: name.trim() || `Kỳ sát hạch ${reportDate.toLocaleDateString('vi-VN')}`, 
                createdAt: Date.now(),
                reportDate: reportDate.toISOString(), 
                studentRecords, 
                appData,
                grandTotal, 
                reportMetadata, 
                trainingUnits
            };
            await storageService.saveSession(newSession);
            await loadData();
            setAppData(null); 
            setStudentRecords(null); 
            setConflicts([]);
            setCurrentView('dashboard');
            showToast('Đã lưu kỳ sát hạch thành công!', 'success');
        } catch (err) {
            console.error("Save Error:", err);
            showToast(`Lỗi khi lưu dữ liệu: ${(err as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSession = async (session: SavedSession) => {
        setIsLoading(true);
        try {
            let fullSession = await storageService.getSessionById(session.id);
            if (!fullSession) fullSession = session;
            setSelectedSession(fullSession);
            setAppData(fullSession.appData);
            setStudentRecords(fullSession.studentRecords);
            setReportMetadata(fullSession.reportMetadata);
            setTrainingUnits(fullSession.trainingUnits || []);
            setConflicts([]);
            setCurrentView('detail');
        } catch (err) {
            showToast('Lỗi tải thông tin kỳ sát hạch', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStudentUpdate = (id: string, field: string, value: any) => {
        if (!studentRecords) return;
        const newRecords = studentRecords.map(r => {
            if (String(r['SỐ BÁO DANH']) === id) {
                return { ...r, [field]: value };
            }
            return r;
        });
        const reprocessedData = processExcelData(newRecords);
        setStudentRecords(newRecords);
        setAppData(reprocessedData);
        showToast('Đã cập nhật dữ liệu thí sinh', 'info');
    };

    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
            <AdminSidebar 
                currentView={currentView === 'detail' ? 'dashboard' : currentView} 
                onChangeView={(v) => {
                    if (v === 'create') { setAppData(null); setStudentRecords(null); setConflicts([]); }
                    setCurrentView(v);
                }} 
                darkMode={darkMode} 
                onToggleDarkMode={() => setDarkMode(!darkMode)} 
            />
            <main className="flex-1 h-full relative flex flex-col min-w-0">
                {currentView === 'dashboard' && <SessionList sessions={savedSessions} onSelectSession={handleSelectSession} onDeleteSession={async id => { await storageService.deleteSession(id); loadData(); }} onCreateNew={() => setCurrentView('create')} onRefresh={loadData} />}
                {currentView === 'create' && (
                    appData ? <ReportDashboardPage summaryData={appData} studentRecords={studentRecords} grandTotal={grandTotal} reportMetadata={reportMetadata} mode="preview" onSaveSession={handleSaveSession} trainingUnits={trainingUnits} onStudentUpdate={handleStudentUpdate} isLoading={isLoading} conflicts={conflicts} />
                    : <DataInputPage onExcelSubmit={handleExcelSubmit} isLoading={isLoading} error={error} onClearData={() => { setAppData(null); setConflicts([]); }} reportMetadata={reportMetadata} onMetadataChange={setReportMetadata} conflicts={conflicts} />
                )}
                {currentView === 'detail' && selectedSession && appData && <ReportDashboardPage summaryData={appData} studentRecords={studentRecords} grandTotal={grandTotal} reportMetadata={reportMetadata} mode="view" initialReportDate={selectedSession.reportDate} sessionName={selectedSession.name} trainingUnits={trainingUnits} onStudentUpdate={handleStudentUpdate} isLoading={isLoading} onUpdateSession={async (name, date, meta) => {
                    const updated = { ...selectedSession, name, reportDate: date.toISOString(), reportMetadata: meta };
                    setIsLoading(true);
                    try {
                        await storageService.saveSession(updated);
                        await loadData();
                        showToast('Cập nhật kỳ sát hạch thành công', 'success');
                    } catch (err) {
                        showToast(`Lỗi: ${(err as Error).message}`, 'error');
                    } finally {
                        setIsLoading(false);
                    }
                }} />}
                {currentView === 'aggregate-report' && <AggregateReportPage />}
                {currentView === 'student-lookup' && <StudentLookupPage />}
                {currentView === 'conflict-audit' && <ConflictAuditPage sessions={savedSessions} />}
                {currentView === 'training-units' && <TrainingUnitManager trainingUnits={trainingUnits} onUnitsImport={units => { setTrainingUnits(units); loadData(); }} />}
                {currentView === 'settings' && <SettingsPage onRefresh={() => loadData()} />}
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;