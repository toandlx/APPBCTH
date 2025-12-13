import React, { useState, useEffect } from 'react';

export const SettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'database' | 'general'>('database');
    const [serverInfo, setServerInfo] = useState<{ version: string; mode: string } | null>(null);
    const [serverCheckLoading, setServerCheckLoading] = useState(true);
    
    // Default values
    const [dbConfig, setDbConfig] = useState({
        host: '35.198.214.82',
        port: '5432',
        user: 'postgres',
        password: 'Appbaocao1!',
        database: 'Appbaocao',
        useSocket: false,
        instanceConnectionName: 'gen-lang-client-0477980628:asia-southeast1:appbaocao'
    });

    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<React.ReactNode | null>(null);

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
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setDbConfig(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
        if (testStatus !== 'idle') {
            setTestStatus('idle');
            setTestMessage(null);
        }
    };

    const handleTestConnection = async () => {
        setTestStatus('loading');
        setTestMessage(null);

        try {
            const response = await fetch('/api/check-db-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dbConfig),
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('API_MISSING');
                }
                throw new Error(`Http Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success) {
                setTestStatus('success');
                setTestMessage(result.message);
            } else {
                setTestStatus('error');
                setTestMessage(result.error || 'Kết nối thất bại');
            }
        } catch (err) {
            setTestStatus('error');
            if ((err as Error).message === 'API_MISSING') {
                setTestMessage(
                    <div className="flex flex-col gap-1 text-left">
                        <strong><i className="fa-solid fa-triangle-exclamation"></i> Lỗi: Server chưa nhận Code mới (API 404).</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-xs font-normal">
                            <li>
                                <strong>Nếu chạy Local/IDX:</strong> Hãy tắt terminal và chạy lại lệnh <code className="bg-red-100 px-1 rounded">node server.js</code>
                            </li>
                            <li>
                                <strong>Nếu chạy Cloud Run:</strong> Bạn cần <strong>Deploy New Revision</strong> để cập nhật code mới.
                            </li>
                        </ul>
                    </div>
                );
            } else {
                setTestMessage((err as Error).message);
            }
        }
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
                    <button 
                        onClick={checkServer} 
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                        title="Thử lại kết nối"
                    >
                        <i className="fa-solid fa-rotate"></i>
                    </button>
                </div>
            );
        }

        const isOutdated = serverInfo.version !== '3.3.2'; // Match current version
        return (
            <div className={`border px-3 py-2 rounded text-xs flex items-center justify-between gap-2 ${isOutdated ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-700'}`}>
                <div className="flex items-center gap-2">
                    <i className={`fa-solid ${isOutdated ? 'fa-clock-rotate-left' : 'fa-server'}`}></i>
                    <span>
                        Backend: <strong>v{serverInfo.version}</strong> ({serverInfo.mode})
                        {isOutdated && <span className="ml-1 font-bold">- Cần Reset Server!</span>}
                    </span>
                    <button onClick={checkServer} className="ml-2 hover:bg-black/10 rounded-full w-5 h-5 flex items-center justify-center transition-colors">
                        <i className="fa-solid fa-rotate"></i>
                    </button>
                </div>
                {isOutdated && <span className="text-[10px] uppercase font-bold tracking-wider">Cũ</span>}
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 h-full overflow-y-auto bg-gray-100">
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Cấu hình hệ thống</h2>
                    <p className="text-gray-500 mt-1">Quản lý kết nối cơ sở dữ liệu và các thiết lập khác.</p>
                </div>
                <div className="w-full md:w-auto flex justify-end">
                    {renderServerStatus()}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'database' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('database')}
                >
                    <i className="fa-solid fa-database mr-2"></i> Cơ sở dữ liệu
                </button>
                <button
                    className={`py-2 px-4 font-medium text-sm focus:outline-none ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('general')}
                >
                    <i className="fa-solid fa-sliders mr-2"></i> Chung
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl">
                {activeTab === 'database' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
                            <i className="fa-solid fa-circle-info mr-2"></i>
                            Công cụ này dùng để kiểm tra kết nối từ Server đến Database. Thông tin nhập dưới đây chỉ dùng để test và <strong>không được lưu lại</strong> vào cấu hình server.
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
                                    <span className="text-sm font-medium text-gray-700">Sử dụng Unix Socket (Cloud Run)</span>
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
                        <div className="pt-4 border-t border-gray-100 flex items-center gap-4">
                            <button
                                onClick={handleTestConnection}
                                disabled={testStatus === 'loading'}
                                className={`px-4 py-2 rounded-md font-medium text-white flex items-center gap-2 shadow-sm transition-colors ${
                                    testStatus === 'loading' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {testStatus === 'loading' && <i className="fa-solid fa-spinner animate-spin"></i>}
                                Test Connection
                            </button>

                            {testStatus === 'success' && (
                                <div className="text-green-600 flex items-center gap-2 text-sm font-semibold">
                                    <i className="fa-solid fa-circle-check"></i>
                                    {testMessage}
                                </div>
                            )}

                            {testStatus === 'error' && (
                                <div className="text-red-600 flex items-center gap-2 text-sm">
                                    {testMessage}
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