
import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const bgColors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        info: 'fa-circle-info'
    };

    return (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg text-white ${bgColors[type]} animate-fade-in-down transition-all transform hover:scale-105 cursor-pointer`} onClick={onClose}>
            <i className={`fa-solid ${icons[type]} text-xl`}></i>
            <span className="font-medium">{message}</span>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-4 opacity-70 hover:opacity-100">
                <i className="fa-solid fa-xmark"></i>
            </button>
        </div>
    );
};
