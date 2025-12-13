import React, { useState, useEffect } from 'react';
import type { ReportMetadata, Attendee } from '../types';

interface ReportMetadataModalProps {
    initialMetadata: ReportMetadata;
    onSave: (metadata: ReportMetadata) => void;
    onClose: () => void;
}

export const ReportMetadataModal: React.FC<ReportMetadataModalProps> = ({ initialMetadata, onSave, onClose }) => {
    const [metadata, setMetadata] = useState<ReportMetadata>(initialMetadata);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMetadata(prev => ({ ...prev, [name]: value }));
    };

    const handleAttendeeChange = (index: number, field: 'name' | 'role', value: string) => {
        const newAttendees = [...metadata.attendees];
        newAttendees[index] = { ...newAttendees[index], [field]: value };
        setMetadata(prev => ({ ...prev, attendees: newAttendees }));
    };

    const handleAddAttendee = () => {
        const newAttendee: Attendee = { id: Date.now().toString(), name: '', role: '' };
        setMetadata(prev => ({ ...prev, attendees: [...prev.attendees, newAttendee] }));
    };
    
    const handleRemoveAttendee = (id: string) => {
        setMetadata(prev => ({ ...prev, attendees: prev.attendees.filter(a => a.id !== id) }));
    };

    const handleSaveChanges = () => {
        onSave(metadata);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Thiết lập thông tin biên bản</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </header>
                <main className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-semibold text-md mb-2">Thông tin buổi họp</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="meetingTime" className="block text-sm font-medium text-gray-700">Thời gian họp</label>
                                <input type="text" id="meetingTime" name="meetingTime" value={metadata.meetingTime} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="meetingLocation" className="block text-sm font-medium text-gray-700">Địa điểm</label>
                                <input type="text" id="meetingLocation" name="meetingLocation" value={metadata.meetingLocation} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="organizer" className="block text-sm font-medium text-gray-700">Đơn vị tổ chức</label>
                                <input type="text" id="organizer" name="organizer" value={metadata.organizer} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                             <div>
                                <label htmlFor="technicalErrorSBD" className="block text-sm font-medium text-gray-700">SBD xét lỗi kỹ thuật</label>
                                <input 
                                    type="text" 
                                    id="technicalErrorSBD" 
                                    name="technicalErrorSBD" 
                                    value={metadata.technicalErrorSBD || ''}
                                    onChange={handleChange} 
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
                                    placeholder="Ví dụ: 02,153,369"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-semibold text-md mb-2">Thành phần tham dự</h3>
                        <div className="space-y-3">
                            {metadata.attendees.map((attendee, index) => (
                                <div key={attendee.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-md">
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-gray-600">Tên/Cấp bậc</label>
                                        <input type="text" value={attendee.name} onChange={e => handleAttendeeChange(index, 'name', e.target.value)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                    </div>
                                    <div className="col-span-6">
                                        <label className="block text-xs font-medium text-gray-600">Chức vụ</label>
                                        <input type="text" value={attendee.role} onChange={e => handleAttendeeChange(index, 'role', e.target.value)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button onClick={() => handleRemoveAttendee(attendee.id)} className="text-red-500 hover:text-red-700 mt-5">
                                            <i className="fa-solid fa-trash-can"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button onClick={handleAddAttendee} className="mt-4 px-4 py-2 border border-dashed border-gray-400 text-gray-600 rounded-md hover:bg-gray-100 hover:border-gray-500 transition-colors flex items-center gap-2 text-sm">
                            <i className="fa-solid fa-plus"></i> Thêm thành viên
                        </button>
                    </div>

                </main>
                <footer className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Hủy</button>
                    <button onClick={handleSaveChanges} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Lưu thay đổi</button>
                </footer>
            </div>
        </div>
    );
};