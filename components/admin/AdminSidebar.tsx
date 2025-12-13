import React from 'react';

interface AdminSidebarProps {
    currentView: 'dashboard' | 'create' | 'settings';
    onChangeView: (view: 'dashboard' | 'create' | 'settings') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, onChangeView }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Danh sách Kỳ sát hạch', icon: 'fa-table-list' },
        { id: 'create', label: 'Tạo Kỳ sát hạch mới', icon: 'fa-circle-plus' },
        { id: 'settings', label: 'Cấu hình hệ thống', icon: 'fa-gear' },
    ] as const;

    return (
        <aside className="w-64 bg-slate-800 text-white flex flex-col h-full shadow-xl print:hidden transition-all duration-300">
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
                        onClick={() => onChangeView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            currentView === item.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
                        <span className="font-medium">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700 text-xs text-slate-500 text-center">
                <p>Phiên bản 3.3.2</p>
                <p>&copy; 2025 Driving Test Manager</p>
            </div>
        </aside>
    );
};