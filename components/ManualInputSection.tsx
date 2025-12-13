import React, { useState } from 'react';
import type { AppData, LicenseClassData, TestResult, TestType } from '../types';
import { LicenseClassFormRow } from './LicenseClassFormRow';

interface ManualInputSectionProps {
    onSubmit: (data: AppData) => void;
}

const newRowTemplate: LicenseClassData = {
    class: '',
    totalApplications: 0,
    totalParticipants: 0,
    theory: { total: 0, pass: 0, fail: 0 },
    simulation: { total: 0, pass: 0, fail: 0 },
    practicalCourse: { total: 0, pass: 0, fail: 0 },
    onRoad: { total: 0, pass: 0, fail: 0 },
    finalPass: 0,
};

const initialData: AppData = {
    firstTime: {
        title: 'a) Học viên dự thi lần đầu:',
        rows: [{ ...newRowTemplate, class: 'B2' }],
    },
    retake: {
        title: 'b) Thí sinh thuộc đối tượng cấp lại giấy phép lái xe và thí sinh tự do:',
        rows: [],
    }
};

export const ManualInputSection: React.FC<ManualInputSectionProps> = ({ onSubmit }) => {
    const [formData, setFormData] = useState<AppData>(initialData);

    const handleDataChange = (
        dataType: 'firstTime' | 'retake',
        rowIndex: number,
        field: string,
        value: string | number
    ) => {
        setFormData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));
            const row = newData[dataType].rows[rowIndex];
            
            const [mainField, subField] = field.split('.');
            
            const numericValue = value === '' ? 0 : Number(value);

            if (subField) {
                row[mainField][subField] = numericValue;
            } else {
                 if (field === 'class') {
                    row[field] = value;
                } else {
                    row[field] = numericValue;
                }
            }

            // Auto-calculate fails
            if (field.endsWith('.total') || field.endsWith('.pass')) {
                 const testType = mainField as TestType;
                 const test = row[testType] as TestResult;
                 if (test && typeof test.total === 'number' && typeof test.pass === 'number') {
                    test.fail = Math.max(0, test.total - test.pass);
                 }
            }
            
            return newData;
        });
    };

    const handleAddRow = (dataType: 'firstTime' | 'retake') => {
        setFormData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));
            newData[dataType].rows.push({ ...newRowTemplate });
            return newData;
        });
    };
    
    const handleRemoveRow = (dataType: 'firstTime' | 'retake', rowIndex: number) => {
         setFormData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData));
            newData[dataType].rows.splice(rowIndex, 1);
            return newData;
        });
    };

    const renderFormSection = (dataType: 'firstTime' | 'retake') => {
        const data = formData[dataType];
        return (
            <div className="mb-12">
                <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4 text-lg">{data.title}</h4>
                {data.rows.map((row, index) => (
                    <LicenseClassFormRow 
                        key={index}
                        data={row}
                        onChange={(field, value) => handleDataChange(dataType, index, field, value)}
                        onRemove={() => handleRemoveRow(dataType, index)}
                    />
                ))}
                <button
                    onClick={() => handleAddRow(dataType)}
                    className="mt-4 px-4 py-2 border border-dashed border-gray-400 text-gray-600 rounded-md hover:bg-gray-100 hover:border-gray-500 transition-colors flex items-center gap-2 text-sm"
                >
                    <i className="fa-solid fa-plus"></i> Thêm hạng GPLX
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-50 rounded-lg">
            {renderFormSection('firstTime')}
            {renderFormSection('retake')}

            <div className="mt-8 flex justify-end">
                <button
                    onClick={() => onSubmit(formData)}
                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-chart-pie"></i> Tạo Báo Cáo
                </button>
            </div>
        </div>
    )
}
