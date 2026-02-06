
import type { Teacher, SchoolClass, Student, GradeEntryStatus, AssessmentLevel, ReportingPeriod, StudentAssessment } from '../types';

export const teachers: Teacher[] = [
  { id: 'gv01', name: 'Cô Mai' },
  { id: 'gv02', name: 'Thầy Tuấn' },
  { id: 'gv03', name: 'Cô Lan' },
  { id: 'gv04', name: 'Thầy Hùng' },
  { id: 'gv05', name: 'Cô Trúc' },
];

export const classes: SchoolClass[] = [
  { id: '5a1', name: 'Lớp 5A1', teacherId: 'gv01', grade: 5 },
  { id: '5a2', name: 'Lớp 5A2', teacherId: 'gv02', grade: 5 },
  { id: '5a3', name: 'Lớp 5A3', teacherId: 'gv03', grade: 5 },
  { id: '5a4', name: 'Lớp 5A4', teacherId: 'gv04', grade: 5 },
  { id: '5a5', name: 'Lớp 5A5', teacherId: 'gv05', grade: 5 },
  { id: '5a6', name: 'Lớp 5A6', teacherId: 'gv01', grade: 5 },
  { id: '5a7', name: 'Lớp 5A7', teacherId: 'gv02', grade: 5 },
  { id: '5a8', name: 'Lớp 5A8', teacherId: 'gv03', grade: 5 },
  { id: '5a9', name: 'Lớp 5A9', teacherId: 'gv04', grade: 5 },
  { id: '5a10', name: 'Lớp 5A10', teacherId: 'gv05', grade: 5 },
];

const subjects = ['Tiếng Việt', 'Toán', 'Ngoại ngữ 1', 'Đạo đức', 'Tự nhiên và Xã hội', 'Lịch sử và Địa lí', 'Khoa học', 'Tin học', 'Công nghệ', 'Âm nhạc', 'Mĩ thuật', 'Giáo dục thể chất'];

const determineOverallAssessment = (assessments: StudentAssessment[], period: ReportingPeriod): Student['overallAssessment'] => {
    const hasUnfinished = assessments.some(a => a.level === 'Chưa hoàn thành');
    if (hasUnfinished) return 'Chưa hoàn thành';

    const isEndTerm = period === 'end_term_1' || period === 'end_year';

    if (isEndTerm) {
        const goodCount = assessments.filter(a => a.level === 'Hoàn thành tốt').length;
        const hasLowScores = assessments.some(a => a.score !== undefined && a.score < 9);

        // According to TT27, "Hoàn thành Xuất sắc" requires all subjects HT Tốt and periodic tests >= 9
        if (goodCount === assessments.length && !hasLowScores) {
            return 'Hoàn thành xuất sắc';
        }

        // "Hoàn thành tốt" requires all subjects at least HT, and most are HT Tốt, periodic tests >= 7
        const hasVeryLowScores = assessments.some(a => a.score !== undefined && a.score < 7);
        if (goodCount > 0 && !hasVeryLowScores) {
            return 'Hoàn thành tốt';
        }
    }
    
    // For mid-terms, or if end-term conditions for XS/Tốt are not met, it's just "Hoàn thành"
    return 'Hoàn thành';
}

const generateBaseStudents = () => {
    let studentCounter = 1;
    return classes.flatMap(cls => {
        const studentList: Omit<Student, 'assessments' | 'overallAssessment'>[] = [];
        const numStudents = 28 + Math.floor(Math.random() * 8); // Slightly larger classes
        for (let i = 0; i < numStudents; i++) {
            studentList.push({
                id: studentCounter,
                name: `Học sinh ${studentCounter}`,
                classId: cls.id,
            });
            studentCounter++;
        }
        return studentList;
    });
}

const baseStudents = generateBaseStudents();

export const generateMockData = (period: ReportingPeriod) => {
    const periodFactors = {
        mid_term_1: { good: 0.5, ok: 0.4, bad: 0.1, entry: 0.7 },
        end_term_1: { good: 0.55, ok: 0.38, bad: 0.07, entry: 0.95 },
        mid_term_2: { good: 0.58, ok: 0.36, bad: 0.06, entry: 0.75 },
        end_year: { good: 0.6, ok: 0.35, bad: 0.05, entry: 1.0 },
    };
    const factors = periodFactors[period];
    const hasPeriodicTest = period === 'end_term_1' || period === 'end_year';

    const students: Student[] = baseStudents.map(baseStudent => {
        const studentClass = classes.find(c => c.id === baseStudent.classId)!;
        let studentSubjects = subjects.filter(s => {
            // Grade 5 has all subjects
            return true;
        });

        const assessments = studentSubjects.map(subject => {
            const rand = Math.random();
            let level: AssessmentLevel;
            if (rand < factors.good) level = 'Hoàn thành tốt';
            else if (rand < factors.good + factors.ok) level = 'Hoàn thành';
            else level = 'Chưa hoàn thành';

            let score: number | undefined = undefined;
            if (hasPeriodicTest && ['Toán', 'Tiếng Việt', 'Ngoại ngữ 1'].includes(subject)) {
                 score = 5 + Math.floor(Math.random() * 6); // Score from 5-10
            }

            return { subject, level, score };
        });

        // Force some specific issues for demonstration
        // Make 'Toán' the subject with the most 'Chưa hoàn thành'
        const toanIndex = assessments.findIndex(a => a.subject === 'Toán');
        if (toanIndex !== -1 && baseStudent.id % 7 < 1) { // ~14% of students
             assessments[toanIndex].level = 'Chưa hoàn thành';
        }
        
        // Make class '5A2' the class with the most students needing help
        if (studentClass.id === '5a2' && baseStudent.id % 4 === 0) { // 25% of students in this class
            const randomSubjectIndex = Math.floor(Math.random() * 3); // TV, Toán, NN1
            assessments[randomSubjectIndex].level = 'Chưa hoàn thành';
        }
        
        const overallAssessment = determineOverallAssessment(assessments, period);

        return {
            ...baseStudent,
            assessments,
            overallAssessment,
        };
    });

    const gradeEntryStatus: GradeEntryStatus[] = subjects.map(subject => {
        const total = students.filter(s => s.assessments.some(a => a.subject === subject)).length;
        const entered = Math.floor(total * (factors.entry - Math.random() * 0.1));
        return { subject, total, entered };
    });

    return { students, teachers, classes, gradeEntryStatus };
};
