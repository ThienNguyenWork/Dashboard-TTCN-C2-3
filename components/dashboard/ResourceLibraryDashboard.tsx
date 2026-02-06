
import React, { useState, useMemo } from 'react';
import { InformationCircleIcon, WarningIcon, CheckCircleIcon } from '../Icons';

// --- TYPE DEFINITIONS ---
type MainView = 'dashboard' | 'teachers_detail' | 'units_detail' | 'resource_types_detail';
type Tab = 'overview' | 'analysis' | 'leaderboard';
type TeacherSortKey = 'name' | 'departmentName' | 'value';

interface StatCard {
  title: string;
  value: string;
  icon: string; // SVG path
  color: 'blue' | 'green' | 'purple' | 'yellow';
  change?: string;
  changeType?: 'increase' | 'decrease';
  action?: MainView;
  tooltipRule?: string; // Business logic explanation
}

interface ApprovalStatus {
  status: 'Approved' | 'Pending' | 'Rejected';
  count: number;
}

interface DataPoint {
  label: string;
  value: number;
}

interface UnitLeaderboardItem {
  id: string;
  name: string; // Tên tổ chuyên môn
  value: number;
}

interface FullTeacherInfo {
  name: string;
  departmentId: string;
  departmentName: string; // Tên tổ
  value: number;
}

interface TeacherContribution {
  name: string;
  count: number;
}

interface DepartmentContribution {
  name: string;
  total: number;
  teachers: TeacherContribution[];
}

interface MonthlyContributionDetail {
  label: string;
  total: number;
  departments: DepartmentContribution[];
}

interface ResourceTypeData {
    name: string;
    count: number;
    color: string;
    iconPath: string;
}

// --- MOCK DATA GENERATION ---
// Danh sách tổ chuyên môn trong trường (Đã bỏ Tổ Văn phòng)
const DEPARTMENTS = [
    { id: 'TO-TOAN', name: 'Tổ Toán - Tin' },
    { id: 'TO-VAN', name: 'Tổ Ngữ Văn' },
    { id: 'TO-KHTN', name: 'Tổ Khoa học Tự nhiên' }, // Lý, Hóa, Sinh
    { id: 'TO-KHXH', name: 'Tổ Khoa học Xã hội' }, // Sử, Địa, GDCD
    { id: 'TO-NN', name: 'Tổ Ngoại Ngữ' },
    { id: 'TO-TC', name: 'Tổ Thể chất - Nghệ thuật' }
];

const RESOURCE_TYPES_DETAIL: ResourceTypeData[] = [
    { name: 'Hình ảnh', count: 500, color: '#3B82F6', iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { name: 'Video', count: 300, color: '#EF4444', iconPath: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { name: 'Tài liệu', count: 400, color: '#6B7280', iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Tương tác - AI', count: 150, color: '#8B5CF6', iconPath: 'M13 10V3L4 14h7v7l9-11h-7z' }, // Lightning bolt for AI/Interaction
    { name: 'Tương tác - H5P', count: 200, color: '#F59E0B', iconPath: 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11' }, // Finger print/Touch interaction metaphor
    { name: 'Âm thanh', count: 100, color: '#10B981', iconPath: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
    { name: 'Thí nghiệm ảo', count: 79, color: '#EC4899', iconPath: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' }
];

// Dữ liệu các tổ - Simulating some with 0 contributions
const unitData = DEPARTMENTS.map(dept => {
    // Force specific departments to have 0 for demonstration (Tổ Thể chất)
    if (dept.id === 'TO-TC') {
        return { id: dept.id, name: dept.name, value: 0 };
    }
    return {
        id: dept.id,
        name: dept.name,
        value: Math.floor(Math.random() * 300) + 10
    };
}).sort((a,b) => b.value - a.value);

const contributingUnitsCount = unitData.filter(u => u.value > 0).length;
const totalUnitsCount = DEPARTMENTS.length;
const participationRate = Math.round((contributingUnitsCount / totalUnitsCount) * 100);


const STAT_CARDS_DATA: StatCard[] = [
  { 
      title: 'Tổng số học liệu', 
      value: '1,729', 
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', 
      color: 'blue', 
      change: '+45 so với tháng trước', 
      changeType: 'increase', 
      action: 'resource_types_detail',
      tooltipRule: 'Tổng số lượng học liệu số hiện có trong kho dữ liệu của nhà trường.'
  },
  { 
      title: 'Học liệu đã duyệt', 
      value: '1,652', 
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
      color: 'green', 
      change: '+32 so với tháng trước', 
      changeType: 'increase',
      tooltipRule: "Số lượng học liệu số đã được ban chuyên môn phê duyệt thành phạm vi Cấp trường."
  },
  { 
      title: 'Giáo viên đóng góp', 
      value: '48', 
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', 
      color: 'purple', 
      change: '+2 so với tháng trước', 
      changeType: 'increase', 
      action: 'teachers_detail',
      tooltipRule: 'Số lượng giáo viên đã tham gia đóng góp ít nhất một học liệu lên hệ thống.'
  },
  { 
      title: 'Tổ chuyên môn', 
      value: `${contributingUnitsCount}`, 
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', 
      color: 'yellow', 
      change: `${participationRate}% tham gia`, 
      changeType: 'increase', 
      action: 'units_detail',
      tooltipRule: 'Số lượng Tổ chuyên môn có thành viên tham gia đóng góp học liệu.'
  }
];

const APPROVAL_STATUS_DATA: ApprovalStatus[] = [
  { status: 'Approved', count: 1652 },
  { status: 'Pending', count: 65 }, // Số lượng chờ duyệt ít hơn vì quy mô trường
  { status: 'Rejected', count: 12 }
];

// Dữ liệu đóng góp theo tháng (giả lập cho trường)
const DETAILED_CONTRIBUTIONS_DATA: MonthlyContributionDetail[] = [
    { label: 'T8', total: 120, departments: [ { name: 'Tổ Toán - Tin', total: 50, teachers: [] }, { name: 'Tổ Ngữ Văn', total: 30, teachers: [] } ]},
    { label: 'T9', total: 250, departments: [ { name: 'Tổ KHTN', total: 100, teachers: [] } ] },
    { label: 'T10', total: 300, departments: [ { name: 'Tổ Toán - Tin', total: 120, teachers: [] } ] },
    { label: 'T11', total: 450, departments: [ { name: 'Tổ KHXH', total: 150, teachers: [] } ] }, // Thi đua 20/11
    { label: 'T12', total: 200, departments: [ { name: 'Tổ Ngoại Ngữ', total: 80, teachers: [] } ] },
    { label: 'T1', total: 150, departments: [ { name: 'Tổ Toán - Tin', total: 60, teachers: [] } ] },
    { label: 'T2', total: 180, departments: [ { name: 'Tổ KHTN', total: 70, teachers: [] } ] },
    { label: 'T3', total: 250, departments: [ { name: 'Tổ Thể chất - Nghệ thuật', total: 90, teachers: [] } ] } // Thi đua 26/3
];

const MATERIALS_BY_SUBJECT_DATA: DataPoint[] = [
    { label: 'Toán', value: 450 }, { label: 'Ngữ văn', value: 380 }, { label: 'Tiếng Anh', value: 320 },
    { label: 'KHTN (Lý/Hóa/Sinh)', value: 290 }, { label: 'Lịch sử & Địa lí', value: 150 }, { label: 'Tin học', value: 120 },
    { label: 'GDCD', value: 80 }, { label: 'Công nghệ', value: 75 }, { label: 'Âm nhạc/Mĩ thuật', value: 60 },
    { label: 'GDTC', value: 45 }
];

const MATERIALS_BY_GRADE_DATA: DataPoint[] = [
    { label: 'Khối 6', value: 580 }, // Chương trình mới, nhiều học liệu
    { label: 'Khối 7', value: 520 },
    { label: 'Khối 8', value: 350 },
    { label: 'Khối 9', value: 280 }  // Chương trình cũ, ít học liệu số hơn
];

const originalUnitMap = new Map<string, string>(unitData.map(u => [u.id, u.name]));

// Dữ liệu giáo viên tiêu biểu trong trường
const teacherData = [
  { name: 'Nguyễn Văn An', departmentId: 'TO-TOAN', value: 88 },
  { name: 'Trần Thị Bích', departmentId: 'TO-VAN', value: 81 },
  { name: 'Lê Minh Cường', departmentId: 'TO-KHTN', value: 75 },
  { name: 'Phạm Thuỳ Dung', departmentId: 'TO-NN', value: 72 },
  { name: 'Hoàng Quốc Việt', departmentId: 'TO-TOAN', value: 68 }
];

const TOP_CONTRIBUTING_UNITS_DATA: UnitLeaderboardItem[] = unitData;

const TOP_CONTRIBUTING_TEACHERS_DATA: FullTeacherInfo[] = teacherData.map(teacher => ({
  name: teacher.name,
  value: teacher.value,
  departmentId: teacher.departmentId,
  departmentName: originalUnitMap.get(teacher.departmentId) || 'Không xác định',
}));

// --- Full Lists for Detail Pages ---
const ALL_UNITS_DATA: UnitLeaderboardItem[] = TOP_CONTRIBUTING_UNITS_DATA;

const ALL_TEACHERS_DATA: FullTeacherInfo[] = [
    ...TOP_CONTRIBUTING_TEACHERS_DATA,
    ...Array.from({ length: 120 }, (_, i) => {
        const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
        
        // Nếu là Tổ Thể chất (đã fix 0 học liệu), thì giáo viên cũng phải 0 học liệu
        const isZeroUnit = dept.id === 'TO-TC';
        
        const hasContribution = isZeroUnit ? false : Math.random() > 0.3; // 30% have 0 contribution
        return { 
            name: `Giáo viên ${dept.name.split(' ')[1]} ${i + 6}`, 
            departmentId: dept.id, 
            departmentName: dept.name, 
            value: hasContribution ? Math.floor(Math.random() * 60) + 1 : 0
        };
    })
].sort((a, b) => b.value - a.value);

// Helper Component for Tooltips
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
    return (
        <div className="group/tooltip relative ml-2 inline-flex items-center z-50">
            {/* Icon trigger - Tooltip only appears when hovering THIS element due to group/tooltip */}
            <InformationCircleIcon className="h-5 w-5 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-help transition-colors" />
            
            {/* Tooltip Container - Positioned BELOW - CENTERED */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 max-w-[90vw] p-3 bg-gray-900/95 backdrop-blur-sm text-white text-xs rounded-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-2xl border border-gray-700/50 text-left whitespace-normal pointer-events-none">
                
                {/* Content */}
                <p className="font-medium text-sm text-white leading-snug">
                    {text}
                </p>

                {/* Arrow - Positioned at the TOP of the tooltip pointing UP - CENTERED */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-b-gray-900/95"></div>
            </div>
        </div>
    );
};

export const ResourceLibraryDashboard: React.FC = () => {
    // State
    const [mainView, setMainView] = useState<MainView>('dashboard');
    const [selectedTab, setSelectedTab] = useState<Tab>('overview');
    const [hoveredStatus, setHoveredStatus] = useState<ApprovalStatus['status'] | null>(null);
    const [unitSearchQuery, setUnitSearchQuery] = useState<string>('');
    const [teacherSearchQuery, setTeacherSearchQuery] = useState<string>('');
    const [teacherSortConfig, setTeacherSortConfig] = useState<{ key: TeacherSortKey, direction: 'asc' | 'desc' }>({ key: 'value', direction: 'desc' });
    const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);

    // Mock Data State
    const statCards = STAT_CARDS_DATA;
    const approvalStatus = APPROVAL_STATUS_DATA;
    const detailedContributions = DETAILED_CONTRIBUTIONS_DATA;
    const materialsBySubject = MATERIALS_BY_SUBJECT_DATA;
    const materialsByGrade = MATERIALS_BY_GRADE_DATA;
    const topUnits = TOP_CONTRIBUTING_UNITS_DATA.filter(u => u.value > 0).slice(0, 5); // Filter 0 and slice
    const topTeachers = TOP_CONTRIBUTING_TEACHERS_DATA;
    const allUnits = ALL_UNITS_DATA;
    const allTeachers = ALL_TEACHERS_DATA;

    // Logic
    const filteredUnits = useMemo(() => {
        const query = unitSearchQuery.toLowerCase();
        if (!query) return allUnits;
        return allUnits.filter(unit => 
            unit.name.toLowerCase().includes(query) || 
            unit.id.toLowerCase().includes(query)
        );
    }, [unitSearchQuery, allUnits]);

    const sortedAndFilteredTeachers = useMemo(() => {
        const query = teacherSearchQuery.toLowerCase();
        const { key, direction } = teacherSortConfig;

        let teachers = allTeachers;

        // Filter
        if (query) {
          teachers = teachers.filter(teacher =>
            teacher.name.toLowerCase().includes(query) ||
            teacher.departmentName.toLowerCase().includes(query)
          );
        }

        // Sort
        return [...teachers].sort((a, b) => {
          const valA = a[key];
          const valB = b[key];
          let comparison = 0;

          if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
          } else {
            comparison = String(valA).localeCompare(String(valB));
          }

          return direction === 'asc' ? comparison : -comparison;
        });
    }, [teacherSearchQuery, teacherSortConfig, allTeachers]);

    // Computed chart data
    const contributionsOverTime = useMemo(() => 
        detailedContributions.map(month => ({ label: month.label, value: month.total })),
    [detailedContributions]);

    const totalMaterials = useMemo(() => approvalStatus.reduce((acc, curr) => acc + curr.count, 0), [approvalStatus]);
    const maxSubjectValue = useMemo(() => Math.max(...materialsBySubject.map(s => s.value)), [materialsBySubject]);
    const maxGradeValue = useMemo(() => Math.max(...materialsByGrade.map(s => s.value)), [materialsByGrade]);
    
    const maxContributionValue = useMemo(() => {
        const values = contributionsOverTime.map(item => item.value);
        if (values.length === 0) return 100;
        const max = Math.max(...values);
        return Math.ceil(max / 100) * 100;
    }, [contributionsOverTime]);

    const donutChartSegments = useMemo(() => {
        const total = totalMaterials;
        if (total === 0) return [];
    
        const radius = 45;
        const circumference = 2 * Math.PI * radius;
        const colors: {[key in ApprovalStatus['status']]: string} = { 'Approved': '#10B981', 'Pending': '#F59E0B', 'Rejected': '#EF4444' };
        let accumulatedPercentage = 0;
    
        return approvalStatus.map(status => {
            const percentage = (status.count / total) * 100;
            const dashLength = (percentage / 100) * circumference;
            const rotation = accumulatedPercentage * 3.6;
            accumulatedPercentage += percentage;
            return {
              ...status,
              strokeDashArray: `${dashLength} ${circumference}`,
              transform: `rotate(${rotation}, 50, 50)`,
              color: colors[status.status]
            };
        });
    }, [totalMaterials, approvalStatus]);

    const donutDisplayText = useMemo(() => {
        if (hoveredStatus) {
            const statusData = approvalStatus.find(s => s.status === hoveredStatus);
            return { value: statusData?.count ?? 0, label: getVietnameseStatus(hoveredStatus) };
        }
        return { value: totalMaterials, label: 'Tổng cộng' };
    }, [hoveredStatus, totalMaterials, approvalStatus]);

    const lineChartPoints = useMemo(() => {
        const data = contributionsOverTime;
        const maxVal = maxContributionValue;
        if (!data.length || maxVal === 0) return [];
        return data.map((item, index) => ({ ...item, x: (index / (data.length - 1)) * 100, y: 98 - (item.value / maxVal) * 96 }));
    }, [contributionsOverTime, maxContributionValue]);
    
    const lineChartPath = useMemo(() => {
        if (lineChartPoints.length < 2) return '';
        return lineChartPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ');
    }, [lineChartPoints]);
    
    const areaChartPath = useMemo(() => {
        if (!lineChartPath || lineChartPoints.length < 2) return '';
        return `${lineChartPath} L ${lineChartPoints[lineChartPoints.length - 1].x},100 L ${lineChartPoints[0].x},100 Z`;
    }, [lineChartPath, lineChartPoints]);

    // Handlers
    const sortTeachers = (key: TeacherSortKey) => {
        setTeacherSortConfig(prev => {
            if (prev.key === key) {
                return { ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: key === 'value' ? 'desc' : 'asc' };
        });
    };

    function getVietnameseStatus(status: ApprovalStatus['status']): string {
        switch (status) {
          case 'Approved': return 'Đã duyệt';
          case 'Pending': return 'Chờ duyệt';
          case 'Rejected': return 'Bị từ chối';
        }
    }

    // Render Components
    const renderDashboard = () => (
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map(card => (
                    <div 
                        key={card.title}
                        onClick={() => card.action ? setMainView(card.action) : null}
                        className={`
                            bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 
                            flex flex-col justify-between 
                            transition-all duration-300 group
                            ${card.action ? 'cursor-pointer hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-500 hover:-translate-y-1' : ''}
                        `}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center">
                                    <p className="text-sm font-medium text-slate-500 dark:text-gray-400">{card.title}</p>
                                    {card.tooltipRule && <InfoTooltip text={card.tooltipRule} />}
                                </div>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{card.value}</p>
                            </div>
                            <div className={`rounded-full p-3 
                                ${card.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : ''}
                                ${card.color === 'green' ? 'bg-green-100 dark:bg-green-900/30' : ''}
                                ${card.color === 'purple' ? 'bg-purple-100 dark:bg-purple-900/30' : ''}
                                ${card.color === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}
                            `}>
                                <svg className={`h-6 w-6 
                                    ${card.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : ''}
                                    ${card.color === 'green' ? 'text-green-600 dark:text-green-400' : ''}
                                    ${card.color === 'purple' ? 'text-purple-600 dark:text-purple-400' : ''}
                                    ${card.color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                                `} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={card.icon} />
                                </svg>
                            </div>
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                            {card.change && (
                                <div className={`flex items-center text-xs ${card.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {card.changeType === 'increase' && (
                                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    <span>{card.change}</span>
                                </div>
                            )}

                             {card.action && (
                                <div className="ml-auto flex items-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200 text-xs px-3 py-1 rounded-full transition-colors font-semibold group-hover:bg-indigo-100 group-hover:text-indigo-700 dark:group-hover:bg-indigo-900/50 dark:group-hover:text-indigo-300">
                                    Chi tiết
                                    <svg className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                    </svg>
                                </div>
                             )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Tab Navigation */}
            <div className="mb-8">
                <div className="border-b border-slate-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {[
                            { id: 'overview', label: 'Tổng quan' },
                            { id: 'analysis', label: 'Phân tích môn/khối' },
                            { id: 'leaderboard', label: 'Thi đua Tổ/Giáo viên' }
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id as Tab)} 
                                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none
                                    ${selectedTab === tab.id 
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

             {/* Tab Content */}
             {selectedTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                            <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tiến trình đóng góp học liệu theo tháng</h3>
                                <InfoTooltip text="Thống kê số lượng học liệu mới được tải lên theo từng tháng." />
                            </div>
                            <div className="h-96 relative">
                                <div className="absolute top-0 left-0 h-full w-full flex flex-col justify-between pointer-events-none pr-4">
                                    {[4,3,2,1,0].map((multiplier) => (
                                        <div key={multiplier} className="flex items-center">
                                            <span className="text-xs text-slate-400 w-10 text-right pr-2">{Math.round(maxContributionValue / 4 * multiplier)}</span>
                                            <div className="flex-1 border-b border-dashed border-slate-200 dark:border-gray-600"></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-0 left-[48px] right-0 bottom-[24px]">
                                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute top-0 left-0">
                                        <defs>
                                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d={areaChartPath} fill="url(#areaGradient)" vectorEffect="non-scaling-stroke" />
                                        <path d={lineChartPath} fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                    {lineChartPoints.map(point => (
                                        <div key={point.label} className="absolute group" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: 'translate(-50%, -50%)' }}>
                                            <div className="absolute bottom-full mb-3 w-max px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                                                {point.value.toLocaleString()} học liệu
                                            </div>
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                <div className="w-2 h-2 bg-white ring-2 ring-blue-600 rounded-full transition-all duration-300 group-hover:w-3 group-hover:h-3"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute bottom-0 left-[48px] right-0 h-[24px] flex justify-between items-center">
                                    {contributionsOverTime.map(item => (
                                        <span key={item.label} className="text-xs text-slate-500 dark:text-gray-400">{item.label}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 h-full">
                            <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Trạng thái phê duyệt cấp trường</h3>
                                <InfoTooltip text="Tỷ trọng các trạng thái kiểm duyệt của học liệu số lên phạm vi cấp trường." />
                            </div>
                            <div className="flex justify-center items-center my-6 relative w-40 h-40 mx-auto">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-600"></circle>
                                    <g transform="rotate(-90, 50, 50)">
                                        {donutChartSegments.map(segment => (
                                            <circle 
                                                key={segment.status}
                                                cx="50" cy="50" r="45" fill="none" 
                                                stroke={segment.color}
                                                strokeWidth="10"
                                                strokeDasharray={segment.strokeDashArray}
                                                transform={segment.transform}
                                                className="transition-all duration-300 cursor-pointer"
                                                onMouseEnter={() => setHoveredStatus(segment.status)}
                                                onMouseLeave={() => setHoveredStatus(null)}
                                            />
                                        ))}
                                    </g>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white transition-all duration-200">{donutDisplayText.value.toLocaleString()}</span>
                                    <span className="text-xs text-slate-500 dark:text-gray-400 transition-all duration-200">{donutDisplayText.label}</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {approvalStatus.map(status => (
                                    <div key={status.status} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-slate-50 dark:hover:bg-gray-600/50 transition-colors">
                                        <div className="flex items-center">
                                            <span className={`w-3 h-3 rounded-full mr-3 
                                                ${status.status === 'Approved' ? 'bg-emerald-500' : ''}
                                                ${status.status === 'Pending' ? 'bg-amber-500' : ''}
                                                ${status.status === 'Rejected' ? 'bg-red-500' : ''}
                                            `}></span>
                                            <span className="text-slate-600 dark:text-gray-300 font-medium">{getVietnameseStatus(status.status)}</span>
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-white">{status.count.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
             )}

             {selectedTab === 'analysis' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                        <div className="flex items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Phân bố học liệu theo Môn học</h3>
                            <InfoTooltip text="Biểu đồ phân bố số lượng học liệu theo từng môn học." />
                        </div>
                        <div className="space-y-3">
                            {materialsBySubject.map(item => (
                                <div key={item.label} className="w-full">
                                    <div className="flex justify-between mb-1 text-sm">
                                        <span className="font-medium text-slate-600 dark:text-gray-300">{item.label}</span>
                                        <span className="text-slate-500 dark:text-gray-400">{item.value.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-gray-600 rounded-full h-2.5">
                                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(item.value / maxSubjectValue) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                        <div className="flex items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Phân bố học liệu theo Khối lớp</h3>
                            <InfoTooltip text="Biểu đồ phân bố số lượng học liệu theo khối lớp." />
                        </div>
                        <div className="space-y-3">
                            {materialsByGrade.map((item, i) => (
                                <div key={item.label} className="w-full">
                                    <div className="flex justify-between mb-1 text-sm">
                                        <span className="font-medium text-slate-600 dark:text-gray-300">{item.label}</span>
                                        <span className="text-slate-500 dark:text-gray-400">{item.value.toLocaleString()}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-gray-600 rounded-full h-2.5">
                                        <div className={`h-2.5 rounded-full 
                                            ${i < 2 ? 'bg-teal-500' : ''}
                                            ${i >= 2 ? 'bg-sky-500' : ''}
                                        `} style={{ width: `${(item.value / maxGradeValue) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             )}

             {selectedTab === 'leaderboard' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                        <div className="flex items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tổ chuyên môn tích cực nhất</h3>
                            <InfoTooltip text="Bảng xếp hạng các Tổ chuyên môn dựa trên tổng số học liệu đóng góp." />
                        </div>
                        <ul className="divide-y divide-slate-200 dark:divide-gray-600">
                            {topUnits.length > 0 ? topUnits.map((unit, i) => (
                                <li key={unit.id} className="py-3 flex items-center">
                                    <span className="text-slate-500 dark:text-gray-400 font-bold w-8 text-center">{i + 1}</span>
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{unit.name}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 py-1 px-3 rounded-full">{unit.value.toLocaleString()} học liệu</span>
                                </li>
                            )) : <p className="text-sm text-gray-500 p-3">Chưa có tổ nào đóng góp.</p>}
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                        <div className="flex items-center mb-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Giáo viên đóng góp nhiều nhất</h3>
                            <InfoTooltip text="Bảng xếp hạng các Giáo viên dựa trên tổng số học liệu đóng góp." />
                        </div>
                        <ul className="divide-y divide-slate-200 dark:divide-gray-600">
                            {topTeachers.map((teacher, i) => (
                                <li key={i} className="py-3 flex items-center">
                                    <span className="text-slate-500 dark:text-gray-400 font-bold w-8 text-center">{i + 1}</span>
                                    <div className="ml-4 flex-1">
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{teacher.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-gray-400">{teacher.departmentName}</p>
                                    </div>
                                    <span className="text-sm font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 py-1 px-3 rounded-full">{teacher.value.toLocaleString()} học liệu</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
             )}
        </div>
    );

    const renderTeachersDetail = () => (
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200">
            <main className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto w-full animate-fade-in">
                <div className="flex items-center mb-6">
                    <button onClick={() => setMainView('dashboard')} className="mr-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-slate-600 dark:text-gray-300">
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Danh sách Giáo viên đóng góp</h2>
                </div>
                
                <div className="mb-6">
                    <input 
                        onInput={(e) => setTeacherSearchQuery((e.target as HTMLInputElement).value)}
                        type="text" 
                        placeholder="Tìm kiếm giáo viên, tổ chuyên môn..." 
                        className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition" 
                    />
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 text-sm border-b border-slate-300 dark:border-gray-500">
                                    <th className="p-4 font-semibold w-16 text-center">#</th>
                                    <th className="p-4 font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => sortTeachers('name')}>
                                        Họ và Tên
                                        {teacherSortConfig.key === 'name' && (
                                            <span className="ml-1">{teacherSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="p-4 font-semibold cursor-pointer hover:text-blue-600 transition-colors" onClick={() => sortTeachers('departmentName')}>
                                        Tổ chuyên môn
                                        {teacherSortConfig.key === 'departmentName' && (
                                            <span className="ml-1">{teacherSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                    <th className="p-4 font-semibold cursor-pointer hover:text-blue-600 transition-colors text-right" onClick={() => sortTeachers('value')}>
                                        Số lượng
                                        {teacherSortConfig.key === 'value' && (
                                            <span className="ml-1">{teacherSortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-gray-600">
                                {sortedAndFilteredTeachers.length > 0 ? (
                                    sortedAndFilteredTeachers.map((teacher, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-600/50 transition-colors">
                                            <td className="p-4 text-slate-500 dark:text-gray-400 font-bold text-center">{i + 1}</td>
                                            <td className="p-4 font-medium text-slate-800 dark:text-white">{teacher.name}</td>
                                            <td className="p-4 text-slate-600 dark:text-gray-300">{teacher.departmentName}</td>
                                            <td className="p-4 text-right">
                                                <span className="text-sm font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-300 py-1 px-3 rounded-full">
                                                    {teacher.value.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500 dark:text-gray-400">
                                            Không tìm thấy giáo viên nào khớp với tìm kiếm.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );

    const renderUnitsDetail = () => (
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200">
            <main className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto w-full">
                <div className="flex items-center mb-6">
                    <button onClick={() => setMainView('dashboard')} className="mr-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-slate-600 dark:text-gray-300">
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Danh sách Tổ chuyên môn</h2>
                </div>
                
                <div className="mb-6">
                    <input 
                        onInput={(e) => setUnitSearchQuery((e.target as HTMLInputElement).value)}
                        type="text" 
                        placeholder="Tìm kiếm theo tên tổ..." 
                        className="w-full px-4 py-2 border border-slate-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition" 
                    />
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 overflow-hidden">
                    <ul className="divide-y divide-slate-200 dark:divide-gray-600">
                        {filteredUnits.length > 0 ? (
                            filteredUnits.map((unit, i) => (
                                <li key={unit.id} className="hover:bg-slate-50 dark:hover:bg-gray-600/50 transition-colors">
                                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedUnitId(expandedUnitId === unit.id ? null : unit.id)}>
                                        <div className="flex items-center">
                                            <span className="text-slate-500 dark:text-gray-400 font-bold w-8 text-center">{i + 1}</span>
                                            <div className="ml-4">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-slate-800 dark:text-white">{unit.name}</p>
                                                    {unit.value > 0 ? (
                                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-green-700 bg-green-100 dark:bg-green-900/50 dark:text-green-300 rounded-full border border-green-200 dark:border-green-800">Đã đóng góp</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 dark:bg-gray-600 dark:text-gray-300 rounded-full border border-slate-200 dark:border-gray-500">Chưa đóng góp</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 py-1 px-3 rounded-full mr-4">{unit.value.toLocaleString()} học liệu</span>
                                            <svg className={`w-5 h-5 text-slate-400 transform transition-transform ${expandedUnitId === unit.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </div>
                                    {expandedUnitId === unit.id && (
                                        <div className="px-8 pb-4 pt-2 bg-slate-100 dark:bg-gray-800/50 border-t border-slate-300 dark:border-gray-500">
                                            <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-300 mb-3 px-2">Danh sách thành viên:</h4>
                                             {/* Filter ALL teachers for this unit */}
                                             {(() => {
                                                const unitTeachers = allTeachers
                                                    .filter(t => t.departmentId === unit.id)
                                                    .sort((a,b) => b.value - a.value);
                                                
                                                if (unitTeachers.length === 0) return <p className="text-sm text-slate-500 italic px-2">Chưa có thông tin giáo viên.</p>;
                                                
                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        {unitTeachers.map((teacher, idx) => (
                                                            <div key={idx} className={`text-sm flex justify-between items-center p-3 rounded-lg border ${teacher.value === 0 ? 'text-slate-400 bg-white border-slate-100 dark:bg-gray-800 dark:border-gray-700' : 'text-slate-700 bg-white border-slate-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'}`}>
                                                                <span className="font-medium">{teacher.name}</span>
                                                                <span className={`${teacher.value > 0 ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}>
                                                                    {teacher.value} học liệu
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                             })()}
                                        </div>
                                    )}
                                </li>
                            ))
                        ) : (
                             <div className="p-8 text-center text-slate-500 dark:text-gray-400">Không tìm thấy tổ chuyên môn nào khớp với tìm kiếm.</div>
                        )}
                    </ul>
                </div>
            </main>
        </div>
    );

    const renderResourceTypesDetail = () => {
        const maxTypeCount = Math.max(...RESOURCE_TYPES_DETAIL.map(t => t.count));

        return (
            <div className="flex-1 flex flex-col bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200">
                <main className="p-4 sm:p-6 lg:p-8 max-w-screen-xl mx-auto w-full animate-fade-in">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setMainView('dashboard')} className="mr-4 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors text-slate-600 dark:text-gray-300">
                            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Chi tiết loại học liệu</h2>
                    </div>

                    <div className="bg-white dark:bg-gray-700 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 mb-8">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Biểu đồ phân bố</h3>
                        <div className="space-y-6">
                            {RESOURCE_TYPES_DETAIL.map((type) => (
                                <div key={type.name} className="flex items-center group">
                                    <div 
                                        className="w-12 h-12 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 transition-transform group-hover:scale-110 shadow-sm"
                                        style={{ backgroundColor: `${type.color}15` }}
                                    >
                                        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke={type.color}>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={type.iconPath} />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <span className="font-semibold text-slate-700 dark:text-gray-200">{type.name}</span>
                                            <span className="font-bold text-slate-800 dark:text-white">{type.count.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000 relative" 
                                                style={{ width: `${(type.count / maxTypeCount) * 100}%`, backgroundColor: type.color }}
                                            >
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    };

    return (
        <>
            {mainView === 'dashboard' && renderDashboard()}
            {mainView === 'teachers_detail' && renderTeachersDetail()}
            {mainView === 'units_detail' && renderUnitsDetail()}
            {mainView === 'resource_types_detail' && renderResourceTypesDetail()}
        </>
    );
};
