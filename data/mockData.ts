
import type { Teacher, SchoolClass, Student, GradeEntryStatus, AssessmentLevel, ReportingPeriod, StudentAssessment } from '../types';

export const teachers: Teacher[] = [
  { id: 'gv01', name: 'Cô Mai' },
  { id: 'gv02', name: 'Thầy Tuấn' },
  { id: 'gv03', name: 'Cô Lan' },
  { id: 'gv04', name: 'Thầy Hùng' },
  { id: 'gv05', name: 'Cô Trúc' },
];

export const classes: SchoolClass[] = [
  { id: '6a1', name: 'Lớp 6A1', teacherId: 'gv01', grade: 6 },
  { id: '6a2', name: 'Lớp 6A2', teacherId: 'gv02', grade: 6 },
  { id: '6a3', name: 'Lớp 6A3', teacherId: 'gv03', grade: 6 },
  { id: '7a1', name: 'Lớp 7A1', teacherId: 'gv04', grade: 7 },
  { id: '7a2', name: 'Lớp 7A2', teacherId: 'gv05', grade: 7 },
  { id: '7a3', name: 'Lớp 7A3', teacherId: 'gv01', grade: 7 },
  { id: '8a1', name: 'Lớp 8A1', teacherId: 'gv02', grade: 8 },
  { id: '8a2', name: 'Lớp 8A2', teacherId: 'gv03', grade: 8 },
  { id: '8a3', name: 'Lớp 8A3', teacherId: 'gv04', grade: 8 },
  { id: '9a1', name: 'Lớp 9A1', teacherId: 'gv05', grade: 9 },
  { id: '9a2', name: 'Lớp 9A2', teacherId: 'gv01', grade: 9 },
  { id: '9a3', name: 'Lớp 9A3', teacherId: 'gv02', grade: 9 },
];

const subjects = ['Tiếng Anh'];

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
        let studentSubjects = subjects;

        const assessments = studentSubjects.map(subject => {
            const rand = Math.random();
            let level: AssessmentLevel;
            if (rand < factors.good) level = 'Hoàn thành tốt';
            else if (rand < factors.good + factors.ok) level = 'Hoàn thành';
            else level = 'Chưa hoàn thành';

            let score: number | undefined = undefined;
            if (hasPeriodicTest && subject === 'Tiếng Anh') {
                 score = 5 + Math.floor(Math.random() * 6); // Score from 5-10
            }

            return { subject, level, score };
        });

        // Force some specific issues for demonstration
        // Make 'Tiếng Anh' the subject with the most 'Chưa hoàn thành'
        const englishIndex = assessments.findIndex(a => a.subject === 'Tiếng Anh');
        if (englishIndex !== -1 && baseStudent.id % 7 < 1) { // ~14% of students
             assessments[englishIndex].level = 'Chưa hoàn thành';
        }
        
        // Make class '6a1' the class with the most students needing help
        if (studentClass.id === '6a1' && baseStudent.id % 4 === 0) { // 25% of students in this class
            const randomSubjectIndex = 0; // Tiếng Anh
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
