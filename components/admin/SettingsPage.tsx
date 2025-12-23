import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';

interface ServerInfo {
    version: string;
    mode: string;
    dbConnected: boolean;
    dbConfig?: {
        user: string;
        database: string;
        instance: string;
    }
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
                alert('Kết nối thành công!');
            } else {
                alert('Kết nối thất bại: ' + data.error);
            }
            checkServer();
        } catch (e) {
            alert('Lỗi kết nối server');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkServer();
        setLocalCount(storageService.getLocalSessionCount());
    }, []);

    const handleSync = async () => {
        if (!confirm('Bạn có muốn đẩy toàn bộ dữ liệu từ Trình duyệt lên Cloud SQL không? Dữ liệu trùng ID sẽ được ghi đè.')) return;
        
        setSyncStatus('syncing');
        const result = await storageService.syncLocalToCloud();
        
        setSyncStatus('completed');
        setSyncResult({ success: result.success, failed: result.failed });
        setLocalCount(storageService.getLocalSessionCount());
    };

    const handleClearCache = () => {
        if (confirm('CẢNH BÁO: Việc này sẽ xóa toàn bộ kỳ sát hạch đang lưu trên trình duyệt này. Nếu bạn chưa đồng bộ lên Cloud SQL, dữ liệu sẽ mất vĩnh viễn. Bạn có chắc chắn?')) {
            storageService.clearLocalCache();
            setLocalCount(0);
            onRefresh();
            alert('Đã dọn dẹp bộ nhớ đệm thành công.');
        }
    };

    const renderServerStatus = () => {
        if (isLoading) return (
            <span className="text-gray-400 text-xs flex items-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i> Đang kiểm tra...
            </span>
        );
        
        if (!serverInfo) {
            return (
                <div className="flex items-center gap-2">
                    <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded text-xs flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Không thể kết nối Server.
                    </div>
                </div>
            );
        }

        const isDbOk = serverInfo.dbConnected;

        return (
            <div className="flex items-center gap-3">
                 <div className={`border px-3 py-2 rounded text-xs flex items-center gap-2 ${isDbOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {isDbOk ? <i className="fa-solid fa-database"></i> : <i className="fa-solid fa-circle-xmark"></i>}
                    <span className="font-bold">{isDbOk ? 'Database Connected' : 'Database Disconnected'}</span>
                </div>
                <div className="text-xs text-gray-500">v{serverInfo.version}</div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cấu hình hệ thống</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý kết nối và đồng bộ dữ liệu.</p>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                    {renderServerStatus()}
                </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 bg-white dark:bg-gray-800 rounded-t-lg px-2 pt-2">
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'database' ? 'bg-blue-50 dark:bg-blue-900/30 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={() => setActiveTab('database')}
                >
                    <i className="fa-solid fa-server mr-2"></i> Trạng thái Server
                </button>
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'data' ? 'bg-blue-50 dark:bg-blue-900/30 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    onClick={() => setActiveTab('data')}
                >
                    <i className="fa-solid fa-cloud-arrow-up mr-2"></i> Đồng bộ & Bộ nhớ
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 max-w-4xl min-h-[400px]">
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-6 text-blue-800 dark:text-blue-300">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <i className="fa-solid fa-shield-halved"></i> Chế độ Bảo mật Cao
                            </h3>
                            <p className="text-sm mb-4">
                                Hệ thống đang chạy ở chế độ bảo mật. Thông tin kết nối Database được cấu hình trực tiếp trên <strong>Server (Backend)</strong>.
                                <br/>Việc thay đổi cấu hình từ trình duyệt đã bị vô hiệu hóa để đảm bảo an toàn.
                            </p>
                        </div>

                        <div className="border rounded-lg p-6 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                            <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-4 border-b dark:border-gray-600 pb-2">Thông tin kết nối Server</h4>
                            
                            {serverInfo ? (
                                <div className="grid grid-cols-1 gap-6 text-sm">
                                    <div>
                                        <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold mb-1">Trạng thái kết nối Database</label>
                                        {serverInfo.dbConnected ? (
                                            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-3 rounded font-bold flex items-center gap-2 text-base">
                                                <i className="fa-solid fa-check-circle text-xl"></i> Đang hoạt động ổn định
                                            </div>
                                        ) : (
                                            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-3 rounded font-bold flex items-center gap-2 text-base">
                                                <i className="fa-solid fa-circle-xmark text-xl"></i> Mất kết nối
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-500">
                                    Không tải được thông tin server.
                                </div>
                            )}

                            <div className="mt-6 flex justify-end">
                                <button 
                                    onClick={handleRetryConnection}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-md font-medium transition-colors flex items-center gap-2"
                                >
                                    <i className={`fa-solid fa-rotate-right ${isLoading ? 'animate-spin' : ''}`}></i>
                                    Thử kết nối lại
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6">
                         <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4 text-sm text-amber-800 dark:text-amber-300">
                            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                            <strong>Dung lượng lưu trữ:</strong> Trình duyệt chỉ cho phép lưu tối đa khoảng 5MB dữ liệu. Nếu bạn không dùng Cloud SQL, hãy thường xuyên dọn dẹp các kỳ sát hạch cũ để tránh lỗi không lưu được dữ liệu mới.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center text-center">
                                <div className="text-4xl font-bold text-gray-800 dark:text-white mb-2">{localCount}</div>
                                <div className="text-gray-600 dark:text-gray-400 font-medium">Kỳ sát hạch trên Trình duyệt</div>
                                
                                <div className="mt-6 w-full space-y-3">
                                    <button 
                                        onClick={handleSync}
                                        disabled={localCount === 0 || syncStatus === 'syncing' || !serverInfo?.dbConnected}
                                        className={`w-full py-2.5 px-4 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                                            localCount === 0 || !serverInfo?.dbConnected
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : syncStatus === 'syncing' 
                                                    ? 'bg-blue-400 cursor-wait' 
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {syncStatus === 'syncing' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                                        Đồng bộ lên Cloud SQL
                                    </button>

                                    <button 
                                        onClick={handleClearCache}
                                        disabled={localCount === 0}
                                        className="w-full py-2.5 px-4 rounded-lg font-bold text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-all flex items-center justify-center gap-2"
                                    >
                                        <i className="fa-solid fa-trash-can"></i>
                                        Xóa bộ nhớ trình duyệt
                                    </button>
                                </div>
                            </div>

                             {syncStatus === 'completed' && syncResult && (
                                <div className={`p-4 rounded-lg border ${syncResult.failed === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                                    <h4 className="font-bold flex items-center gap-2 text-sm">
                                        {syncResult.failed === 0 ? <i className="fa-solid fa-check-circle"></i> : <i className="fa-solid fa-circle-exclamation"></i>}
                                        Kết quả đồng bộ:
                                    </h4>
                                    <ul className="list-disc pl-6 mt-2 text-xs">
                                        <li>Thành công: <strong>{syncResult.success}</strong> kỳ sát hạch</li>
                                        {syncResult.failed > 0 && <li>Thất bại: <strong>{syncResult.failed}</strong> kỳ (Kiểm tra kết nối)</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};