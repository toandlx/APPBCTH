
import type { AppData } from './types';

export const MOCK_DATA: AppData = {
    firstTime: {
        title: 'a) Học viên dự thi lần đầu:',
        rows: [
            { class: 'B.01', totalApplications: 178, totalParticipants: 170, theory: { total: 122, pass: 91, fail: 31 }, simulation: { total: 121, pass: 94, fail: 27 }, practicalCourse: { total: 136, pass: 83, fail: 53 }, onRoad: { total: 103, pass: 103, fail: 0 }, finalPass: 87 },
            { class: 'B', totalApplications: 280, totalParticipants: 272, theory: { total: 206, pass: 153, fail: 53 }, simulation: { total: 206, pass: 167, fail: 39 }, practicalCourse: { total: 233, pass: 139, fail: 94 }, onRoad: { total: 182, pass: 155, fail: 27 }, finalPass: 129 },
            { class: 'C1', totalApplications: 68, totalParticipants: 65, theory: { total: 51, pass: 28, fail: 23 }, simulation: { total: 37, pass: 29, fail: 8 }, practicalCourse: { total: 47, pass: 43, fail: 4 }, onRoad: { total: 38, pass: 29, fail: 9 }, finalPass: 31 },
            { class: 'Cm', totalApplications: 24, totalParticipants: 22, theory: { total: 14, pass: 8, fail: 6 }, simulation: { total: 8, pass: 7, fail: 1 }, practicalCourse: { total: 10, pass: 8, fail: 2 }, onRoad: { total: 7, pass: 7, fail: 0 }, finalPass: 16 },
            { class: 'D2', totalApplications: 44, totalParticipants: 41, theory: { total: 32, pass: 22, fail: 10 }, simulation: { total: 25, pass: 23, fail: 2 }, practicalCourse: { total: 21, pass: 17, fail: 4 }, onRoad: { total: 16, pass: 14, fail: 2 }, finalPass: 24 },
            { class: 'Dm', totalApplications: 42, totalParticipants: 42, theory: { total: 40, pass: 33, fail: 7 }, simulation: { total: 41, pass: 35, fail: 6 }, practicalCourse: { total: 40, pass: 32, fail: 8 }, onRoad: { total: 40, pass: 28, fail: 12 }, finalPass: 20 },
            { class: 'CE', totalApplications: 51, totalParticipants: 51, theory: { total: 50, pass: 37, fail: 13 }, simulation: { total: 50, pass: 42, fail: 8 }, practicalCourse: { total: 46, pass: 44, fail: 2 }, onRoad: { total: 46, pass: 45, fail: 1 }, finalPass: 32 },
        ]
    },
    retake: {
        title: 'b) Thí sinh thuộc đối tượng cấp lại giấy phép lái xe và thí sinh tự do:',
        rows: [
            { class: 'B.01', totalApplications: 1, totalParticipants: 1, theory: { total: 1, pass: 0, fail: 1 }, simulation: { total: 0, pass: 0, fail: 0 }, practicalCourse: { total: 1, pass: 0, fail: 1 }, onRoad: { total: 0, pass: 0, fail: 0 }, finalPass: 0 },
            { class: 'B', totalApplications: 4, totalParticipants: 4, theory: { total: 4, pass: 3, fail: 1 }, simulation: { total: 0, pass: 0, fail: 0 }, practicalCourse: { total: 1, pass: 0, fail: 1 }, onRoad: { total: 1, pass: 1, fail: 0 }, finalPass: 3 },
            { class: 'Cm', totalApplications: 25, totalParticipants: 22, theory: { total: 14, pass: 12, fail: 2 }, simulation: { total: 7, pass: 3, fail: 4 }, practicalCourse: { total: 16, pass: 11, fail: 5 }, onRoad: { total: 11, pass: 11, fail: 0 }, finalPass: 13 },
            { class: 'C1', totalApplications: 8, totalParticipants: 7, theory: { total: 7, pass: 5, fail: 2 }, simulation: { total: 0, pass: 0, fail: 0 }, practicalCourse: { total: 3, pass: 1, fail: 2 }, onRoad: { total: 3, pass: 3, fail: 0 }, finalPass: 3 },
            { class: 'CE', totalApplications: 2, totalParticipants: 2, theory: { total: 1, pass: 0, fail: 1 }, simulation: { total: 2, pass: 2, fail: 0 }, practicalCourse: { total: 0, pass: 0, fail: 0 }, onRoad: { total: 0, pass: 0, fail: 0 }, finalPass: 1 },
            { class: 'D2', totalApplications: 8, totalParticipants: 8, theory: { total: 7, pass: 6, fail: 1 }, simulation: { total: 5, pass: 5, fail: 0 }, practicalCourse: { total: 6, pass: 5, fail: 1 }, onRoad: { total: 5, pass: 4, fail: 1 }, finalPass: 5 },
            { class: 'Dm', totalApplications: 2, totalParticipants: 2, theory: { total: 1, pass: 1, fail: 0 }, simulation: { total: 1, pass: 1, fail: 0 }, practicalCourse: { total: 1, pass: 0, fail: 1 }, onRoad: { total: 2, pass: 1, fail: 1 }, finalPass: 1 },
        ]
    }
};
