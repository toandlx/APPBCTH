
import React, { useState, useMemo, useEffect } from 'react';
import { DataInputPage } from './components/DataInputPage';
import { ReportDashboardPage } from './components/reports/ReportDashboardPage';
import { AdminSidebar } from './components/admin/AdminSidebar';
import { SessionList } from './components/admin/SessionList';
import { SettingsPage } from './components/admin/SettingsPage';
import { TrainingUnitManager } from './components/admin/TrainingUnitManager';
import { AggregateReportPage } from './components/admin/AggregateReportPage';
import { StudentLookupPage } from './components/admin/StudentLookupPage';
import { ContentValidationPage } from './components/admin/ContentValidationPage';
import { storageService } from './services/storageService';
import type { AppData, LicenseClassData, StudentRecord, ReportMetadata, SavedSession, TrainingUnit } from './types';
import { processExcelData, normalizeData } from './services/excelProcessor';
import { Toast } from './components/ui/Toast';

type AppView = 'dashboard' | 'create' | 'detail' | 'settings' | 'training-units' | 'aggregate-report' | 'student-lookup' | 'content-validation';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
    const [appData, setAppData] = useState<AppData | null>(null);
    const [studentRecords, setStudentRecords] = useState<StudentRecord[] | null>(null);
    const [selectedSession, setSelectedSession] = useState<SavedSession | null>(null);
    const [trainingUnits, setTrainingUnits] = useState<TrainingUnit[]>([]);
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
            { id: '1', name: 'Đồng chí: Trung tá Dương Kim Giang', role: 'Chức vụ: Phó Trưởng phòng, Chủ tịch Hội đồng' },
            { id: '2', name: 'Đồng chí: Trung tá Trần Duy Giang', role: 'Chức vụ: Đội trưởng, Phó Chủ tịch Hội đồng' },
            { id: '3', name: 'Ông: Vũ Tiến Tuế', role: 'Chức vụ: Giám đốc Trung tâm sát hạch, Ủy viên' },
            { id: '4', name: 'Đồng chí: Vương Mai Phương', role: 'Thư ký' },
        ],
        technicalErrorSBD: '02,153,369',
    });

    const loadData = async () => {
        const sessions = await storageService.getAllSessions();
        const units = await storageService.getAllTrainingUnits();
        setSavedSessions(sessions);
        setTrainingUnits(units);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => setToast({ message, type });

    useEffect(() => {
        loadData();
        const intervalId = setInterval(async () => {
            try { await fetch('/api/server-status'); } catch (e) {}
        }, 4 * 60 * 1000); 
        return () => clearInterval(intervalId);
    }, []);

    const handleStudentUpdate = (id: string, field: string, value: any) => {
        if (!studentRecords) return;
        const updatedRecords = studentRecords.map(record => {
            if (String(record['SỐ BÁO DANH']) === id || String(record['MÃ HỌC VIÊN']) === id) {
                return { ...record, [field]: value };
            }
            return record;
        });
        try {
            const processedData = processExcelData(updatedRecords);
            setStudentRecords(updatedRecords);
            setAppData(processedData);
            showToast('Đã cập nhật dữ liệu học viên', 'info');
        } catch (e) {
            showToast('Lỗi cập nhật: ' + (e as Error).message, 'error');
        }
    };

    const handleExcelSubmit = (rawRecords: StudentRecord[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const cleanRecords = normalizeData(rawRecords);
            const processedData = processExcelData(cleanRecords);
            setStudentRecords(cleanRecords);
            setAppData(processedData);
            showToast('Xử lý dữ liệu thành công!', 'info');
        } catch (e) {
             setError(`Lỗi: ${(e as Error).message}`);
             showToast('Lỗi xử lý file', 'error');
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
            practicalCourse: { total: 0, pass: 0, fail: 0 }, onRoad: { total: 0, pass: 0, fail: 0 }, finalPass: 0,
        });
    }, [appData]);

    const handleClearData = () => { setAppData(null); setStudentRecords(null); setError(null); };

    const handleSaveSession = async (name: string, reportDate: Date) => {
        if (!appData || !grandTotal || !studentRecords) return;
        setIsLoading(true);
        try {
            const newSession: SavedSession = {
                id: Date.now().toString(), name, createdAt: Date.now(),
                reportDate: reportDate.toISOString(), studentRecords, appData, grandTotal, reportMetadata, trainingUnits
            };
            await storageService.saveSession(newSession);
            await loadData();
            handleClearData();
            setCurrentView('dashboard');
            showToast('Đã lưu kỳ sát hạch!', 'success');
        } catch (err) {
            showToast('Lỗi khi lưu!', 'error');
        } finally { setIsLoading(false); }
    };

    const handleUpdateSession = async (name: string, reportDate: Date, metadata: ReportMetadata) => {
        if (!selectedSession) return;
        setIsLoading(true);
        try {
            const updatedSession: SavedSession = {
                ...selectedSession, name, reportDate: reportDate.toISOString(), reportMetadata: metadata,
                studentRecords: studentRecords || selectedSession.studentRecords,
                appData: appData || selectedSession.appData,
                trainingUnits: selectedSession.trainingUnits || []
            };
            await storageService.saveSession(updatedSession);
            await loadData();
            setSelectedSession(updatedSession);
            setReportMetadata(metadata);
            showToast('Đã cập nhật kỳ sát hạch!', 'success');
        } catch (err) {
            showToast('Lỗi khi cập nhật!', 'error');
        } finally { setIsLoading(false); }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            await storageService.deleteSession(id);
            await loadData();
            if (selectedSession?.id === id) { setSelectedSession(null); setCurrentView('dashboard'); }
            showToast('Đã xóa.', 'info');
        } catch (err) { showToast('Lỗi khi xóa!', 'error'); }
    };

    const handleSelectSession = async (session: SavedSession) => {
        setIsLoading(true);
        let fullSession = session;
        if (!session.appData || !session.studentRecords) {
             const loaded = await storageService.getSessionById(session.id);
             if (loaded) fullSession = loaded;
        }
        setSelectedSession(fullSession);
        setAppData(fullSession.appData);
        setStudentRecords(fullSession.studentRecords);
        setReportMetadata(fullSession.reportMetadata);
        setTrainingUnits(fullSession.trainingUnits || []);
        setCurrentView('detail');
        setIsLoading(false);
    };

    const handleNavChange = (view: AppView) => {
        if (view === 'create') { handleClearData(); setSelectedSession(null); }
        if (view === 'dashboard') loadData();
        setCurrentView(view);
    };

    const renderMainContent = () => {
        if (isLoading && !appData && currentView === 'dashboard') return <div className="flex h-full items-center justify-center dark:bg-gray-900"><i className="fa-solid fa-spinner animate-spin text-4xl text-blue-500"></i></div>;
        if (currentView === 'dashboard') return <SessionList sessions={savedSessions} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} onCreateNew={() => handleNavChange('create')} onRefresh={async () => { await loadData(); }} />;
        if (currentView === 'aggregate-report') return <AggregateReportPage />;
        if (currentView === 'student-lookup') return <StudentLookupPage />;
        if (currentView === 'content-validation') return <ContentValidationPage trainingUnits={trainingUnits} />;
        if (currentView === 'training-units') return <TrainingUnitManager trainingUnits={trainingUnits} onUnitsImport={(units) => { setTrainingUnits(units); showToast(`Cập nhật ${units.length} đơn vị!`, 'success'); }} />;
        if (currentView === 'create') {
            if (appData) return (
                <div className="h-full bg-gray-200 dark:bg-gray-800">
                     <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-4 py-2 flex justify-between items-center print:hidden">
                        <h2 className="font-bold text-gray-700 dark:text-gray-200">Tạo kỳ mới - Xem trước</h2>
                        <button onClick={handleClearData} className="text-sm text-red-600 hover:text-red-800"><i className="fa-solid fa-arrow-left"></i> Quay lại</button>
                     </div>
                     <div className="h-[calc(100%-45px)] overflow-hidden">
                        <ReportDashboardPage summaryData={appData} studentRecords={studentRecords} grandTotal={grandTotal} reportMetadata={reportMetadata} mode="preview" onSaveSession={handleSaveSession} trainingUnits={trainingUnits} onStudentUpdate={handleStudentUpdate} />
                     </div>
                </div>
            );
            return <div className="h-full bg-gray-50 dark:bg-gray-900 flex justify-center overflow-y-auto"><div className="w-full max-w-5xl bg-white dark:bg-gray-800 shadow-lg h-full flex flex-col"><DataInputPage onExcelSubmit={handleExcelSubmit} isLoading={isLoading} error={error} onClearData={handleClearData} reportMetadata={reportMetadata} onMetadataChange={setReportMetadata} /></div></div>;
        }
        if (currentView === 'detail' && selectedSession && appData) return (
            <div className="h-full bg-gray-200 dark:bg-gray-800 flex flex-col">
                <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-6 py-3 flex justify-between items-center print:hidden shadow-sm z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentView('dashboard')} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"><i className="fa-solid fa-arrow-left"></i></button>
                        <div><h2 className="font-bold text-lg text-gray-800 dark:text-white">Chi tiết Kỳ Sát Hạch</h2><p className="text-xs text-gray-500">Lưu: {new Date(selectedSession.createdAt).toLocaleString('vi-VN')}</p></div>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative z-0">
                    <ReportDashboardPage summaryData={appData} studentRecords={studentRecords} grandTotal={grandTotal} reportMetadata={reportMetadata} mode="view" initialReportDate={selectedSession.reportDate} sessionName={selectedSession.name} onUpdateSession={handleUpdateSession} trainingUnits={trainingUnits} onStudentUpdate={handleStudentUpdate} />
                </div>
            </div>
        );
        if (currentView === 'settings') return <SettingsPage />;
        return null;
    };

    return (
         <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans overflow-hidden ${darkMode ? 'dark' : ''}`}>
            <AdminSidebar currentView={currentView === 'detail' ? 'dashboard' : currentView} onChangeView={handleNavChange} darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />
            <main className="flex-1 h-full relative flex flex-col min-w-0">{renderMainContent()}</main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default App;
