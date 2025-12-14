
import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storageService';

export const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'database' | 'data' | 'general'>('database');
    const [serverInfo, setServerInfo] = useState<{ version: string; mode: string; dbConnected?: boolean } | null>(null);
    const [serverCheckLoading, setServerCheckLoading] = useState(true);
    
    // Default values matching server hardcoded defaults
    const [dbConfig, setDbConfig] = useState({
        host: '35.198.214.82',
        port: '5432',
        user: 'postgres',
        password: 'Appbaocao1!',
        database: 'Appbaocao',
        useSocket: false,
        instanceConnectionName: 'gen-lang-client-0477980628:asia-southeast1:appbaocao'
    });

    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<React.ReactNode | null>(null);

    // Sync State
    const [localCount, setLocalCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'completed'>('idle');
    const [syncResult, setSyncResult] = useState<{success: number, failed: number} | null>(null);

    const checkServer = async () => {
        setServerCheckLoading(true);
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
            setServerCheckLoading(false);
        }
    };

    // Check server status on mount
    useEffect(() => {
        checkServer();
        setLocalCount(storageService.getLocalSessionCount());
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setDbConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
        if (status !== 'idle') {
            setStatus('idle');
            setMessage(null);
        }
    };

    const handleTestConnection = async () => {
        setStatus('loading');
        setMessage(null);

        try {
            const response = await fetch('/api/check-db-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig),
            });

            if (!response.ok) throw new Error(`Http Error: ${response.status}`);
            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setMessage('Kết nối thử thành công!');
            } else {
                setStatus('error');
                setMessage(result.error || 'Kết nối thất bại');
            }
        } catch (err) {
            setStatus('error');
            setMessage((err as Error).message);
        }
    };

    const handleSaveAndConnect = async () => {
        setStatus('loading');
        setMessage('Đang lưu và kết nối...');

        try {
            // 1. Test first
            const testRes = await fetch('/api/check-db-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig),
            });
            const testResult = await testRes.json();
            
            if (!testResult.success) {
                throw new Error(`Kết nối thất bại: ${testResult.error}`);
            }

            // 2. Save to server
            const saveRes = await fetch('/api/save-db-config', {
                 method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig),
            });
            
            if (!saveRes.ok) throw new Error("Không thể lưu cấu hình vào server");
            
            setStatus('success');
            setMessage(
                <span>
                    Đã lưu và kết nối Database thành công! <br/>
                    Dữ liệu sẽ được lưu vào Cloud SQL.
                </span>
            );
            checkServer(); // Refresh server info
        } catch (err) {
            setStatus('error');
            setMessage((err as Error).message);
        }
    };

    const handleSync = async () => {
        if (!confirm('Bạn có muốn đẩy toàn bộ dữ liệu từ Trình duyệt lên Cloud SQL không? Dữ liệu trùng ID sẽ được ghi đè.')) return;
        
        setSyncStatus('syncing');
        const result = await storageService.syncLocalToCloud();
        
        setSyncStatus('completed');
        setSyncResult({ success: result.success, failed: result.failed });
        
        // Refresh local count (though it doesn't change, just for effect)
        setLocalCount(storageService.getLocalSessionCount());
    };

    const renderServerStatus = () => {
        if (serverCheckLoading) return (
            <span className="text-gray-400 text-xs flex items-center gap-2">
                <i className="fa-solid fa-spinner animate-spin"></i> Đang kiểm tra...
            </span>
        );
        
        if (!serverInfo) {
            return (
                <div className="flex items-center gap-2">
                    <div className="bg-red-100 border border-red-200 text-red-700 px-3 py-2 rounded text-xs flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        Không thể kết nối Backend Server.
                    </div>
                    <button onClick={checkServer} className="text-blue-600 hover:text-blue-800 text-xs underline"><i className="fa-solid fa-rotate"></i></button>
                </div>
            );
        }

        const isDbOk = serverInfo.dbConnected;

        return (
            <div className="flex items-center gap-3">
                 <div className={`border px-3 py-2 rounded text-xs flex items-center gap-2 ${isDbOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {isDbOk ? <i className="fa-solid fa-database"></i> : <i className="fa-solid fa-database opacity-50 relative"><div className="absolute inset-0 flex items-center justify-center text-red-600">\</div></i>}
                    <span className="font-bold">{isDbOk ? 'Cloud SQL: Connected' : 'Cloud SQL: Disconnected'}</span>
                </div>
                <div className="text-xs text-gray-500">v{serverInfo.version}</div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Cấu hình hệ thống</h2>
                    <p className="text-gray-500 mt-1">Kết nối Cloud SQL và quản lý dữ liệu.</p>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                    {renderServerStatus()}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-lg px-2 pt-2">
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'database' ? 'bg-blue-50 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('database')}
                >
                    <i className="fa-solid fa-database mr-2"></i> Cloud SQL
                </button>
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'data' ? 'bg-blue-50 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('data')}
                >
                    <i className="fa-solid fa-cloud-arrow-up mr-2"></i> Đồng bộ Dữ liệu
                </button>
                <button
                    className={`py-3 px-6 font-medium text-sm focus:outline-none rounded-t-lg transition-colors ${activeTab === 'general' ? 'bg-blue-50 border-t-2 border-blue-500 text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    onClick={() => setActiveTab('general')}
                >
                    <i className="fa-solid fa-sliders mr-2"></i> Chung
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 p-6 max-w-4xl min-h-[400px]">
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                            <i className="fa-solid fa-circle-info mr-2"></i>
                            Nhập thông tin Cloud SQL của bạn. Nhấn <strong>"Lưu & Kết nối"</strong> để áp dụng cho toàn bộ hệ thống.
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Connection Type Selection */}
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-2 cursor-pointer w-fit">
                                    <input 
                                        type="checkbox" 
                                        name="useSocket"
                                        checked={dbConfig.useSocket}
                                        onChange={handleChange}
                                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Sử dụng Unix Socket (Dành cho Cloud Run nội bộ)</span>
                                </label>
                            </div>

                            {!dbConfig.useSocket ? (
                                <>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Host (Public IP)</label>
                                        <input
                                            type="text"
                                            name="host"
                                            value={dbConfig.host}
                                            onChange={handleChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="35.198.xxx.xxx"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                                        <input
                                            type="text"
                                            name="port"
                                            value={dbConfig.port}
                                            onChange={handleChange}
                                            className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="5432"
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instance Connection Name</label>
                                    <input
                                        type="text"
                                        name="instanceConnectionName"
                                        value={dbConfig.instanceConnectionName}
                                        onChange={handleChange}
                                        className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="project:region:instance"
                                    />
                                </div>
                            )}

                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Database Name</label>
                                <input
                                    type="text"
                                    name="database"
                                    value={dbConfig.database}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    name="user"
                                    value={dbConfig.user}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={dbConfig.password}
                                    onChange={handleChange}
                                    className="w-full rounded-md border-gray-300 shadow-sm border p-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Actions & Result */}
                        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                             {/* Left: Status Message */}
                            <div className="flex-1 mr-4">
                                {status === 'success' && (
                                    <div className="text-green-600 flex items-center gap-2 text-sm font-semibold bg-green-50 p-2 rounded">
                                        <i className="fa-solid fa-circle-check"></i>
                                        {message}
                                    </div>
                                )}
                                {status === 'error' && (
                                    <div className="text-red-600 flex items-center gap-2 text-sm bg-red-50 p-2 rounded">
                                        <i className="fa-solid fa-triangle-exclamation"></i>
                                        {message}
                                    </div>
                                )}
                            </div>

                            {/* Right: Buttons */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={status === 'loading'}
                                    className="px-4 py-2 rounded-md font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Chỉ Test Kết nối
                                </button>
                                <button
                                    onClick={handleSaveAndConnect}
                                    disabled={status === 'loading'}
                                    className={`px-4 py-2 rounded-md font-bold text-white flex items-center gap-2 shadow-sm transition-colors ${
                                        status === 'loading' ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                >
                                    {status === 'loading' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-plug"></i>}
                                    Lưu & Kết nối
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6">
                         <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
                            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                            <strong>Chế độ Hybrid:</strong> Dữ liệu được lưu ưu tiên trên Cloud SQL. Nếu mất kết nối, dữ liệu sẽ được lưu tạm ở Trình duyệt (LocalStorage).
                            Sử dụng tính năng này để đẩy dữ liệu cũ từ Trình duyệt lên Cloud.
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center justify-center text-center">
                                <div className="text-4xl font-bold text-gray-800 mb-2">{localCount}</div>
                                <div className="text-gray-600 font-medium">Kỳ sát hạch đang lưu trên Trình duyệt</div>
                                <div className="text-xs text-gray-400 mt-1">Các kỳ này có thể chưa có trên Cloud SQL</div>
                                
                                <div className="mt-6 w-full max-w-xs">
                                    <button 
                                        onClick={handleSync}
                                        disabled={localCount === 0 || syncStatus === 'syncing' || !serverInfo?.dbConnected}
                                        className={`w-full py-3 px-4 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all ${
                                            localCount === 0 || !serverInfo?.dbConnected
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : syncStatus === 'syncing' 
                                                    ? 'bg-blue-400 cursor-wait' 
                                                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'
                                        }`}
                                    >
                                        {syncStatus === 'syncing' ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                                        {syncStatus === 'syncing' ? 'Đang đồng bộ...' : 'Đồng bộ ngay lên Cloud SQL'}
                                    </button>
                                </div>
                                {!serverInfo?.dbConnected && <p className="text-xs text-red-500 mt-2">Cần kết nối Cloud SQL để đồng bộ.</p>}
                            </div>

                             {syncStatus === 'completed' && syncResult && (
                                <div className={`p-4 rounded-lg border ${syncResult.failed === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                                    <h4 className="font-bold flex items-center gap-2">
                                        {syncResult.failed === 0 ? <i className="fa-solid fa-check-circle"></i> : <i className="fa-solid fa-circle-exclamation"></i>}
                                        Kết quả đồng bộ:
                                    </h4>
                                    <ul className="list-disc pl-6 mt-2 text-sm">
                                        <li>Thành công: <strong>{syncResult.success}</strong> kỳ sát hạch</li>
                                        {syncResult.failed > 0 && <li>Thất bại: <strong>{syncResult.failed}</strong> kỳ (Kiểm tra log server)</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="text-center py-10 text-gray-500">
                        <i className="fa-solid fa-sliders text-4xl mb-3 text-gray-300"></i>
                        <p>Chưa có thiết lập chung nào.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
