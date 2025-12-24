
import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';

interface ServerInfo {
    version: string;
    mode: string;
    dbConnected: boolean;
    dbError?: string;
    modeDescription?: string;
}

interface SettingsPageProps {
    onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'database' | 'data'>('database');
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Sync State
    const [localCount, setLocalCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed'>('idle');
    const [syncResult, setSyncResult] = useState<{success: number, failed: number} | null>(null);

    const checkServer = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/server-status');
            if (res.ok) {
                const data = await res.json();
                setServerInfo(data);
            } else {
                setServerInfo(null);
            }
        } catch (e) {
            setServerInfo(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetryConnection = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/check-db-connection', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                alert('Kết nối Database thành công!');
            } else {
                alert('Vẫn không thể kết nối: ' + (data.error || 'Lỗi không xác định'));
            }
            checkServer();
        } catch (e) {
            alert('Lỗi khi gọi API kiểm tra kết nối.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkServer();
        setLocalCount(storageService.getLocalSessionCount());
    }, []);

    const handleSync = async () => {
        if (!confirm('Bạn có muốn đẩy toàn bộ dữ liệu từ Trình duyệt lên Cloud SQL không?')) return;
        
        setSyncStatus('syncing');
        const result = await storageService.syncLocalToCloud();
        
        setSyncStatus('completed');
        setSyncResult({ success: result.success, failed: result.failed });
        setLocalCount(storageService.getLocalSessionCount());
    };

    const handleClearCache = () => {
        if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu lưu tạm trên trình duyệt này. Bạn có chắc chắn?')) {
            storageService.clearLocalCache();
            setLocalCount(0);
            onRefresh();
            alert('Đã dọn dẹp bộ nhớ đệm.');
        }
    };

    const renderServerStatus = () => {
        if (isLoading) return (
            <span className="text-gray-400 text-xs flex items-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i> Đang tải...
            </span>
        );
        
        if (!serverInfo) {
            return (
                <div className="flex items-center gap-2">
                    <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-1.5 rounded-full text-xs flex items-center gap-2 font-bold shadow-sm">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Server Offline
                    </div>
                </div>
            );
        }

        const isDbOk = serverInfo.dbConnected;

        return (
            <div className="flex items-center gap-3">
                 <div className={`border px-3 py-1.5 rounded-full text-xs flex items-center gap-2 font-bold shadow-sm ${isDbOk ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-100 border-red-200 text-red-700'}`}>
                    {isDbOk ? <i className="fa-solid fa-database"></i> : <i className="fa-solid fa-circle-xmark"></i>}
                    <span>{isDbOk ? 'Database Online' : 'Database Error'}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">v{serverInfo.version}</div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cấu hình hệ thống</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý kết nối Cloud SQL và Đồng bộ dữ liệu.</p>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                    {renderServerStatus()}
                </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 bg-white dark:bg-gray-800 rounded-t-xl px-2 pt-2">
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'database' ? 'bg-blue-50 dark:bg-blue-900/30 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('database')}
                >
                    <i className="fa-solid fa-server mr-2"></i> Kết nối Database
                </button>
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'data' ? 'bg-blue-50 dark:bg-blue-900/30 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    onClick={() => setActiveTab('data')}
                >
                    <i className="fa-solid fa-cloud-arrow-up mr-2"></i> Đồng bộ dữ liệu
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 max-w-4xl min-h-[450px]">
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                            <h3 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-2">
                                <i className="fa-solid fa-circle-info"></i> Cơ chế Lưu trữ Thông minh
                            </h3>
                            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                                Ứng dụng luôn ưu tiên lưu trữ vào <strong>Cloud SQL</strong> để bảo mật dữ liệu. 
                                Trong trường hợp mất kết nối, hệ thống sẽ tự động chuyển sang <strong>LocalStorage (Bộ nhớ trình duyệt)</strong>. 
                                Bạn có thể làm việc bình thường và đồng bộ lên Cloud khi có kết nối trở lại.
                            </p>
                        </div>

                        <div className="border dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-750">
                            <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-6 border-b dark:border-gray-600 pb-3 uppercase text-xs tracking-widest">Trạng thái kết nối hiện tại</h4>
                            
                            {serverInfo ? (
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">Trạng thái:</label>
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black ${serverInfo.dbConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {serverInfo.dbConnected ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                        {serverInfo.dbConnected ? (
                                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-900 shadow-inner">
                                                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                                                    Hệ thống đang hoạt động tốt trên <strong>{serverInfo.mode || 'Database'}</strong>. Dữ liệu đang được đồng bộ hóa tức thì.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-900">
                                                <p className="text-sm text-red-700 dark:text-red-400 font-bold mb-2">Lỗi kết nối Cloud SQL:</p>
                                                <div className="bg-white dark:bg-gray-900 p-3 rounded font-mono text-xs text-red-500 overflow-x-auto">
                                                    {serverInfo.dbError || 'Không thể thiết lập kết nối tới Host DB. Vui lòng kiểm tra Config/Firewall.'}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                                        <button 
                                            onClick={handleRetryConnection}
                                            disabled={isLoading}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
                                        >
                                            <i className={`fa-solid fa-rotate-right ${isLoading ? 'animate-spin' : ''}`}></i>
                                            Thử kết nối lại ngay
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
                                    <i className="fa-solid fa-plug-circle-xmark text-4xl text-gray-300 mb-4"></i>
                                    <p className="text-gray-500">Không thể liên lạc với Server API.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 bg-gray-50 dark:bg-gray-750 rounded-2xl border dark:border-gray-700 flex flex-col items-center justify-center text-center shadow-inner">
                                <div className="text-5xl font-black text-blue-600 dark:text-blue-400 mb-2">{localCount}</div>
                                <div className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tighter">Bản ghi trên trình duyệt</div>
                                <p className="text-[10px] text-gray-400 mt-2 max-w-[200px]">Số lượng kỳ sát hạch đang nằm trong bộ nhớ tạm chưa được đẩy lên Cloud.</p>
                            </div>

                            <div className="flex flex-col justify-center space-y-4">
                                <button 
                                    onClick={handleSync}
                                    disabled={localCount === 0 || syncStatus === 'syncing' || !serverInfo?.dbConnected}
                                    className={`w-full py-3.5 px-6 rounded-xl font-black text-white shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 ${
                                        localCount === 0 || !serverInfo?.dbConnected
                                            ? 'bg-gray-400 cursor-not-allowed grayscale' 
                                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                                    }`}
                                >
                                    {syncStatus === 'syncing' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                                    ĐỒNG BỘ LÊN CLOUD SQL
                                </button>

                                <button 
                                    onClick={handleClearCache}
                                    disabled={localCount === 0}
                                    className="w-full py-3 px-6 rounded-xl font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-100 dark:border-red-900 transition-all flex items-center justify-center gap-2"
                                >
                                    <i className="fa-solid fa-eraser"></i>
                                    Xóa bộ nhớ trình duyệt
                                </button>
                            </div>
                        </div>

                        {syncStatus === 'completed' && syncResult && (
                            <div className={`p-4 rounded-xl border animate-fade-in ${syncResult.failed === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
                                <h4 className="font-bold flex items-center gap-2 text-sm mb-1">
                                    <i className="fa-solid fa-circle-check"></i> Hoàn tất đồng bộ:
                                </h4>
                                <div className="text-xs pl-6">
                                    <p>Thành công: <strong>{syncResult.success}</strong> bản ghi.</p>
                                    {syncResult.failed > 0 && <p className="text-orange-600">Thất bại: <strong>{syncResult.failed}</strong> bản ghi (Kiểm tra lại kết nối DB).</p>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
        </div>
    );
};
