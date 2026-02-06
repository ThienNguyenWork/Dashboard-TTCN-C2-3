
import type React from 'react';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Types for Gradebook Dashboard
export type AssessmentLevel = 'Hoàn thành tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
export type QualityLevel = 'Tốt' | 'Đạt' | 'Cần cố gắng';
export type ReportingPeriod = 'mid_term_1' | 'end_term_1' | 'mid_term_2' | 'end_year';

export interface StudentAssessment {
  subject: string;
  level: AssessmentLevel;
  score?: number; // For periodic tests (KTĐK)
}

export interface Student {
  id: number;
  name: string;
  classId: string;
  assessments: StudentAssessment[];
  overallAssessment: AssessmentLevel | 'Hoàn thành xuất sắc';
}

export interface Teacher {
  id: string;
  name: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  grade: number;
}

export interface GradeEntryStatus {
    subject: string;
    total: number;
    entered: number;
}
