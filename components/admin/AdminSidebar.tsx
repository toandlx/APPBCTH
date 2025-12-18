
import React from 'react';

interface AdminSidebarProps {
    currentView: 'dashboard' | 'create' | 'settings' | 'training-units' | 'aggregate-report' | 'student-lookup' | 'content-validation';
    onChangeView: (view: 'dashboard' | 'create' | 'settings' | 'training-units' | 'aggregate-report' | 'student-lookup' | 'content-validation') => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onChangeView, darkMode, onToggleDarkMode }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Danh sách Kỳ sát hạch', icon: 'fa-table-list' },
        { id: 'create', label: 'Tạo Kỳ sát hạch mới', icon: 'fa-circle-plus' },
        { id: 'content-validation', label: 'Kiểm tra Nội dung thi', icon: 'fa-file-shield' },
        { id: 'student-lookup', label: 'Tra cứu Thí sinh', icon: 'fa-magnifying-glass' },
        { id: 'aggregate-report', label: 'Báo cáo Tổng hợp', icon: 'fa-chart-simple' },
        { id: 'training-units', label: 'Đơn vị Đào tạo', icon: 'fa-building-columns' },
        { id: 'settings', label: 'Cấu hình hệ thống', icon: 'fa-gear' },
    ] as const;

    return (
        <aside className="w-64 bg-slate-800 dark:bg-slate-900 text-white flex flex-col h-full shadow-xl print:hidden transition-all duration-300">
            <div className="p-6 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-xl font-bold">
                        <i className="fa-solid fa-car-side"></i>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Quản Lý</h1>
                        <p className="text-xs text-slate-400">Sát Hạch Lái Xe</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onChangeView(item.id as any)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            currentView === item.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-300 hover:bg-slate-700 dark:hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            {/* Dark Mode Toggle */}
            <div className="px-4 py-3 border-t border-slate-700">
                <button 
                    onClick={onToggleDarkMode}
                    className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 dark:bg-slate-800 rounded-full hover:bg-slate-600 transition-colors"
                >
                    <span className="text-xs font-medium text-slate-300">Giao diện</span>
                    <div className="flex items-center gap-2">
                        <i className={`fa-solid fa-sun text-yellow-400 text-sm transition-opacity ${darkMode ? 'opacity-30' : 'opacity-100'}`}></i>
                        <div className={`w-8 h-4 bg-slate-900 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-500'}`}>
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </div>
                        <i className={`fa-solid fa-moon text-blue-300 text-sm transition-opacity ${darkMode ? 'opacity-100' : 'opacity-30'}`}></i>
                    </div>
                </button>
            </div>

            <div className="p-4 text-xs text-slate-500 text-center">
                <p>Phiên bản 3.7.2</p>
                <p>&copy; 2025 Driving Test Manager</p>
            </div>
        </aside>
    );
};
