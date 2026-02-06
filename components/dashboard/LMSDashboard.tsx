
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
    BookOpenIcon, 
    DesktopComputerIcon, 
    ClipboardListIcon, 
    CheckCircleIcon, 
    TrendingUpIcon, 
    InformationCircleIcon,
    UsersIcon,
    CrownIcon,
    TrophyIcon,
    WarningIcon,
    XIcon,
    DownloadIcon,
    StarIcon,
    AcademicCapIcon,
    ArrowsExpandIcon,
    ArrowsContractIcon
} from '../Icons';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// --- TYPES ---
type Tab = 'overview' | 'class_ranking' | 'subjects' | 'teachers' | 'students';
type ViewMode = 'dashboard' | 'teacher_list' | 'class_leaderboard';
type SortDirection = 'asc' | 'desc';
type SortKey = 'name' | 'materialsAssigned' | 'assignedTests' | 'completionRate' | 'assignedGrade' | 'subject' | 'completedMaterials' | 'completedTests' | 'lecturesCreated';
type LeaderboardCriteria = 'created' | 'rate'; // 'created' maps to Quantity, 'rate' maps to Quality

interface LMSStatCard {
    title: string;
    description: string; // Red text
    value: string;
    tooltip: React.ReactNode; // Changed to ReactNode to support rich text
    tooltipPlacement?: 'top' | 'bottom'; // Added placement control
    icon: React.ReactNode; // Added icon
    iconColorClass: string; // Added color class for icon
}

interface ClassActivity {
    id: string;
    name: string;
    grade: number;
    assignedMaterials: number;
    completedMaterials: number;
    assignedTests: number;
    completedTests: number;
    totalScore: number; // = completedMaterials + completedTests
}

interface SubjectStat {
    name: string;
    lecturesCreated: number;
    materialsAssigned: number;
    completedMaterials: number;
    testsCreated: number; // Added: Bài kiểm tra đã tạo
    assignedTests: number;
    completedTests: number;
    completionRate: number; // General rate
    testCompletionRate: number; // Specific for tests
}

interface TeacherLMSStat {
    id: string;
    name: string;
    subject: string;
    assignedGrade: string; // New field
    lecturesCreated: number; // Added
    materialsAssigned: number;
    completedMaterials: number;
    testsCreated: number; // Added
    assignedTests: number;
    completedTests: number;
    completionRate: number;
}

interface StudentLMSStat {
    id: string;
    name: string;
    className: string;
    grade: number;
    completedMaterials: number;
    completedTests: number;
    averageTestScore: number;
}

// Interfaces for Warning Detail
interface WeakTestInfo {
    subject: string;
    score: number;
    testName: string;
}

interface StudentWithWeakTests {
    id: string;
    name: string;
    weakTests: WeakTestInfo[];
}

interface ClassWeakStats {
    className: string;
    totalWeakTests: number; // Count of tests, not students, for accurate aggregation
    students: StudentWithWeakTests[];
}

interface WarningState {
    grade: number;
    totalWeak: number;
    totalAssigned: number;
}

// --- HELPER ---
const getGradeLabel = (grade: number) => {
    const gradeMap: { [key: number]: string } = {
        6: 'Lớp 6A1',
        7: 'Lớp 7A1',
        8: 'Lớp 8A1',
        9: 'Lớp 9A1',
        10: 'Lớp 6A2',
        11: 'Lớp 7A2',
        12: 'Lớp 8A2',
        13: 'Lớp 9A2',
        14: 'Lớp 6A3',
        15: 'Lớp 7A3',
    };
    return gradeMap[grade] || `Khối ${grade}`;
};

// --- MOCK DATA GENERATION ---
const SUBJECTS = ['Tiếng Anh'];
const CLASS_IDS = ['6a1', '7a1', '8a1', '9a1', '6a2', '7a2', '8a2', '9a2', '6a3', '7a3'];
const CLASS_NAMES_LIST = ['6A1', '7A1', '8A1', '9A1', '6A2', '7A2', '8A2', '9A2', '6A3', '7A3'];
const GRADES = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const CLASS_NAMES = ['A1'];

const generateLMSData = () => {
    // 1. Class Activity (Leaderboard)
    const classes: ClassActivity[] = [];
    CLASS_IDS.forEach((classId, index) => {
        const assignedMat = 50 + Math.floor(Math.random() * 50);
        const compMat = Math.floor(assignedMat * (0.6 + Math.random() * 0.35)); // 60-95% completion
        
        const assignedTest = 10 + Math.floor(Math.random() * 10);
        const compTest = Math.floor(assignedTest * (0.7 + Math.random() * 0.25));

        classes.push({
            id: classId,
            name: `Lớp ${CLASS_NAMES_LIST[index]}`,
            grade: GRADES[index],
            assignedMaterials: assignedMat,
            completedMaterials: compMat,
            assignedTests: assignedTest,
            completedTests: compTest,
            totalScore: compMat + compTest
        });
    });

    // 2. Subject Stats
    const subjects: SubjectStat[] = SUBJECTS.map(sub => {
        // Materials
        const lecturesCreated = 800 + Math.floor(Math.random() * 500); // 800 - 1300
        const materialsAssigned = Math.floor(lecturesCreated * (0.4 + Math.random() * 0.4)); // Always < Created
        const completedMaterials = Math.floor(materialsAssigned * (0.6 + Math.random() * 0.3));
        
        // Tests
        const testsCreated = 150 + Math.floor(Math.random() * 100); // 150 - 250 created
        const assignedTests = Math.floor(testsCreated * (0.5 + Math.random() * 0.4)); // Always < Created
        const completedTests = Math.floor(assignedTests * (0.7 + Math.random() * 0.25));

        const totalAssigned = materialsAssigned + assignedTests;
        const totalCompleted = completedMaterials + completedTests;
        const completionRate = Math.round((totalCompleted / totalAssigned) * 100);
        const testCompletionRate = assignedTests > 0 ? Math.round((completedTests / assignedTests) * 100) : 0;

        return {
            name: sub,
            lecturesCreated,
            materialsAssigned,
            completedMaterials,
            testsCreated,
            assignedTests,
            completedTests,
            completionRate,
            testCompletionRate
        };
    }).sort((a,b) => b.materialsAssigned - a.materialsAssigned);

    // 3. Teacher Stats
    const VIETNAMESE_NAMES = [
        "Nguyễn Thị Mai", "Trần Văn Hùng", "Lê Thị Lan", "Phạm Văn Tuấn", "Hoàng Thị Cúc",
        "Đặng Văn Nam", "Bùi Thị Hoa", "Vũ Văn Minh", "Đỗ Thị Hương", "Ngô Văn Long",
        "Dương Thị Thúy", "Lý Văn Kiệt", "Trương Thị Ngọc", "Nguyễn Văn An", "Trần Thị Bích",
        "Lê Văn Cường", "Phạm Thị Dung", "Hoàng Văn Dũng", "Đặng Thị Hạnh", "Bùi Văn Hải",
        "Vũ Thị Huyền", "Đỗ Văn Khánh", "Ngô Thị Linh", "Dương Văn Lâm", "Lý Thị Nga",
        "Trương Văn Phúc", "Nguyễn Thị Phương", "Trần Văn Quân", "Lê Thị Quỳnh", "Phạm Văn Sang",
        "Hoàng Thị Tâm", "Đặng Văn Thành", "Bùi Thị Thảo", "Vũ Văn Thắng", "Đỗ Thị Trang",
        "Ngô Văn Trọng", "Dương Thị Tuyết", "Lý Văn Tùng", "Trương Thị Vân", "Nguyễn Văn Việt",
        "Trần Thị Yến", "Lê Văn Sơn", "Phạm Thị Thu", "Hoàng Văn Tám", "Đặng Thị Kim",
        "Bùi Văn Tài", "Vũ Thị Lệ", "Đỗ Văn Đức", "Ngô Thị Hà", "Dương Văn Hiếu"
    ];

    const teachers: TeacherLMSStat[] = Array.from({ length: 50 }, (_, i) => {
        const lecturesCreated = 200 + Math.floor(Math.random() * 200);
        const materialsAssigned = Math.floor(lecturesCreated * (0.6 + Math.random() * 0.3));
        const completedMaterials = Math.floor(materialsAssigned * (0.6 + Math.random() * 0.3));
        
        const testsCreated = 40 + Math.floor(Math.random() * 40);
        const assignedTests = Math.floor(testsCreated * (0.6 + Math.random() * 0.3));
        const completedTests = Math.floor(assignedTests * (0.7 + Math.random() * 0.25));

        const totalAssigned = materialsAssigned + assignedTests;
        const totalCompleted = completedMaterials + completedTests;
        
        // Random Grade assignment logic
        const randomGrade = GRADES[Math.floor(Math.random() * GRADES.length)];
        
        return {
            id: `GV${i}`,
            name: VIETNAMESE_NAMES[i % VIETNAMESE_NAMES.length],
            subject: SUBJECTS[i % SUBJECTS.length],
            assignedGrade: getGradeLabel(randomGrade),
            lecturesCreated,
            materialsAssigned,
            completedMaterials,
            testsCreated,
            assignedTests,
            completedTests,
            completionRate: Math.round((totalCompleted / totalAssigned) * 100)
        };
    }).sort((a,b) => (b.lecturesCreated + b.testsCreated) - (a.lecturesCreated + a.testsCreated));

    // 4. Student Stats
    const STUDENT_NAMES_BASE = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
    const MIDDLE_NAMES = ["Văn", "Thị", "Minh", "Quốc", "Thành", "Đức", "Hữu", "Mạnh", "Tiến", "Ngọc", "Thanh"];
    const FIRST_NAMES = ["Anh", "Bình", "Châu", "Dũng", "Em", "Giang", "Hà", "Hải", "Hiếu", "Hoà", "Hùng", "Huy", "Khánh", "Lan", "Linh", "Long", "Mai", "Minh", "Nam", "Nga", "Ngọc", "Nhân", "Phong", "Phúc", "Phượng", "Quân", "Quang", "Quốc", "Sơn", "Thảo", "Thắng", "Thanh", "Thảo", "Thịnh", "Thu", "Thuỷ", "Toàn", "Trang", "Trí", "Tuấn", "Tùng", "Vân", "Việt", "Vinh", "Uyên", "Yến"];

    const students: StudentLMSStat[] = [];
    for (let i = 0; i < 200; i++) {
        const lastName = STUDENT_NAMES_BASE[Math.floor(Math.random() * STUDENT_NAMES_BASE.length)];
        const middleName = MIDDLE_NAMES[Math.floor(Math.random() * MIDDLE_NAMES.length)];
        const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const fullName = `${lastName} ${middleName} ${firstName}`;
        
        // Randomly select a class from our 10 classes (6A1-7A3)
        const randomClassIndex = Math.floor(Math.random() * CLASS_IDS.length);
        const classId = CLASS_IDS[randomClassIndex];
        const className = CLASS_NAMES_LIST[randomClassIndex];

        const completedMaterials = Math.floor(Math.random() * 150) + 10;
        const completedTests = Math.floor(Math.random() * 30) + 5;
        let avgScore = 6 + Math.random() * 3.5;
        if (avgScore > 10) avgScore = 10;
        
        students.push({
            id: `HS${i}`,
            name: fullName,
            className: `Lớp ${className}`,
            grade: GRADES[randomClassIndex],
            completedMaterials,
            completedTests,
            averageTestScore: parseFloat(avgScore.toFixed(1))
        });
    }

    return { classes, subjects, teachers, students };
};

// Generate detailed weak students data for a specific grade
// NOW DETERMINISTIC BASED ON TARGET TOTAL WEAK TESTS to ensure chart consistency
const generateWeakDataForGrade = (grade: number, targetTotalWeak: number): ClassWeakStats[] => {
    const classList = ['A1', 'A2', 'A3', 'A4', 'A5'].map(c => `${grade}${c}`);
    
    // Distribute the targetTotalWeak across classes randomly
    const distribution = new Array(classList.length).fill(0);
    for (let i = 0; i < targetTotalWeak; i++) {
        const randomIndex = Math.floor(Math.random() * classList.length);
        distribution[randomIndex]++;
    }
    
    return classList.map((className, idx) => {
        const weakTestsCount = distribution[idx];
        if (weakTestsCount === 0) return null; // No weak tests in this class

        // Create students to hold these weak tests
        const students: StudentWithWeakTests[] = [];
        let remainingTests = weakTestsCount;
        let studentCounter = 1;

        while(remainingTests > 0) {
            // Assign 1 to 3 weak tests per student
            const testsForStudent = Math.min(Math.floor(Math.random() * 2) + 1, remainingTests);
            
            const weakTests: WeakTestInfo[] = Array.from({ length: testsForStudent }, () => {
                const subject = SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
                return {
                    subject,
                    score: parseFloat((Math.random() * 4 + 0.5).toFixed(1)), // Score 0.5 - 4.5
                    testName: `Kiểm tra 15p ${subject}`
                };
            }).sort((a, b) => a.score - b.score);

            students.push({
                id: `hs-${className}-${studentCounter}`,
                name: `Nguyễn Văn Học Sinh ${studentCounter}`,
                weakTests
            });

            remainingTests -= testsForStudent;
            studentCounter++;
        }

        // SORT STUDENTS: Who has the most weak tests comes first
        students.sort((a, b) => b.weakTests.length - a.weakTests.length);

        return {
            className: `Lớp ${className}`,
            totalWeakTests: weakTestsCount,
            students
        };
    }).filter((c): c is ClassWeakStats => c !== null);
};

// --- COMPONENTS ---

const InfoTooltip: React.FC<{ text: React.ReactNode; placement?: 'top' | 'bottom' }> = ({ text, placement = 'top' }) => {
    const isTop = placement === 'top';
    return (
        <div className="group/tooltip relative ml-2 inline-flex items-center z-10 align-middle">
            <InformationCircleIcon className="h-6 w-6 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 cursor-help transition-colors" />
            {/* Changed width to w-80 for better readability */}
            <div className={`absolute ${isTop ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-80 p-4 bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 shadow-xl border border-gray-700 z-50 text-left pointer-events-none`}>
                <div className="leading-relaxed">{text}</div>
                <div className={`absolute ${isTop ? 'top-full' : 'bottom-full'} left-2 border-[8px] border-transparent ${isTop ? 'border-t-gray-900/95' : 'border-b-gray-900/95'}`}></div>
            </div>
        </div>
    );
};

const renderRateBadge = (rate: number, details?: { completedMat: number, completedTest: number }) => {
    let styles = '';
    let barColor = '';
    if (rate >= 80) {
        styles = 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        barColor = 'bg-green-500';
    } else if (rate >= 50) {
        styles = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        barColor = 'bg-yellow-500';
    } else {
        styles = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        barColor = 'bg-red-500';
    }
    
    return (
        <div className="flex items-center gap-3 justify-end w-full pl-2">
            <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden border border-gray-300 dark:border-gray-500 shadow-inner">
                <div className={`h-full ${barColor}`} style={{ width: `${rate}%` }}></div>
            </div>
            <div className="group/badge relative inline-block shrink-0">
                <span className={`px-3 py-1.5 rounded-lg text-base font-bold border ${styles} inline-flex items-center justify-center min-w-[70px] shadow-sm cursor-help`}>
                    {rate}%
                </span>
                {details && (
                    <div className="absolute bottom-full right-0 mb-2 w-72 p-4 bg-gray-900/95 backdrop-blur-sm text-white text-sm rounded-lg opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible transition-all duration-200 shadow-xl border border-gray-700 z-50 pointer-events-none text-left">
                        <div className="font-bold mb-2 border-b border-gray-600 pb-2 text-center text-base">Đã hoàn thành</div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-300">Học liệu đã hoàn thành:</span>
                            <span className="font-bold text-blue-300 text-base">{details.completedMat.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-300">Bài kiểm tra đã hoàn thành:</span>
                            <span className="font-bold text-orange-300 text-base">{details.completedTest.toLocaleString()}</span>
                        </div>
                         <div className="absolute top-full right-6 border-[6px] border-transparent border-t-gray-900/95"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NEW CHART COMPONENT ---
const TeacherPerformanceChart: React.FC<{ data: TeacherLMSStat[], type: 'material' | 'test', isExpanded: boolean, onToggleExpand: () => void }> = ({ data, type, isExpanded, onToggleExpand }) => {
    // Initialize with Quantity only active by default
    const [visibleDatasets, setVisibleDatasets] = useState({
        quantity: true,
        rate: false 
    });
    
    const isMaterial = type === 'material';
    
    // Sort data descending based on active view
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            // Priority: If Rate is ONLY selected, sort by Rate.
            // If Quantity is selected (alone or with Rate), sort by Quantity.
            if (visibleDatasets.rate && !visibleDatasets.quantity) {
                // Sort by Rate
                const assignedA = isMaterial ? a.materialsAssigned : a.assignedTests;
                const completedA = isMaterial ? a.completedMaterials : a.completedTests;
                const rateA = assignedA > 0 ? (completedA / assignedA) * 100 : 0;

                const assignedB = isMaterial ? b.materialsAssigned : b.assignedTests;
                const completedB = isMaterial ? b.completedMaterials : b.completedTests;
                const rateB = assignedB > 0 ? (completedB / assignedB) * 100 : 0;
                
                return rateB - rateA;
            } else {
                // Sort by Quantity (Default)
                const valA = isMaterial ? a.lecturesCreated : a.testsCreated;
                const valB = isMaterial ? b.lecturesCreated : b.testsCreated;
                return valB - valA;
            }
        });
    }, [data, visibleDatasets, isMaterial]);

    const displayData = sortedData;

    const chartData = {
        // Multi-line labels: [Name, (Subject - Grade)]
        labels: displayData.map(d => [d.name, `(${d.subject} - ${d.assignedGrade})`]),
        datasets: [
            {
                label: isMaterial ? 'Số học liệu' : 'Số bài kiểm tra',
                data: displayData.map(d => isMaterial ? d.lecturesCreated : d.testsCreated),
                backgroundColor: '#6366f1', // Indigo
                hoverBackgroundColor: '#4f46e5',
                borderRadius: 4,
                barThickness: 24, // Increased bar thickness for visibility
                hidden: !visibleDatasets.quantity,
                xAxisID: 'x',
            },
            {
                label: 'Tỷ lệ hoàn thành (%)',
                data: displayData.map(d => {
                    const assigned = isMaterial ? d.materialsAssigned : d.assignedTests;
                    const completed = isMaterial ? d.completedMaterials : d.completedTests;
                    return assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                }),
                backgroundColor: '#10b981', // Emerald
                hoverBackgroundColor: '#059669',
                borderRadius: 4,
                barThickness: 24, // Increased bar thickness
                hidden: !visibleDatasets.rate,
                xAxisID: 'x1',
            }
        ]
    };

    // Custom Plugin to draw values at the end of bars
    const valueLabelPlugin = {
        id: 'valueLabelPlugin',
        afterDatasetsDraw(chart: any) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset: any, i: number) => {
                // FIX: Use isDatasetVisible to correctly handle hidden datasets logic dynamically
                if (!chart.isDatasetVisible(i)) return;

                const meta = chart.getDatasetMeta(i);
                if (meta.hidden) return;

                // Explicitly check if it's the percentage dataset based on label
                const isPercentageDataset = dataset.label.includes('%');

                meta.data.forEach((element: any, index: number) => {
                    const data = dataset.data[index];
                    if (data === null || data === undefined) return; // Safety check

                    // STRICT RULE: 
                    // If this is the Percentage dataset, verify we are actually in Rate mode.
                    // If this is the Quantity dataset, verify we are in Quantity mode (though chart.isDatasetVisible handles this mostly).
                    // Most importantly, NEVER show '%' symbol for Quantity data.
                    
                    const text = isPercentageDataset ? `${data}%` : data.toString();
                    
                    ctx.font = 'bold 13px "Inter", sans-serif'; // Larger font
                    ctx.fillStyle = dataset.backgroundColor;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    
                    // Draw text slightly to the right of the bar end
                    ctx.fillText(text, element.x + 8, element.y);
                });
            });
        }
    };

    const chartOptions: any = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { right: 60, left: 0 } // Increased padding
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15, 23, 42, 0.98)',
                titleFont: { size: 15, weight: 'bold' }, // Larger tooltip
                bodyFont: { size: 14 }, // Larger tooltip
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    title: (context: any[]) => {
                        // Return just the name for tooltip title to keep it clean
                        return context[0].label.replace(',', ' '); // Join array if needed
                    },
                    label: (context: any) => {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        label += context.datasetIndex === 1 ? context.parsed.x + '%' : context.parsed.x;
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                display: false, // Hide X Axis
                beginAtZero: true,
                grid: { display: false }
            },
            x1: {
                display: false, // Hide X1 Axis
                beginAtZero: true,
                max: 100,
                grid: { display: false }
            },
            y: {
                grid: { display: false },
                ticks: {
                    font: { size: 13, weight: '600' }, // Larger and bolder y-axis labels
                    color: '#334155',
                    autoSkip: false,
                    crossAlign: 'far', // Align text nicely
                }
            }
        }
    };

    // Calculate height based on number of items (approx 60px per item for more spacing)
    const chartHeight = Math.max(displayData.length * 60, 300);

    const toggleQuantity = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVisibleDatasets(prev => {
            return { ...prev, quantity: !prev.quantity };
        });
    };

    const toggleRate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setVisibleDatasets(prev => {
            return { ...prev, rate: !prev.rate };
        });
    };

    return (
        <div 
            onClick={onToggleExpand}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 p-6 flex flex-col transition-all duration-500 ease-in-out relative overflow-hidden cursor-pointer ${isExpanded ? 'h-[1100px]' : 'h-[600px]'}`}
        >
            
            <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4 relative z-30">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {isMaterial ? "Biểu đồ Giáo viên - Học liệu số" : "Biểu đồ Giáo viên - Bài kiểm tra"}
                        <InfoTooltip text={
                            <div className="text-left text-sm">
                                <p className="font-bold mb-1 text-base">Giải thích biểu đồ:</p>
                                <ul className="list-disc pl-4 space-y-2">
                                    <li><span className="text-indigo-400 font-bold">Thanh màu tím:</span> Thể hiện số lượng {isMaterial ? 'học liệu' : 'bài kiểm tra'} đã tạo.</li>
                                    <li><span className="text-emerald-400 font-bold">Thanh màu xanh:</span> Thể hiện tỷ lệ % học sinh hoàn thành bài được giao.</li>
                                </ul>
                            </div>
                        } />
                    </h3>
                    
                    {visibleDatasets.quantity && visibleDatasets.rate && (
                        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
                            So sánh tương quan giữa số lượng và chất lượng.
                        </p>
                    )}
                </div>
                
                <div className="flex flex-wrap gap-2 flex-shrink-0 items-center">
                    <button 
                        onClick={toggleQuantity}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 relative z-30
                        ${visibleDatasets.quantity
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300 ring-2 ring-indigo-100 dark:ring-indigo-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-gray-700 dark:border-gray-600 opacity-60 hover:opacity-100'}`}
                    >
                        {isMaterial ? 'Số lượng' : 'Số lượng'}
                        {visibleDatasets.quantity && <CheckCircleIcon className="w-4 h-4" />}
                    </button>
                    <button 
                        onClick={toggleRate}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 relative z-30
                        ${visibleDatasets.rate
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-100 dark:ring-emerald-900' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-gray-700 dark:border-gray-600 opacity-60 hover:opacity-100'}`}
                    >
                        Tỷ lệ hoàn thành
                        {visibleDatasets.rate && <CheckCircleIcon className="w-4 h-4" />}
                    </button>

                    {/* Expand/Collapse Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand();
                        }}
                        className={`ml-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border flex items-center gap-2 relative z-30 group
                        ${!isExpanded
                            ? 'bg-white border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:bg-gray-800 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-900/20' 
                            : 'bg-white border-orange-500 text-orange-600 hover:bg-orange-50 dark:bg-gray-800 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900/20'}`}
                        title={isExpanded ? "Nhấn trực tiếp vào biểu đồ hoặc nhấn vào nút này để thu gọn biểu đồ." : "Nhấn trực tiếp vào biểu đồ hoặc nhấn vào nút này để mở rộng biểu đồ."}
                    >
                        {isExpanded ? (
                            <>
                                <span>Thu gọn</span>
                                <ArrowsContractIcon className="w-4 h-4" />
                            </>
                        ) : (
                            <>
                                <span>Mở rộng</span>
                                <ArrowsExpandIcon className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 border-t border-slate-100 dark:border-gray-700 pt-4 relative z-10">
                <div style={{ height: `${chartHeight}px`, position: 'relative' }}>
                    <Bar data={chartData} options={chartOptions} plugins={[valueLabelPlugin]} />
                </div>
            </div>
        </div>
    );
};


export const LMSDashboard: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    
    // Criteria States for Subject Tabs
    const [materialCriteria, setMaterialCriteria] = useState<LeaderboardCriteria>('rate');
    const [testCriteria, setTestCriteria] = useState<LeaderboardCriteria>('rate');

    // Criteria States for Teacher Tabs
    const [teacherMaterialCriteria, setTeacherMaterialCriteria] = useState<LeaderboardCriteria>('rate');
    const [teacherTestCriteria, setTeacherTestCriteria] = useState<LeaderboardCriteria>('rate');

    // Student Stats State
    const [selectedStudentGrade, setSelectedStudentGrade] = useState<number | 'all'>('all');
    const [showAllStudents, setShowAllStudents] = useState(false);

    // Show All States for Subject Tabs
    const [showAllMaterials, setShowAllMaterials] = useState(false);
    const [showAllTests, setShowAllTests] = useState(false);

    // Show All States for Teacher Tabs
    const [showAllTeacherMaterials, setShowAllTeacherMaterials] = useState(false);
    const [showAllTeacherTests, setShowAllTeacherTests] = useState(false);

    // Detailed List State
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

    // Warning Modal State - Now includes total statistics for accurate percentage calculation
    const [warningState, setWarningState] = useState<WarningState | null>(null);
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    // Spectrum Chart State
    const [spectrumGrade, setSpectrumGrade] = useState<number>(6);
    const [spectrumSubject, setSpectrumSubject] = useState<string>(SUBJECTS[0]);

    const { classes, subjects, teachers, students } = useMemo(() => generateLMSData(), []);

    // Aggregated Stats Calculations
    const totalLectures = subjects.reduce((acc, curr) => acc + curr.lecturesCreated, 0);
    const totalAssignedMaterials = classes.reduce((acc, curr) => acc + curr.assignedMaterials, 0);
    const totalCompletedMaterials = classes.reduce((acc, curr) => acc + curr.completedMaterials, 0);
    
    // Calculate Global Completion Rate
    const globalCompletionRate = totalAssignedMaterials > 0 
        ? ((totalCompletedMaterials / totalAssignedMaterials) * 100).toFixed(1) 
        : '0';
    
    const totalAssignedTests = classes.reduce((acc, curr) => acc + curr.assignedTests, 0);
    // Synthetic data for Ongoing vs Finished tests
    const ongoingTests = Math.floor(totalAssignedTests * 0.15); // Assume 15% are ongoing
    const finishedTests = totalAssignedTests - ongoingTests; // The rest are finished

    // Filtered teachers logic
    const filteredTeachers = useMemo(() => {
        let result = teachers;
        if (teacherSearchQuery) {
            const lower = teacherSearchQuery.toLowerCase();
            result = result.filter(t => 
                t.name.toLowerCase().includes(lower) || 
                t.subject.toLowerCase().includes(lower) || 
                t.assignedGrade.toLowerCase().includes(lower)
            );
        }
        return result;
    }, [teachers, teacherSearchQuery]);

    // Spectrum Data Calculation
    const spectrumData = useMemo(() => {
        // Deterministic random based on grade + subject char codes
        let seed = spectrumGrade + spectrumSubject.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
        const pseudoRandom = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        // Distribution weights tailored to look realistic
        const isHardSubject = spectrumSubject === 'Tiếng Anh';
        
        const totalStudents = 300 + Math.floor(pseudoRandom() * 50);
        
        const r1 = Math.floor(totalStudents * (isHardSubject ? 0.05 : 0.02)); // 0-3
        const r2 = Math.floor(totalStudents * (isHardSubject ? 0.15 : 0.08)); // 3-5
        const r3 = Math.floor(totalStudents * (isHardSubject ? 0.30 : 0.35)); // 5-6.5
        const r4 = Math.floor(totalStudents * (isHardSubject ? 0.30 : 0.35)); // 6.5-8
        const r5 = Math.floor(totalStudents * (isHardSubject ? 0.15 : 0.15)); // 8-9
        const r6 = totalStudents - r1 - r2 - r3 - r4 - r5; // 9-10

        const data = [r1, r2, r3, r4, r5, r6];
        
        // Calculate average
        const totalScore = 
            r1 * 1.5 + 
            r2 * 4.0 + 
            r3 * 5.75 + 
            r4 * 7.25 + 
            r5 * 8.5 + 
            r6 * 9.5;
        
        const average = (totalScore / totalStudents).toFixed(1);
        
        const passed = r3 + r4 + r5 + r6;
        const failed = r1 + r2;
        const passRate = ((passed / totalStudents) * 100).toFixed(1);
        const failRate = ((failed / totalStudents) * 100).toFixed(1);

        return { data, average, passRate, failRate };

    }, [spectrumGrade, spectrumSubject]);

    // Helper function to apply styles to a sheet
    const applySheetStyles = (ws: XLSX.WorkSheet, data: any[]) => {
        // 1. Calculate and set Auto Column Widths
        if (data.length > 0) {
            const keys = Object.keys(data[0]);
            const colWidths = keys.map(key => {
                let maxLength = key.length; // Header length
                data.forEach(row => {
                    const cellValue = row[key] ? String(row[key]) : '';
                    if (cellValue.length > maxLength) {
                        maxLength = cellValue.length;
                    }
                });
                return { wch: maxLength + 4 }; // Add padding
            });
            ws['!cols'] = colWidths;
        }

        // 2. Apply Borders and Header Styles
        const range = XLSX.utils.decode_range(ws['!ref'] || "A1");
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) continue;

                // Initialize style object if not present
                if (!ws[cellRef].s) ws[cellRef].s = {};

                // Apply Border to ALL cells
                ws[cellRef].s.border = {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                };
                
                // Basic alignment
                ws[cellRef].s.alignment = { vertical: "center", wrapText: true };
                ws[cellRef].s.font = { name: "Arial", sz: 11 };

                // Header Specific Styling (Row 0)
                if (R === 0) {
                    ws[cellRef].s.fill = { fgColor: { rgb: "FFFF00" } }; // Yellow background
                    ws[cellRef].s.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "000000" } };
                    ws[cellRef].s.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                }
            }
        }
    };

    const handleExportSubjectStatsExcel = (type: 'material' | 'test') => {
        const isMaterial = type === 'material';
        const fileName = isMaterial ? "Thong_ke_Mon_hoc_theo_Hoc_lieu_so.xlsx" : "Thong_ke_Mon_hoc_theo_Bai_kiem_tra.xlsx";
        
        // Sheet 1: Quantity
        const quantityData = [...subjects]
            .sort((a, b) => isMaterial ? (b.lecturesCreated - a.lecturesCreated) : (b.testsCreated - a.testsCreated))
            .map((s, index) => ({
                "Hạng": index + 1,
                "Tên môn học": s.name,
                [isMaterial ? "Học liệu số đã tạo" : "Bài kiểm tra đã tạo"]: isMaterial ? s.lecturesCreated : s.testsCreated,
                [isMaterial ? "Học liệu đã giao" : "Bài kiểm tra đã giao"]: isMaterial ? s.materialsAssigned : s.assignedTests
            }));

        // Sheet 2: Rate
        const rateData = [...subjects]
            .sort((a, b) => isMaterial ? (b.completionRate - a.completionRate) : (b.testCompletionRate - a.testCompletionRate))
            .map((s, index) => ({
                "Hạng": index + 1,
                "Tên môn học": s.name,
                "Tỷ lệ hoàn thành (%)": isMaterial ? `${s.completionRate}%` : `${s.testCompletionRate}%`,
                [isMaterial ? "Học liệu hoàn thành" : "Bài kiểm tra hoàn thành"]: isMaterial ? s.completedMaterials : s.completedTests,
                [isMaterial ? "Tổng số học liệu đã giao" : "Tổng số bài kiểm tra đã giao"]: isMaterial ? s.materialsAssigned : s.assignedTests
            }));

        // Create Workbook
        const wb = XLSX.utils.book_new();

        const wsQuantity = XLSX.utils.json_to_sheet(quantityData);
        applySheetStyles(wsQuantity, quantityData);

        const wsRate = XLSX.utils.json_to_sheet(rateData);
        applySheetStyles(wsRate, rateData);

        // Append Sheets with new names
        XLSX.utils.book_append_sheet(wb, wsQuantity, "Thống kê theo Số lượng");
        XLSX.utils.book_append_sheet(wb, wsRate, "Thống kê theo Tỷ lệ hoàn thành");

        // Export File with new name
        XLSX.writeFile(wb, fileName);
    };

    const handleExportTeacherStatsExcel = (type: 'material' | 'test') => {
        const isMaterial = type === 'material';
        const fileName = isMaterial ? "Thong_ke_Giao_vien_theo_Hoc_lieu.xlsx" : "Thong_ke_Giao_vien_theo_Kiem_tra.xlsx";

        const getData = (sortByRate: boolean) => {
            return [...filteredTeachers].sort((a, b) => {
                const rateA = isMaterial ? (a.completedMaterials / (a.materialsAssigned || 1)) : (a.completedTests / (a.assignedTests || 1));
                const rateB = isMaterial ? (b.completedMaterials / (b.materialsAssigned || 1)) : (b.completedTests / (b.assignedTests || 1));
                
                const createdA = isMaterial ? a.lecturesCreated : a.testsCreated;
                const createdB = isMaterial ? b.lecturesCreated : b.testsCreated;

                if (sortByRate) {
                    if (Math.abs(rateB - rateA) > 0.001) return rateB - rateA;
                    // tie break by quantity
                    return createdB - createdA;
                } else {
                    return createdB - createdA;
                }
            }).map((t, index) => ({
                "Hạng": index + 1,
                "Họ và tên": t.name,
                "Môn học": t.subject,
                "Khối": t.assignedGrade,
                [isMaterial ? "Học liệu số đã tạo" : "Bài kiểm tra đã tạo"]: isMaterial ? t.lecturesCreated : t.testsCreated,
                [isMaterial ? "Học liệu đã giao học sinh" : "Bài kiểm tra đã giao học sinh"]: isMaterial ? t.materialsAssigned : t.assignedTests,
                "Tỷ lệ học sinh hoàn thành (%)": isMaterial 
                    ? `${Math.round((t.completedMaterials / (t.materialsAssigned || 1)) * 100)}%`
                    : `${Math.round((t.completedTests / (t.assignedTests || 1)) * 100)}%`
            }));
        };

        const wb = XLSX.utils.book_new();
        
        const qData = getData(false);
        const wsQ = XLSX.utils.json_to_sheet(qData);
        applySheetStyles(wsQ, qData);
        XLSX.utils.book_append_sheet(wb, wsQ, "Thống kê theo Số lượng");

        const rData = getData(true);
        const wsR = XLSX.utils.json_to_sheet(rData);
        applySheetStyles(wsR, rData);
        XLSX.utils.book_append_sheet(wb, wsR, "Thống kê theo Tỷ lệ");

        XLSX.writeFile(wb, fileName);
    };

    const handleExportStudentStatsExcel = () => {
        const fileName = "Thong_ke_Hoc_sinh.xlsx";
        
        const getData = () => {
             // Filter based on selected grade
             const filteredStudents = selectedStudentGrade === 'all' 
                ? students 
                : students.filter(s => s.grade === selectedStudentGrade);

             return [...filteredStudents].sort((a, b) => {
                 // Always sort by Score
                 return b.averageTestScore - a.averageTestScore;
             }).map((s, index) => ({
                 "Hạng": index + 1,
                 "Học sinh": s.name,
                 "Khối - Lớp": `${s.grade} - ${s.className}`,
                 "Học liệu số đã hoàn thành": s.completedMaterials,
                 "Bài kiểm tra hoàn thành": s.completedTests,
                 "Tổng điểm trung bình tất cả bài kiểm tra": s.averageTestScore
             }));
        }

        const wb = XLSX.utils.book_new();
        const data = getData();
        const ws = XLSX.utils.json_to_sheet(data);
        applySheetStyles(ws, data);
        XLSX.utils.book_append_sheet(wb, ws, "Thống kê Học sinh");

        XLSX.writeFile(wb, fileName);
    };


    const handleExportWarningExcel = () => {
        if (!warningState || warningData.length === 0) return;

        const wb = XLSX.utils.book_new();

        warningData.forEach((cls) => {
            // Prepare data for this class (sheet)
            const sheetData = cls.students.map((student, index) => ({
                "STT": index + 1,
                "Họ và tên": student.name,
                "Tổng số bài yếu": student.weakTests.length,
                "Nội dung cần chú ý": student.weakTests.map(t => `${t.subject} (${t.score})`).join(', ')
            }));

            const ws = XLSX.utils.json_to_sheet(sheetData);
            
            // Apply shared styles
            applySheetStyles(ws, sheetData);

            // Append sheet
            // Ensure sheet name is unique and valid length (max 31 chars)
            const sheetName = cls.className.length > 31 ? cls.className.substring(0, 31) : cls.className;
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, `Canh_bao_hoc_tap_Khoi_${warningState.grade}.xlsx`);
    };

    // --- Updated Stats Grid Data ---
    const stats: LMSStatCard[] = [
        // Row 1: Materials
        {
            title: "SỐ HỌC LIỆU",
            description: "đã được giáo viên tạo",
            value: totalLectures.toLocaleString(),
            tooltip: "Tổng số bài giảng/học liệu do giáo viên biên soạn và đưa lên hệ thống.",
            tooltipPlacement: 'bottom',
            icon: <BookOpenIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
            iconColorClass: "bg-indigo-100 dark:bg-indigo-900/30"
        },
        {
            title: "SỐ HỌC LIỆU",
            description: "đã giao cho học sinh",
            value: totalAssignedMaterials.toLocaleString(),
            tooltip: (
                <div className="text-left">
                    <span className="font-bold text-indigo-300">Số học liệu đã giao cho học sinh</span> là tổng số học liệu mà giáo viên đã lấy từ hệ thống để đưa đến học sinh.
                    <br/><br/>
                    <span className="text-red-400 font-bold">Mỗi học liệu chỉ được tính một lần, dù có được giao cho nhiều lớp.</span>
                    <br/><br/>
                    <span className="italic">Ví dụ: Một học liệu được giao cho 5 lớp vẫn được tính là 1 học liệu.</span>
                </div>
            ),
            tooltipPlacement: 'bottom',
            icon: <DesktopComputerIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
            iconColorClass: "bg-blue-100 dark:bg-blue-900/30"
        },
        {
            title: "TỶ LỆ HOÀN THÀNH",
            description: "của học sinh toàn trường",
            value: `${globalCompletionRate}%`,
            tooltip: "Tỷ lệ % tổng số lượt học sinh đã hoàn thành trên tổng số lượt học liệu đã giao. (Ví dụ: Lớp 30 em, giao 10 bài = 300 lượt. Nếu hoàn thành 150 lượt = 50%).",
            tooltipPlacement: 'bottom',
            icon: <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />,
            iconColorClass: "bg-green-100 dark:bg-green-900/30"
        },
        // Row 2: Tests
        {
            title: "SỐ BÀI KIỂM TRA",
            description: "đã được giáo viên tạo",
            value: totalAssignedTests.toLocaleString(),
            tooltip: "Tổng số bài kiểm tra trực tuyến đã được tạo trên hệ thống.",
            tooltipPlacement: 'bottom',
            icon: <ClipboardListIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />,
            iconColorClass: "bg-orange-100 dark:bg-orange-900/30"
        },
        {
            title: "SỐ BÀI KIỂM TRA",
            description: "đang diễn ra",
            value: ongoingTests.toLocaleString(),
            tooltip: "Số lượng bài kiểm tra đang trong thời gian làm bài.",
            tooltipPlacement: 'bottom',
            icon: <TrendingUpIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />,
            iconColorClass: "bg-yellow-100 dark:bg-yellow-900/30"
        },
        {
            title: "SỐ BÀI KIỂM TRA",
            description: "đã kết thúc",
            value: finishedTests.toLocaleString(),
            tooltip: "Số lượng bài kiểm tra đã hết hạn làm bài.",
            tooltipPlacement: 'bottom',
            icon: <CheckCircleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />,
            iconColorClass: "bg-red-100 dark:bg-red-900/30"
        }
    ];

    // Warning Modal Data Generation
    const warningData = useMemo(() => {
        if (!warningState) return [];
        // Use the exact number of weak tests from the state to generate details
        return generateWeakDataForGrade(warningState.grade, warningState.totalWeak);
    }, [warningState]);

    // --- RENDERERS ---

    const renderScoreSpectrum = () => {
        // Calculate Total Students for the current selection
        const totalStudents = spectrumData.data.reduce((a, b) => a + b, 0);

        // ChartJS Config
        const chartData = {
            labels: ['0-3 điểm', '3-5 điểm', '5-6.5 điểm', '6.5-8 điểm', '8-9 điểm', '9-10 điểm'],
            datasets: [{
                data: spectrumData.data,
                backgroundColor: [
                    '#ef4444', // Red-500 (0-3)
                    '#f97316', // Orange-500 (3-5)
                    '#eab308', // Yellow-500 (5-6.5)
                    '#3b82f6', // Blue-500 (6.5-8)
                    '#22c55e', // Green-500 (8-9)
                    '#15803d', // Green-700 (9-10) - REQUESTED: Rich Green for Excellence
                ],
                // Add border only to the 9-10 excellent bar to make it pop
                borderWidth: [0, 0, 0, 0, 0, 3],
                borderColor: [,,,,'', '#d97706'], // Darker Amber border for 9-10
                borderRadius: 8,
                barThickness: 50, // Thicker bars for visibility
            }]
        };

        // Custom Plugin to draw values at the end of bars
        const scoreLabelPlugin = {
            id: 'scoreLabelPlugin',
            afterDatasetsDraw(chart: any) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset: any, i: number) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element: any, index: number) => {
                        const data = dataset.data[index];
                        if (data === null || data === undefined) return;

                        ctx.font = 'bold 16px "Inter", sans-serif'; 
                        ctx.fillStyle = '#334155'; // Dark slate for visibility
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        
                        // Draw text above the bar
                        ctx.fillText(data.toString(), element.x, element.y - 8);
                    });
                });
            }
        };
    
        const options: any = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    padding: 16,
                    titleFont: { size: 16, weight: 'bold' }, // Bigger tooltip text
                    bodyFont: { size: 16 }, // Bigger tooltip text
                    callbacks: {
                        label: (ctx: any) => `${ctx.raw} học sinh`
                    }
                }
            },
            scales: {
                y: {
                    display: true, // Enable Y axis for readability
                    grid: { 
                        display: true, 
                        color: 'rgba(0,0,0,0.05)' 
                    },
                    ticks: {
                        font: { size: 14, weight: '600' },
                        color: '#64748b'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 14, weight: 'bold' }, // Bigger axis labels
                        color: '#334155'
                    }
                }
            },
            layout: {
                 padding: { top: 30, left: 10, right: 10, bottom: 10 }
            }
        };
    
        return (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-slate-300 dark:border-gray-500 mt-10">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 text-indigo-700 dark:text-indigo-400 mb-2">
                             <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.125c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.625c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.75v-6.625z" />
                                </svg>
                             </div>
                            <h3 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                                PHỔ ĐIỂM HỌC SINH THEO BÀI KIỂM TRA
                                <InfoTooltip text="Biểu đồ phân bố điểm số của học sinh dựa trên kết quả các bài kiểm tra đã thực hiện trên hệ thống." />
                            </h3>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                             <p className="text-base font-medium text-slate-500 dark:text-gray-400">
                                Phân tích kết quả <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{getGradeLabel(spectrumGrade)}</span> - Môn <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">{spectrumSubject}</span>
                            </p>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                            <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
                                Tổng số: <span className="text-slate-900 dark:text-white text-xl">{totalStudents}</span> học sinh
                            </p>
                        </div>
                       
                    </div>
                    
                    <div className="relative min-w-[200px]">
                        <label className="block text-sm font-bold text-slate-500 mb-1 ml-1">Chọn Lớp:</label>
                        <select 
                            value={spectrumGrade}
                            onChange={(e) => setSpectrumGrade(Number(e.target.value))}
                            className="w-full appearance-none bg-slate-100 dark:bg-gray-700 border-2 border-slate-200 dark:border-gray-600 text-slate-800 dark:text-white py-3 pl-4 pr-10 rounded-xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                        >
                            {[5,6,7,8,9,10,11,12,13,14].map(g => (
                                <option key={g} value={g}>{getGradeLabel(g)}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute bottom-4 right-3 flex items-center px-2 text-slate-600 dark:text-white">
                            <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
    
                {/* Subject Tabs - Re-styled similar to leaderboard toggle */}
                <div className="bg-slate-100 dark:bg-gray-700 p-2 rounded-xl flex gap-2 overflow-x-auto custom-scrollbar mb-6">
                    {SUBJECTS.map(sub => (
                        <button
                            key={sub}
                            onClick={() => setSpectrumSubject(sub)}
                            className={`px-6 py-3 rounded-lg text-base font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                                spectrumSubject === sub 
                                ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
                                : 'text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-200/50'
                            }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
    
                {/* Chart Area - Increased Height */}
                <div className="h-[500px] w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                    <Bar data={chartData} options={options} plugins={[scoreLabelPlugin]} />
                </div>
    
                {/* Footer Stats - Enhanced Visibility */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-slate-50 dark:bg-gray-700/30 rounded-2xl p-6 border-l-8 border-indigo-500 flex flex-col items-start justify-center shadow-sm">
                        <span className="text-lg font-bold text-slate-600 dark:text-gray-300 mb-1">Điểm trung bình môn toàn lớp</span>
                        <span className="text-4xl font-black text-slate-800 dark:text-white">{spectrumData.average}</span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 rounded-2xl p-6 border-l-8 border-green-500 flex flex-col items-start justify-center shadow-sm">
                         <div className="flex justify-between w-full items-center">
                            <span className="text-lg font-bold text-green-800 dark:text-green-300 mb-1">Đạt yêu cầu (≥5)</span>
                            <CheckCircleIcon className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                        <span className="text-4xl font-black text-green-600 dark:text-green-400">{spectrumData.passRate}%</span>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-6 border-l-8 border-red-500 flex flex-col items-start justify-center shadow-sm">
                        <div className="flex justify-between w-full items-center">
                            <span className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">Dưới trung bình</span>
                            <WarningIcon className="w-8 h-8 text-red-500 opacity-50" />
                        </div>
                        <span className="text-4xl font-black text-red-600 dark:text-red-400">{spectrumData.failRate}%</span>
                    </div>
                </div>
            </div>
        );
    }

    const renderWarningModal = () => {
        if (!warningState) return null;
        
        const { grade, totalAssigned } = warningState;

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setWarningState(null)}>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] animate-fade-in transform scale-100 flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
                        <div className="flex items-center gap-4 text-red-600 dark:text-red-400">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <WarningIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-2xl font-bold">Cảnh báo học tập - {getGradeLabel(grade)}</h3>
                                    <InfoTooltip text="Cảnh báo lưu ý sẽ xuất hiện khi tỉ lệ điểm Yếu của 1 lớp (trên tổng đã giao) vượt quá 20%." />
                                </div>
                                <p className="text-base text-gray-500 dark:text-gray-400 font-normal mt-1">Danh sách học sinh có kết quả kiểm tra thấp cần lưu ý</p>
                            </div>
                        </div>
                        <button onClick={() => setWarningState(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <XIcon className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Modal Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50 dark:bg-gray-900/50">
                        {warningData.length > 0 ? (
                            <div className="space-y-4">
                                {warningData.map((cls) => {
                                    // Calculate percentage of contribution to the TOTAL GRADE WEAK RATE
                                    // Formula: (ClassWeakTests / TotalGradeAssigned) * 100
                                    // This ensures that Sum(Class%) = GradeWeakRate% (e.g. 21%)
                                    const percentageOfGradeRate = totalAssigned > 0 
                                        ? ((cls.totalWeakTests / totalAssigned) * 100).toFixed(1) 
                                        : '0';

                                    return (
                                        <div key={cls.className} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                                            {/* Class Accordion Header */}
                                            <div 
                                                onClick={() => setExpandedClassId(expandedClassId === cls.className ? null : cls.className)}
                                                className={`
                                                    flex items-center p-5 cursor-pointer select-none transition-colors
                                                    ${expandedClassId === cls.className ? 'bg-indigo-50 dark:bg-gray-700/60' : 'hover:bg-slate-50 dark:hover:bg-gray-700/30'}
                                                `}
                                            >
                                                <span className="font-bold text-xl text-slate-800 dark:text-white">{cls.className}</span>
                                                
                                                {/* Percentage contribution next to class name */}
                                                <span className="ml-4 text-base text-gray-500 dark:text-gray-400">
                                                    Chiếm <span className="font-bold text-red-500">{Number(percentageOfGradeRate)}%</span> tỷ lệ yếu toàn lớp
                                                </span>
                                                
                                                {/* Spacer to push count to right */}
                                                <div className="flex-1"></div>

                                                <div className="flex items-center gap-4">
                                                    <span className="px-4 py-1.5 text-base font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-full border border-red-200 dark:border-red-800">
                                                        {cls.students.length} học sinh
                                                    </span>
                                                    <svg 
                                                        className={`w-6 h-6 text-gray-400 transition-transform duration-200 ${expandedClassId === cls.className ? 'rotate-180 text-indigo-500' : ''}`} 
                                                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Class Students Table */}
                                            {expandedClassId === cls.className && (
                                                <div className="border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 animate-fade-in">
                                                    <div className="w-full">
                                                        {/* Table Header */}
                                                        <div className="grid grid-cols-12 gap-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 py-4 px-6 text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                                            <div className="col-span-1 text-center">STT</div>
                                                            <div className="col-span-3">Họ và tên</div>
                                                            <div className="col-span-2 text-center">Tổng số bài yếu</div>
                                                            <div className="col-span-6">Nội dung cần chú ý</div>
                                                        </div>

                                                        {/* Table Body */}
                                                        {cls.students.map((student, idx) => (
                                                            <div 
                                                                key={student.id} 
                                                                className={`grid grid-cols-12 gap-4 border-b border-gray-100 dark:border-gray-700/50 py-5 px-6 items-start hover:bg-slate-50 dark:hover:bg-gray-700/20 transition-colors ${idx === cls.students.length - 1 ? 'border-b-0' : ''}`}
                                                            >
                                                                <div className="col-span-1 text-center text-base text-gray-500 dark:text-gray-400 font-medium mt-1">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="col-span-3">
                                                                    <div className="text-base font-bold text-gray-800 dark:text-white">{student.name}</div>
                                                                    <div className="text-sm text-gray-400 mt-1">{cls.className}</div>
                                                                </div>
                                                                <div className="col-span-2 text-center">
                                                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-md text-base font-bold bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                                                                        {student.weakTests.length} bài
                                                                    </span>
                                                                </div>
                                                                <div className="col-span-6">
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {student.weakTests.map((test, tIdx) => (
                                                                            <div 
                                                                                key={tIdx} 
                                                                                className="flex flex-col p-3 rounded-lg bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-900/30"
                                                                            >
                                                                                <div className="flex justify-between items-center w-full mb-1">
                                                                                     <span className="font-bold text-red-700 dark:text-red-300 text-sm">{test.subject}</span>
                                                                                     <span className="text-sm font-bold text-red-600 dark:text-red-400">Điểm: {test.score}</span>
                                                                                </div>
                                                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate" title={test.testName}>
                                                                                    {test.testName}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-full mb-4">
                                    <CheckCircleIcon className="w-16 h-16 text-green-500" />
                                </div>
                                <h4 className="text-2xl font-bold text-gray-800 dark:text-white">Tuyệt vời!</h4>
                                <p className="text-gray-500 dark:text-gray-400 font-medium mt-2 text-lg">Không có học sinh nào bị cảnh báo ở lớp này.</p>
                            </div>
                        )}
                    </div>
                    
                     <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex justify-end items-center gap-4 shrink-0 bg-white dark:bg-gray-800 rounded-b-xl">
                        <button
                            onClick={handleExportWarningExcel}
                            className="flex items-center gap-2 px-5 py-3 text-base font-bold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <DownloadIcon className="w-6 h-6" />
                            <span>Xuất Excel từng lớp</span>
                        </button>
                        <button 
                            onClick={() => setWarningState(null)}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderOverview = () => {
        const materialChartData = CLASS_IDS.map((classId, index) => {
            const classData = classes.find(c => c.id === classId);
            const compMat = classData?.completedMaterials || 0;
            const assignedMat = classData?.assignedMaterials || 0;
            
            const total = assignedMat; 
            const percentage = total > 0 ? Math.round((compMat / total) * 100) : 0;
            const unfinished = total - compMat;

            return { grade: 5, classIndex: index, className: CLASS_NAMES_LIST[index], compMat, unfinished, total, percentage };
        });

        // Test Data Generation (Simulated for Quality)
        const testChartData = CLASS_IDS.map((classId, index) => {
            const classData = classes.find(c => c.id === classId);
            const assignedTest = classData?.assignedTests || 0;
            const completedTestInstances = classData?.completedTests || 0;
            
            // Generate data to demo the warning feature
            const completionRatio = 0.8;
            const weakRatioOfAssigned = 0.1;

            const completedTest = Math.floor(assignedTest * completionRatio);
            const unfinished = assignedTest - completedTest;
            const weak = Math.floor(assignedTest * weakRatioOfAssigned);
            const actualWeak = Math.min(weak, completedTest);
            const remaining = completedTest - actualWeak;
            const excellent = Math.floor(remaining * 0.6);
            const average = remaining - excellent;

            return { 
                classIndex: index,
                className: CLASS_NAMES_LIST[index],
                assignedTest, 
                completedTest, // Total completed instances
                excellent, 
                average, 
                weak: actualWeak,
                unfinished
            };
        });

        const maxTotalMat = Math.max(...materialChartData.map(d => d.total));
        const yAxisMaxMat = Math.max(Math.ceil(maxTotalMat * 1.15), 10);
        
        // Y-Axis for Test chart is now 0-100%
        const yAxisMaxTest = 100;

        return (
            <div className="space-y-8 animate-fade-in">
                
                {/* 1. Material Progress Chart */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center">
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Tiến độ hoàn thành Học liệu</h3>
                                <InfoTooltip text="Biểu đồ cột chồng thể hiện số lượng Học liệu đã hoàn thành so với Tổng số học liệu đã giao cho học sinh." />
                            </div>
                            <p className="text-base text-slate-500 dark:text-gray-400 mt-2">So sánh mức độ hoàn thành học liệu giữa các lớp.</p>
                        </div>
                        <div className="flex items-center gap-6 mt-4 sm:mt-0 text-base">
                            <div className="flex items-center"><span className="w-4 h-4 bg-slate-300 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">Chưa hoàn thành</span></div>
                            <div className="flex items-center"><span className="w-4 h-4 bg-orange-500 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">Đã hoàn thành</span></div>
                        </div>
                    </div>

                    <div className="h-72 w-full relative pl-12 pb-8 overflow-x-auto custom-scrollbar">
                        <div className="min-w-full">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 left-12 bottom-8 flex flex-col justify-between pointer-events-none pr-4">
                            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                                <div key={ratio} className="border-b border-dashed border-gray-200 dark:border-gray-700 w-full h-0 relative">
                                    <span className="absolute -top-3 -left-12 text-sm text-gray-500 dark:text-gray-400 w-10 text-right font-medium">{Math.round(yAxisMaxMat * ratio)}</span>
                                </div>
                            ))}
                        </div>
                        {/* Bars */}
                        <div className="absolute inset-0 left-12 bottom-8 flex items-end justify-around gap-2 sm:gap-8 px-2 sm:px-8">
                            {materialChartData.map((data) => {
                                const totalHeightPct = (data.total / yAxisMaxMat) * 100;
                                const unfinishedPct = data.total > 0 ? (data.unfinished / data.total) * 100 : 0;
                                const completedPct = data.total > 0 ? (data.compMat / data.total) * 100 : 0;

                                return (
                                    <div key={data.className} className="flex flex-col items-center flex-1 h-full justify-end group z-10 relative">
                                        <div className="mb-1 text-base font-bold text-slate-700 dark:text-slate-200 transition-all duration-300 group-hover:-translate-y-1 whitespace-nowrap">{data.total.toLocaleString()}</div>
                                        <div style={{ height: `${totalHeightPct}%` }} className="w-full max-w-[70px] flex flex-col relative rounded-t-lg overflow-hidden shadow-sm">
                                            <div style={{ height: `${unfinishedPct}%` }} className="w-full bg-slate-300 dark:bg-slate-600 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                <span className="text-slate-800 dark:text-slate-200 font-bold text-sm opacity-0 group-hover/seg:opacity-100 transition-opacity select-none drop-shadow-sm">{data.unfinished}</span>
                                            </div>
                                            <div style={{ height: `${completedPct}%` }} className="w-full bg-orange-500 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                <span className="text-white font-bold text-sm opacity-0 group-hover/seg:opacity-100 transition-opacity select-none drop-shadow-md">{data.compMat}</span>
                                            </div>
                                        </div>
                                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-bold text-slate-700 dark:text-gray-300 text-base whitespace-nowrap pt-2">Lớp {data.className}</span>
                                    </div>
                                );
                            })}
                        </div>
                        </div>
                    </div>
                </div>

                {/* 2. Test Statistics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* 2a. Test Quantity (Completion) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
                            <div>
                                <div className="flex items-center">
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Tiến độ làm Bài kiểm tra</h3>
                                    <InfoTooltip text="Số lượng bài kiểm tra đã được học sinh hoàn thành so với tổng số bài được giao." />
                                </div>
                                <p className="text-base text-slate-500 dark:text-gray-400 mt-2">So sánh mức độ hoàn thành bài kiểm tra giữa các lớp.</p>
                            </div>
                            <div className="flex items-center gap-4 mt-4 sm:mt-0 text-sm sm:text-base">
                                <div className="flex items-center"><span className="w-3 h-3 bg-slate-300 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">Chưa làm</span></div>
                                <div className="flex items-center"><span className="w-3 h-3 bg-indigo-500 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">Đã làm</span></div>
                            </div>
                        </div>

                        <div className="h-72 w-full relative pl-8 pb-8 overflow-x-auto custom-scrollbar">
                            <div className="min-w-full">
                            {/* Grid Lines */}
                            <div className="absolute inset-0 left-8 bottom-8 flex flex-col justify-between pointer-events-none pr-2">
                                {[1, 0.5, 0].map((ratio) => (
                                    <div key={ratio} className="border-b border-dashed border-gray-200 dark:border-gray-700 w-full h-0 relative">
                                        <span className="absolute -top-3 -left-8 text-sm text-gray-400 w-6 text-right">{Math.round(yAxisMaxTest * ratio)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Bars */}
                            <div className="absolute inset-0 left-8 bottom-8 flex items-end justify-around gap-2 px-2">
                                {testChartData.map((data) => {
                                    const totalHeightPct = (data.assignedTest / yAxisMaxTest) * 100;
                                    const unfinishedPct = data.assignedTest > 0 ? (data.unfinished / data.assignedTest) * 100 : 0;
                                    const completedPct = data.assignedTest > 0 ? (data.completedTest / data.assignedTest) * 100 : 0;

                                    return (
                                        <div key={data.grade} className="flex flex-col items-center flex-1 h-full justify-end group z-10 relative">
                                            <div className="mb-1 text-base font-bold text-slate-700 dark:text-slate-200">{data.assignedTest}</div>
                                            <div style={{ height: `${totalHeightPct}%` }} className="w-full max-w-[60px] flex flex-col relative rounded-t-lg overflow-hidden shadow-sm">
                                                <div style={{ height: `${unfinishedPct}%` }} className="w-full bg-slate-300 dark:bg-slate-600 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                     <span className="text-slate-800 dark:text-slate-200 font-bold text-sm opacity-0 group-hover/seg:opacity-100 transition-opacity select-none">{data.unfinished}</span>
                                                </div>
                                                <div style={{ height: `${completedPct}%` }} className="w-full bg-indigo-500 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                     <span className="text-white font-bold text-sm opacity-0 group-hover/seg:opacity-100 transition-opacity select-none">{data.completedTest}</span>
                                                </div>
                                            </div>
                                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 font-bold text-slate-600 dark:text-gray-400 text-base whitespace-nowrap pt-2">Lớp {data.className}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>
                        </div>
                    </div>

                    {/* 2b. Test Quality (Score Spectrum) */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
                            <div className="flex items-center">
                                {/* Renamed title per request */}
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Tỷ lệ phổ điểm Bài kiểm tra</h3>
                                {/* Removed warning definition from tooltip per request */}
                                <InfoTooltip text="Biểu đồ hiển thị tỷ lệ % kết quả làm bài trên tổng số lượt bài kiểm tra đã giao." />
                            </div>
                             <div className="flex items-center gap-4 mt-4 sm:mt-0 text-sm sm:text-base">
                                <div className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">0-5 điểm</span></div>
                                <div className="flex items-center"><span className="w-3 h-3 bg-yellow-400 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">5-8 điểm</span></div>
                                <div className="flex items-center"><span className="w-3 h-3 bg-emerald-500 rounded-sm mr-2"></span><span className="text-slate-600 dark:text-gray-300">8-10 điểm</span></div>
                            </div>
                        </div>

                        <div className="h-72 w-full relative pl-8 pb-20 overflow-x-auto custom-scrollbar">
                            <div className="min-w-full">
                             {/* Grid Lines */}
                            <div className="absolute inset-0 left-8 bottom-8 flex flex-col justify-between pointer-events-none pr-2">
                                {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                                    <div key={ratio} className="border-b border-dashed border-gray-200 dark:border-gray-700 w-full h-0 relative">
                                        <span className="absolute -top-3 -left-8 text-sm text-gray-400 w-6 text-right">{Math.round(yAxisMaxTest * ratio)}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Bars */}
                            <div className="absolute inset-0 left-8 bottom-8 flex items-end justify-around gap-2 px-2">
                                {testChartData.map((data) => {
                                    // Calculations based on Total Assigned
                                    const totalAssigned = data.assignedTest || 1;
                                    
                                    const excPctAssigned = (data.excellent / totalAssigned) * 100;
                                    const avgPctAssigned = (data.average / totalAssigned) * 100;
                                    const weakPctAssigned = (data.weak / totalAssigned) * 100;
                                    
                                    const totalCompletedPct = excPctAssigned + avgPctAssigned + weakPctAssigned;
                                    const isWarning = weakPctAssigned >= 20;

                                    // Visual heights within the stacked bar (must sum to 100% of the bar's height)
                                    // The bar's visual height is determined by totalCompletedPct
                                    
                                    // To calculate the inner height relative to the parent bar (which has height = totalCompletedPct), 
                                    // we need: (segment_pct / totalCompletedPct) * 100
                                    
                                    const visualExcHeight = totalCompletedPct > 0 ? (excPctAssigned / totalCompletedPct) * 100 : 0;
                                    const visualAvgHeight = totalCompletedPct > 0 ? (avgPctAssigned / totalCompletedPct) * 100 : 0;
                                    const visualWeakHeight = totalCompletedPct > 0 ? (weakPctAssigned / totalCompletedPct) * 100 : 0;

                                    return (
                                        <div key={data.grade} className={`flex flex-col items-center flex-1 h-full justify-end group z-10 relative rounded-xl transition-colors duration-300 ${isWarning ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                                            
                                            <div className="mb-1 text-base font-bold text-slate-700 dark:text-slate-200">{Math.round(totalCompletedPct)}%</div>
                                            
                                            {/* NOTE: Removed overflow-hidden to allow tooltips to show */}
                                            <div style={{ height: `${totalCompletedPct}%` }} className="w-full max-w-[60px] flex flex-col relative rounded-t-lg shadow-sm bg-slate-100 dark:bg-gray-700">
                                                {/* Stacked segments: Excellent (Top), Average, Weak (Bottom) */}
                                                
                                                {/* Excellent - Added rounded-t-lg to match parent */}
                                                <div style={{ height: `${visualExcHeight}%` }} className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                    <span className="text-white font-bold text-xs opacity-0 group-hover/seg:opacity-100 transition-opacity select-none">{Math.round(excPctAssigned)}%</span>
                                                    {/* Tooltip for Excellent */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-4 py-2 bg-gray-900 text-white text-sm rounded-md shadow-xl opacity-0 invisible group-hover/seg:opacity-100 group-hover/seg:visible transition-all z-50 pointer-events-none">
                                                        <div className="font-semibold text-center text-emerald-400 mb-1">8-10 điểm</div>
                                                        <div className="font-semibold text-center">{data.excellent} bài</div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </div>
                                                
                                                {/* Average */}
                                                <div style={{ height: `${visualAvgHeight}%` }} className="w-full bg-yellow-400 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                     <span className="text-slate-800 font-bold text-xs opacity-0 group-hover/seg:opacity-100 transition-opacity select-none">{Math.round(avgPctAssigned)}%</span>
                                                     {/* Tooltip for Average */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-4 py-2 bg-gray-900 text-white text-sm rounded-md shadow-xl opacity-0 invisible group-hover/seg:opacity-100 group-hover/seg:visible transition-all z-50 pointer-events-none">
                                                        <div className="font-semibold text-center text-yellow-400 mb-1">5-8 điểm</div>
                                                        <div className="font-semibold text-center">{data.average} bài</div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </div>
                                                
                                                {/* Weak */}
                                                <div style={{ height: `${visualWeakHeight}%` }} className="w-full bg-red-500 transition-all duration-500 relative group/seg flex items-center justify-center cursor-pointer hover:opacity-90">
                                                     <span className="text-white font-bold text-xs opacity-0 group-hover/seg:opacity-100 transition-opacity select-none">{Math.round(weakPctAssigned)}%</span>
                                                     {/* Tooltip for Weak */}
                                                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-4 py-2 bg-gray-900 text-white text-sm rounded-md shadow-xl opacity-0 invisible group-hover/seg:opacity-100 group-hover/seg:visible transition-all z-50 pointer-events-none">
                                                        <div className="font-semibold text-center text-red-400 mb-1">0-5 điểm</div>
                                                        <div className="font-semibold text-center">{data.weak} bài</div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-gray-900"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 flex flex-col items-center mt-2 w-full">
                                                <span className="font-semibold text-slate-600 dark:text-gray-400 text-sm whitespace-nowrap pt-2">Lớp {data.className}</span>
                                                {isWarning && (
                                                     <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setWarningState({
                                                                grade: data.grade,
                                                                totalWeak: data.weak,
                                                                totalAssigned: data.assignedTest
                                                            }); 
                                                        }}
                                                        className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold rounded-full animate-pulse border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors whitespace-nowrap z-50 pointer-events-auto cursor-pointer"
                                                        title={`Cảnh báo: Tỷ lệ điểm yếu chiếm ${Math.round(weakPctAssigned)}% tổng lượt giao`}
                                                    >
                                                        Cần lưu ý
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderSubjectsAnalysis = () => {
        // Shared Row Renderer for Subjects
        const renderRow = (
            subject: SubjectStat, 
            rank: number, 
            isTop: boolean, 
            type: 'material' | 'test',
            criteria: LeaderboardCriteria
        ) => {
             // Specific styles for Top 3
            let rowStyle = 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
            let rankBadge = (
                <span className={`text-lg font-bold ${isTop ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400'}`}>{rank}</span>
            );

            if (rank === 1) {
                rowStyle = 'bg-gradient-to-r from-yellow-50/80 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-300 dark:border-yellow-700 shadow-md transform hover:-translate-y-0.5 z-10';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center border border-yellow-300 shadow-sm">
                        <TrophyIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                );
            } else if (rank === 2) {
                rowStyle = 'bg-gradient-to-r from-slate-100 via-white to-white dark:from-slate-700/50 dark:to-gray-800 border-slate-300 dark:border-slate-600 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300 shadow-sm font-bold text-lg">
                        2
                    </div>
                );
            } else if (rank === 3) {
                 rowStyle = 'bg-gradient-to-r from-orange-100 via-white to-white dark:from-orange-900/30 dark:to-gray-800 border-orange-300 dark:border-orange-700 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center border border-orange-300 shadow-sm font-bold text-lg">
                        3
                    </div>
                );
            } else if (isTop) {
                 rowStyle = 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-gray-700 shadow-sm';
            }

            const createdValue = type === 'material' ? subject.lecturesCreated : subject.testsCreated;
            const assignedValue = type === 'material' ? subject.materialsAssigned : subject.assignedTests;
            const completedValue = type === 'material' ? subject.completedMaterials : subject.completedTests;
            
            // For subjects, completionRate is directly available in the object
            const specificRate = type === 'material' ? subject.completionRate : subject.testCompletionRate;

            return (
                <div key={subject.name} className={`
                    grid grid-cols-12 gap-4 p-5 items-center rounded-xl border-2 transition-all mb-4
                    ${rowStyle}
                `}>
                    <div className="col-span-1 flex justify-center">
                        {rankBadge}
                    </div>
                    <div className="col-span-3 pl-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xl truncate" title={subject.name}>{subject.name}</div>
                    </div>
                    
                    {/* Created Column */}
                    <div className={`col-span-2 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3 ${
                        criteria === 'created' 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 scale-110 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-700 z-10' 
                        : ''
                    }`}>
                        <div className={`text-2xl font-bold leading-none mb-1 transition-colors duration-300 ${
                            criteria === 'created' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                            {createdValue.toLocaleString()}
                        </div>
                        <div className={`text-sm uppercase tracking-wide font-semibold transition-colors duration-300 ${
                            criteria === 'created' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
                        }`}>Đã tạo</div>
                    </div>
                    
                    {/* Assigned Column */}
                    <div className="col-span-2 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3">
                        <div className="text-2xl font-bold leading-none mb-1 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                            {assignedValue.toLocaleString()}
                        </div>
                        <div className="text-sm uppercase tracking-wide font-semibold transition-colors duration-300 text-gray-500">
                            Đã giao HS
                        </div>
                    </div>
                    
                    {/* Rate Column */}
                    <div className={`col-span-4 flex justify-end items-center pl-4 transition-all duration-500 ease-out rounded-xl py-2 ${
                         criteria === 'rate' 
                         ? 'bg-indigo-50 dark:bg-indigo-900/30 scale-105 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-700 origin-right' 
                         : ''
                    }`}>
                        {renderRateBadge(specificRate, type === 'material' ? { completedMat: completedValue, completedTest: 0 } : { completedMat: 0, completedTest: completedValue })}
                    </div>
                </div>
            );
        };

        const renderTableSection = (
            title: string, 
            tooltip: string, 
            criteria: LeaderboardCriteria, 
            setCriteria: (c: LeaderboardCriteria) => void,
            dataList: SubjectStat[],
            type: 'material' | 'test',
            showAll: boolean,
            setShowAll: (v: boolean) => void
        ) => {
            // Sort data logic
            const sortedData = [...dataList].sort((a, b) => {
                const createdA = type === 'material' ? a.lecturesCreated : a.testsCreated;
                const rateA = type === 'material' ? a.completionRate : a.testCompletionRate;
                
                const createdB = type === 'material' ? b.lecturesCreated : b.testsCreated;
                const rateB = type === 'material' ? b.completionRate : b.testCompletionRate;

                if (criteria === 'rate') {
                    if (Math.abs(rateB - rateA) > 0.001) return rateB - rateA;
                    return createdB - createdA;
                } else {
                    return createdB - createdA;
                }
            });

            const top3 = sortedData.slice(0, 3);
            const others = sortedData.slice(3);

            return (
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 mb-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div className="flex items-center">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h3>
                            <InfoTooltip text={tooltip} />
                        </div>
                        
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <div className="flex bg-slate-100 dark:bg-gray-700 p-1.5 rounded-lg">
                                <button 
                                    onClick={() => setCriteria('created')}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${criteria === 'created' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {type === 'material' ? 'Học liệu số đã tạo' : 'Bài kiểm tra đã tạo'}
                                </button>
                                <button 
                                    onClick={() => setCriteria('rate')}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${criteria === 'rate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tỷ lệ học sinh hoàn thành
                                </button>
                            </div>
                            <button
                                onClick={() => handleExportSubjectStatsExcel(type)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="Xuất file Excel"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-4 px-6 pb-4 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-6">
                        <div className="col-span-1 text-center">Hạng</div>
                        <div className="col-span-3 pl-4">Môn học</div>
                        <div className={`col-span-2 text-center transition-colors duration-300 ${criteria === 'created' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                            {type === 'material' ? 'Học liệu số đã tạo' : 'Bài kiểm tra đã tạo'}
                        </div>
                        <div className="col-span-2 text-center transition-colors duration-300 whitespace-nowrap">
                            {type === 'material' ? 'Học liệu đã giao HS' : 'Bài kiểm tra đã giao HS'}
                        </div>
                        <div className={`col-span-4 text-right pr-4 transition-colors duration-300 ${criteria === 'rate' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                            Tỷ lệ học sinh hoàn thành
                        </div>
                    </div>

                    <div className="mb-2">
                        {top3.map((subject, index) => renderRow(subject, index + 1, true, type, criteria))}
                    </div>

                    {others.length > 0 && (
                        <div className="mt-4">
                            {showAll ? (
                                <div className="animate-fade-in">
                                    <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-600 pt-6 mt-6">
                                        <div className="rounded-xl overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: '600px' }}>
                                            {others.map((subject, index) => renderRow(subject, index + 4, false, type, criteria))}
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={() => setShowAll(false)}
                                            className="px-6 py-3 text-base font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                        >
                                            Thu gọn danh sách
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => setShowAll(true)}
                                        className="px-10 py-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-base font-bold rounded-full transition-all shadow-sm hover:shadow-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-3 mx-auto"
                                    >
                                        Xem tất cả môn học
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="space-y-8 animate-fade-in">
                {renderTableSection(
                    "Thống kê Môn học theo Học liệu số",
                    "Bảng xếp hạng các môn học dựa trên số lượng học liệu đã biên soạn và mức độ học sinh hoàn thành.",
                    materialCriteria,
                    setMaterialCriteria,
                    subjects,
                    'material',
                    showAllMaterials,
                    setShowAllMaterials
                )}

                {renderTableSection(
                    "Thống kê Môn học theo Bài kiểm tra",
                    "Bảng xếp hạng các môn học dựa trên số lượng bài kiểm tra đã tổ chức và mức độ học sinh hoàn thành.",
                    testCriteria,
                    setTestCriteria,
                    subjects,
                    'test',
                    showAllTests,
                    setShowAllTests
                )}
            </div>
        );
    };

    const renderTeachersAnalysis = () => {
        // --- Shared Row Renderer adapted for Teachers ---
        const renderRow = (
            teacher: TeacherLMSStat, 
            rank: number, 
            isTop: boolean, 
            type: 'material' | 'test',
            criteria: LeaderboardCriteria
        ) => {
             // Specific styles for Top 3
            let rowStyle = 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
            let rankBadge = (
                <span className={`text-lg font-bold ${isTop ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400'}`}>{rank}</span>
            );

            if (rank === 1) {
                rowStyle = 'bg-gradient-to-r from-yellow-50/80 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-300 dark:border-yellow-700 shadow-md transform hover:-translate-y-0.5 z-10';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center border border-yellow-300 shadow-sm">
                        <TrophyIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                );
            } else if (rank === 2) {
                rowStyle = 'bg-gradient-to-r from-slate-100 via-white to-white dark:from-slate-700/50 dark:to-gray-800 border-slate-300 dark:border-slate-600 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300 shadow-sm font-bold text-lg">
                        2
                    </div>
                );
            } else if (rank === 3) {
                 rowStyle = 'bg-gradient-to-r from-orange-100 via-white to-white dark:from-orange-900/30 dark:to-gray-800 border-orange-300 dark:border-orange-700 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center border border-orange-300 shadow-sm font-bold text-lg">
                        3
                    </div>
                );
            } else if (isTop) {
                 rowStyle = 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-gray-700 shadow-sm';
            }

            // --- CHANGED: Use Created as Quantity, Assigned as Progress base ---
            const createdValue = type === 'material' ? teacher.lecturesCreated : teacher.testsCreated;
            const assignedValue = type === 'material' ? teacher.materialsAssigned : teacher.assignedTests;
            const completedValue = type === 'material' ? teacher.completedMaterials : teacher.completedTests;
            
            // Calculate specific rates instead of generic rate
            const specificRate = assignedValue > 0 
                ? Math.round((completedValue / assignedValue) * 100)
                : 0;

            return (
                <div key={teacher.id} className={`
                    grid grid-cols-12 gap-4 p-5 items-center rounded-xl border-2 transition-all mb-4
                    ${rowStyle}
                `}>
                    <div className="col-span-1 flex justify-center">
                        {rankBadge}
                    </div>
                    <div className="col-span-3 pl-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xl truncate" title={teacher.name}>{teacher.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{teacher.subject} - {teacher.assignedGrade}</div>
                    </div>
                    
                    {/* Created Column (Used as Primary Quantity metric) */}
                    <div className={`col-span-2 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3 ${
                        criteria === 'created' 
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 scale-110 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-700 z-10' 
                        : ''
                    }`}>
                        <div className={`text-2xl font-bold leading-none mb-1 transition-colors duration-300 ${
                            criteria === 'created' ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                            {createdValue.toLocaleString()}
                        </div>
                        <div className={`text-sm uppercase tracking-wide font-semibold transition-colors duration-300 ${
                            criteria === 'created' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500'
                        }`}>Đã tạo</div>
                    </div>
                    
                    {/* Assigned Column (Used as Progress Context) */}
                    <div className="col-span-2 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3">
                        <div className="text-2xl font-bold leading-none mb-1 transition-colors duration-300 text-gray-800 dark:text-gray-200">
                            {assignedValue.toLocaleString()}
                        </div>
                        <div className="text-sm uppercase tracking-wide font-semibold transition-colors duration-300 text-gray-500">
                            Đã giao HS
                        </div>
                    </div>
                    
                    {/* Rate Column */}
                    <div className={`col-span-4 flex justify-end items-center pl-4 transition-all duration-500 ease-out rounded-xl py-2 ${
                         criteria === 'rate' 
                         ? 'bg-indigo-50 dark:bg-indigo-900/30 scale-105 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-700 origin-right' 
                         : ''
                    }`}>
                        {renderRateBadge(specificRate, type === 'material' ? { completedMat: completedValue, completedTest: 0 } : { completedMat: 0, completedTest: completedValue })}
                    </div>
                </div>
            );
        };

        const renderTableSection = (
            title: string, 
            tooltip: string, 
            criteria: LeaderboardCriteria, 
            setCriteria: (c: LeaderboardCriteria) => void,
            dataList: TeacherLMSStat[],
            type: 'material' | 'test',
            showAll: boolean,
            setShowAll: (v: boolean) => void
        ) => {
            // Sort data logic for Teachers
            const sortedData = [...dataList].sort((a, b) => {
                const createdA = type === 'material' ? a.lecturesCreated : a.testsCreated;
                const assignedA = type === 'material' ? a.materialsAssigned : a.assignedTests;
                const completedA = type === 'material' ? a.completedMaterials : a.completedTests;
                const rateA = assignedA > 0 ? completedA / assignedA : 0;
                
                const createdB = type === 'material' ? b.lecturesCreated : b.testsCreated;
                const assignedB = type === 'material' ? b.materialsAssigned : b.assignedTests;
                const completedB = type === 'material' ? b.completedMaterials : b.completedTests;
                const rateB = assignedB > 0 ? completedB / assignedB : 0;

                if (criteria === 'rate') {
                    if (Math.abs(rateB - rateA) > 0.001) return rateB - rateA;
                    return createdB - createdA; // Tie-break by created quantity
                } else {
                    return createdB - createdA;
                }
            });

            const top3 = sortedData.slice(0, 3);
            const others = sortedData.slice(3);

            return (
                <div className="flex flex-col xl:flex-row gap-6 animate-fade-in mb-8">
                    {/* Table Column (60%) */}
                    <div className="w-full xl:w-3/5">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 h-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                                <div className="flex items-center">
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h3>
                                    <InfoTooltip text={tooltip} />
                                </div>
                                
                                <div className="flex items-center gap-3 self-start sm:self-auto">
                                    <div className="flex bg-slate-100 dark:bg-gray-700 p-1.5 rounded-lg">
                                        <button 
                                            onClick={() => setCriteria('created')}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${criteria === 'created' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {type === 'material' ? 'Học liệu số đã tạo' : 'Bài kiểm tra đã tạo'}
                                        </button>
                                        <button 
                                            onClick={() => setCriteria('rate')}
                                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${criteria === 'rate' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Tỷ lệ học sinh hoàn thành
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleExportTeacherStatsExcel(type)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                        title="Xuất file Excel"
                                    >
                                        <DownloadIcon className="w-5 h-5" />
                                        <span>Xuất Excel</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-12 gap-4 px-6 pb-4 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-6">
                                <div className="col-span-1 text-center">Hạng</div>
                                <div className="col-span-3 pl-4">Giáo viên</div>
                                <div className={`col-span-2 text-center transition-colors duration-300 ${criteria === 'created' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                                    {type === 'material' ? 'Học liệu số đã tạo' : 'Bài kiểm tra đã tạo'}
                                </div>
                                <div className="col-span-2 text-center transition-colors duration-300 whitespace-nowrap">
                                    {type === 'material' ? 'Học liệu đã giao HS' : 'Bài kiểm tra đã giao HS'}
                                </div>
                                <div className={`col-span-4 text-right pr-4 transition-colors duration-300 ${criteria === 'rate' ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                                    Tỷ lệ học sinh hoàn thành
                                </div>
                            </div>

                            <div className="mb-2">
                                {top3.map((teacher, index) => renderRow(teacher, index + 1, true, type, criteria))}
                            </div>

                            {others.length > 0 && (
                                <div className="mt-4">
                                    {showAll ? (
                                        <div className="animate-fade-in">
                                            <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-600 pt-6 mt-6">
                                                <div className="rounded-xl overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: '600px' }}>
                                                    {others.map((teacher, index) => renderRow(teacher, index + 4, false, type, criteria))}
                                                </div>
                                            </div>
                                            <div className="mt-6 flex justify-center">
                                                <button
                                                    onClick={() => setShowAll(false)}
                                                    className="px-6 py-3 text-base font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                                >
                                                    Thu gọn danh sách
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <button
                                                onClick={() => setShowAll(true)}
                                                className="px-10 py-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-base font-bold rounded-full transition-all shadow-sm hover:shadow-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-3 mx-auto"
                                            >
                                                Xem tất cả giáo viên
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart Column (40%) */}
                    <div className="w-full xl:w-2/5">
                        <TeacherPerformanceChart 
                            data={dataList} 
                            type={type} 
                            isExpanded={showAll} 
                            onToggleExpand={() => setShowAll(!showAll)}
                        />
                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-8 animate-fade-in">
                {/* REMOVED SEARCH BAR HERE */}

                {renderTableSection(
                    "Thống kê Giáo viên theo Học liệu số",
                    "Bảng xếp hạng giáo viên dựa trên số lượng học liệu số đã tạo và mức độ hoàn thành của học sinh.",
                    teacherMaterialCriteria,
                    setTeacherMaterialCriteria,
                    filteredTeachers,
                    'material',
                    showAllTeacherMaterials,
                    setShowAllTeacherMaterials
                )}
                
                {renderTableSection(
                    "Thống kê Giáo viên theo Bài kiểm tra",
                    "Bảng xếp hạng giáo viên dựa trên số lượng bài kiểm tra đã tạo và mức độ hoàn thành của học sinh.",
                    teacherTestCriteria,
                    setTeacherTestCriteria,
                    filteredTeachers,
                    'test',
                    showAllTeacherTests,
                    setShowAllTeacherTests
                )}
            </div>
        );
    };

    const renderClassRanking = () => {
        const sortedClasses = [...classes].sort((a, b) => b.totalScore - a.totalScore);
        const top3 = sortedClasses.slice(0, 3);
        const rest = sortedClasses.slice(3);

        // Reorder for podium effect: Rank 2 (Left), Rank 1 (Center), Rank 3 (Right)
        const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean); 

        return (
            <div className="animate-fade-in space-y-8">
                 <div className="flex items-center gap-3 mb-6">
                    <TrophyIcon className="h-8 w-8 text-yellow-500" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Xếp hạng các Lớp tích cực nhất</h3>
                    <InfoTooltip text="Bảng xếp hạng dựa trên tổng điểm tích cực (Số lượt hoàn thành Học liệu + Số lượt hoàn thành Bài kiểm tra)." />
                </div>

                {/* Top 3 Section */}
                <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-12 mb-16">
                    {podiumOrder.map((cls, index) => {
                         // Determine Rank based on position in podium array
                        let rank = 0;
                        let heightClass = '';
                        let borderColor = '';
                        let bgColor = '';
                        let textColor = '';
                        let icon = null;
                        let rankLabel = '';

                        if (cls === top3[0]) { // Rank 1
                            rank = 1;
                            heightClass = 'h-64 w-full md:w-56 order-1 md:order-2';
                            borderColor = 'border-yellow-400';
                            bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                            textColor = 'text-yellow-700 dark:text-yellow-400';
                            icon = <StarIcon className="h-10 w-10 text-yellow-500 mb-3 drop-shadow-sm" />;
                            rankLabel = 'HẠNG 1';
                        } else if (cls === top3[1]) { // Rank 2
                            rank = 2;
                            heightClass = 'h-56 w-full md:w-48 order-2 md:order-1';
                            borderColor = 'border-slate-300';
                            bgColor = 'bg-slate-50 dark:bg-slate-800';
                            textColor = 'text-slate-600 dark:text-slate-300';
                            rankLabel = 'HẠNG 2';
                        } else { // Rank 3
                            rank = 3;
                            heightClass = 'h-56 w-full md:w-48 order-3';
                            borderColor = 'border-orange-300';
                            bgColor = 'bg-orange-50 dark:bg-orange-900/20';
                            textColor = 'text-orange-700 dark:text-orange-400';
                            rankLabel = 'HẠNG 3';
                        }

                        return (
                            <div key={cls.id} className={`${heightClass} flex flex-col items-center justify-center rounded-t-xl border-t-8 ${borderColor} ${bgColor} shadow-lg relative p-6 transition-transform hover:-translate-y-2`}>
                                {icon}
                                <span className={`text-sm font-bold tracking-widest mb-2 opacity-80 ${textColor}`}>{rankLabel}</span>
                                <h4 className={`text-3xl font-bold mb-3 ${textColor}`}>{cls.name}</h4>
                                <div className={`text-4xl font-extrabold ${textColor} mb-2`}>{cls.totalScore}</div>
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-bold">Điểm tích cực</span>
                            </div>
                        );
                    })}
                </div>

                {/* List Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                     {/* Header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-3">Lớp</div>
                        <div className="col-span-3 text-center">Học liệu hoàn thành</div>
                        <div className="col-span-3 text-center">Bài kiểm tra hoàn thành</div>
                        <div className="col-span-2 text-right">Tổng điểm</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {rest.map((cls, idx) => (
                            <div key={cls.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                <div className="col-span-1 flex justify-center">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        {idx + 4}
                                    </span>
                                </div>
                                <div className="col-span-3">
                                    <span className="font-bold text-xl text-gray-800 dark:text-white">{cls.name}</span>
                                </div>
                                <div className="col-span-3 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                                            {cls.completedMaterials}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-3 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                                            {cls.completedTests}
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-2 text-right">
                                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{cls.totalScore}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
                        <button className="text-base font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                            Xem toàn bộ bảng xếp hạng
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderStudentStats = () => {
        // Sort students only by Score as requested
        const sortedStudents = [...students].filter(s => 
            selectedStudentGrade === 'all' || s.grade === selectedStudentGrade
        ).sort((a, b) => b.averageTestScore - a.averageTestScore);

        const top3 = sortedStudents.slice(0, 3);
        const others = sortedStudents.slice(3);

        const renderStudentRow = (student: StudentLMSStat, rank: number, isTop: boolean) => {
             // Specific styles for Top 3
            let rowStyle = 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700';
            let rankBadge = (
                <span className={`text-lg font-bold ${isTop ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400'}`}>{rank}</span>
            );

            if (rank === 1) {
                rowStyle = 'bg-gradient-to-r from-yellow-50/80 to-white dark:from-yellow-900/20 dark:to-gray-800 border-yellow-300 dark:border-yellow-700 shadow-md transform hover:-translate-y-0.5 z-10';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center border border-yellow-300 shadow-sm">
                        <TrophyIcon className="w-6 h-6 text-yellow-600" />
                    </div>
                );
            } else if (rank === 2) {
                rowStyle = 'bg-gradient-to-r from-slate-100 via-white to-white dark:from-slate-700/50 dark:to-gray-800 border-slate-300 dark:border-slate-600 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-300 shadow-sm font-bold text-lg">
                        2
                    </div>
                );
            } else if (rank === 3) {
                 rowStyle = 'bg-gradient-to-r from-orange-100 via-white to-white dark:from-orange-900/30 dark:to-gray-800 border-orange-300 dark:border-orange-700 shadow-sm';
                rankBadge = (
                    <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center border border-orange-300 shadow-sm font-bold text-lg">
                        3
                    </div>
                );
            } else if (isTop) {
                 rowStyle = 'bg-white dark:bg-gray-800 border-indigo-100 dark:border-gray-700 shadow-sm';
            }

            return (
                <div key={student.id} className={`
                    grid grid-cols-12 gap-4 p-5 items-center rounded-xl border-2 transition-all mb-4
                    ${rowStyle}
                `}>
                    <div className="col-span-1 flex justify-center">
                        {rankBadge}
                    </div>
                    <div className="col-span-3 pl-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xl truncate" title={student.name}>{student.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{student.className}</div>
                    </div>
                    
                    {/* Completed Materials */}
                    <div className={`col-span-3 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3 text-gray-800 dark:text-gray-200`}>
                        <div className="text-2xl font-bold leading-none mb-1 transition-colors duration-300">
                            {student.completedMaterials.toLocaleString()}
                        </div>
                        <div className="text-sm uppercase tracking-wide font-semibold transition-colors duration-300 text-gray-500">
                            Học liệu
                        </div>
                    </div>
                    
                    {/* Completed Tests */}
                    <div className={`col-span-3 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3 text-gray-800 dark:text-gray-200`}>
                        <div className="text-2xl font-bold leading-none mb-1 transition-colors duration-300">
                            {student.completedTests.toLocaleString()}
                        </div>
                        <div className="text-sm uppercase tracking-wide font-semibold transition-colors duration-300 text-gray-500">
                            Bài kiểm tra
                        </div>
                    </div>
                    
                    {/* Average Score - Highlighted as primary sorting metric */}
                    <div className={`col-span-2 text-center flex flex-col items-center justify-center transition-all duration-500 ease-out rounded-xl py-3 bg-emerald-50 dark:bg-emerald-900/30 scale-110 shadow-sm ring-1 ring-emerald-100 dark:ring-emerald-700 z-10`}>
                        <div className="text-2xl font-bold leading-none mb-1 transition-colors duration-300 text-emerald-700 dark:text-emerald-300">
                            {student.averageTestScore.toFixed(1)}
                        </div>
                        <div className="text-sm uppercase tracking-wide font-semibold transition-colors duration-300 text-emerald-600 dark:text-emerald-400">
                            Điểm TB
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div className="animate-fade-in">
                {/* Note Banner */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-8 flex items-start gap-4 shadow-sm">
                    <InformationCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-base text-blue-900 dark:text-blue-100 leading-relaxed">
                        <p className="mb-2">
                            <span className="font-bold">Lưu ý:</span> Bảng xếp hạng <span className="font-bold">chỉ được tổng hợp từ các bài kiểm tra được tạo và thực hiện trên hệ thống</span>. Các bài kiểm tra <span className="font-bold">không tạo trên hệ thống sẽ không được tính</span> vào bảng xếp hạng.
                        </p>
                        <p>
                            <span className="font-bold">Ví dụ:</span> Giáo viên có 10 bài kiểm tra, trong đó 5 bài được tạo trên hệ thống và 5 bài kiểm tra giấy; bảng xếp hạng <span className="font-bold">chỉ ghi nhận 5/10 bài</span>. Trong 10 bài đó, giáo viên <span className="font-bold">có thể tự chọn bài phù hợp</span> để nhập điểm vào cột KTĐGTX theo quy định.
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border border-slate-300 dark:border-gray-500 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div className="flex items-center">
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Thống kê Học sinh</h3>
                            <InfoTooltip text="Bảng xếp hạng học sinh dựa trên Kết quả học tập (Điểm trung bình bài kiểm tra)." />
                        </div>
                        
                        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                            <div className="flex bg-slate-100 dark:bg-gray-700 p-1.5 rounded-lg flex-wrap gap-1 sm:gap-0">
                                <button 
                                    onClick={() => setSelectedStudentGrade('all')}
                                    className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${selectedStudentGrade === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Tất cả
                                </button>
                                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(grade => (
                                    <button 
                                        key={grade}
                                        onClick={() => setSelectedStudentGrade(grade)}
                                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${selectedStudentGrade === grade ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {getGradeLabel(grade)}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleExportStudentStatsExcel}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                                title="Xuất file Excel"
                            >
                                <DownloadIcon className="w-5 h-5" />
                                <span>Xuất Excel</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-12 gap-4 px-6 pb-4 text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 mb-6">
                        <div className="col-span-1 text-center">Hạng</div>
                        <div className="col-span-3 pl-4">Học sinh</div>
                        <div className="col-span-3 text-center">
                            Học liệu số đã hoàn thành
                        </div>
                        <div className="col-span-3 text-center">
                            Bài kiểm tra hoàn thành
                        </div>
                        <div className="col-span-2 text-center text-emerald-600 dark:text-emerald-400">
                            Tổng điểm trung bình tất cả bài kiểm tra
                        </div>
                    </div>

                    <div className="mb-2">
                        {top3.map((student, index) => renderStudentRow(student, index + 1, true))}
                    </div>

                    {others.length > 0 && (
                        <div className="mt-4">
                            {showAllStudents ? (
                                <div className="animate-fade-in">
                                    <div className="border-t-2 border-dashed border-slate-300 dark:border-slate-600 pt-6 mt-6">
                                        <div className="rounded-xl overflow-y-auto custom-scrollbar pr-2" style={{ maxHeight: '600px' }}>
                                            {others.map((student, index) => renderStudentRow(student, index + 4, false))}
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-center">
                                        <button
                                            onClick={() => setShowAllStudents(false)}
                                            className="px-6 py-3 text-base font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                        >
                                            Thu gọn danh sách
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={() => setShowAllStudents(true)}
                                        className="px-10 py-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-base font-bold rounded-full transition-all shadow-sm hover:shadow-md border border-indigo-100 dark:border-indigo-800 flex items-center gap-3 mx-auto"
                                    >
                                        Xem tất cả học sinh
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Score Spectrum Section */}
                {renderScoreSpectrum()}
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-100 dark:bg-gray-900 text-slate-800 dark:text-gray-200">
             {/* Global Styles for Scrollbar - Applied to dashboard scope */}
             <style>
                {`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
                `}
            </style>

            <div className="p-6 sm:p-8 lg:p-10 w-full">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 mb-10">
                     {stats.map((stat, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition-shadow min-h-[160px]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-base font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{stat.title}</h3>
                                        <InfoTooltip text={stat.tooltip} placement={stat.tooltipPlacement} />
                                    </div>
                                    <p className="text-sm text-red-500 font-bold">{stat.description}</p>
                                </div>
                                <div className={`p-4 rounded-xl ${stat.iconColorClass}`}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-4xl font-extrabold text-gray-900 dark:text-white">{stat.value}</div>
                        </div>
                     ))}
                </div>

                {/* Tabs */}
                <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-10 justify-center overflow-x-auto pb-1">
                         {(['overview', 'class_ranking', 'subjects', 'teachers', 'students'] as Tab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    whitespace-nowrap pb-5 px-4 border-b-4 font-bold text-lg transition-colors
                                    ${activeTab === tab
                                        ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 dark:border-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}
                                `}
                            >
                                {tab === 'overview' ? 'Thống kê Lớp (Tổng quan)' : 
                                 tab === 'class_ranking' ? 'Thống kê Lớp (Chi tiết)' :
                                 tab === 'subjects' ? 'Thống kê Môn học' : 
                                 tab === 'teachers' ? 'Thống kê Giáo viên' :
                                 'Thống kê Học sinh'}
                            </button>
                        ))}
                    </nav>
                </div>
                
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'class_ranking' && renderClassRanking()}
                {activeTab === 'subjects' && renderSubjectsAnalysis()}
                {activeTab === 'teachers' && renderTeachersAnalysis()}
                {activeTab === 'students' && renderStudentStats()}
                {warningState !== null && renderWarningModal()}
            </div>
        </div>
    );
};
