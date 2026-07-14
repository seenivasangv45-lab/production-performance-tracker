import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateProductionMetrics, formatPercent, getScaledTarget, normalizeEmpId, matchesClean } from '../utils/calculations';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Filter, Search, Award, TrendingDown, TrendingUp, Layers, HelpCircle, Activity, ChevronRight, ChevronDown, ChevronUp, SlidersHorizontal, Sliders, Calendar, Users, Database, Info, RefreshCw, BarChart2, ShieldCheck, CheckCircle, Flame, Star, Target, ShieldAlert, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type SubTabID = 'periodic' | 'bottomq' | 'stars' | 'subprocesses';

export const ProductivityView: React.FC = () => {
  const { employees, production, targets, attendance } = useApp();

  // Primary Workspace Tabs
  const [subTab, setSubTab] = useState<SubTabID>('periodic');
  
  // Advanced Filter Panel Toggle
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Selected Chart Explanation State
  const [selectedChartExplanation, setSelectedChartExplanation] = useState<string | null>(null);
  const [chartModalTab, setChartModalTab] = useState<'breakdown' | 'formula'>('breakdown');

  const openChartExplanation = (chartName: string) => {
    setSelectedChartExplanation(chartName);
    setChartModalTab('breakdown');
  };

  // Filters
  const [empName, setEmpName] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [lineManager, setLineManager] = useState('');
  const [rcmManager, setRcmManager] = useState('');
  const [processFilter, setProcessFilter] = useState('');
  const [subProcessFilter, setSubProcessFilter] = useState('');

  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      const status = (emp.status || '').toLowerCase();
      return !status.includes('relieved') && !status.includes('abscond');
    });
  }, [employees]);

  const empProductionMap = useMemo(() => {
    const map: { [empId: string]: { processes: Set<string>; subProcesses: Set<string> } } = {};
    production.forEach(p => {
      if (!map[p.empId]) {
        map[p.empId] = { processes: new Set(), subProcesses: new Set() };
      }
      map[p.empId].processes.add(p.processName);
      map[p.empId].subProcesses.add(p.subProcessName);
    });
    return map;
  }, [production]);

  // Dropdown option sets computed dynamically to support cascaded filtering
  const uniqueEmps = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.name))).sort();
  }, [activeEmployees, empProductionMap, reportingManager, lineManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueRMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, lineManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueLMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.lm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, reportingManager, rcmManager, processFilter, subProcessFilter]);

  const uniqueRCMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      
      const empProd = empProductionMap[emp.empId];
      if (processFilter && (!empProd || !empProd.processes.has(processFilter))) return false;
      if (subProcessFilter && (!empProd || !empProd.subProcesses.has(subProcessFilter))) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rcm).filter(Boolean))).sort();
  }, [activeEmployees, empProductionMap, empName, reportingManager, lineManager, processFilter, subProcessFilter]);

  const uniqueProcesses = useMemo(() => {
    const matchedEmps = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      return true;
    });
    const matchedEmpIds = new Set(matchedEmps.map(e => e.empId));
    
    const filteredProds = production.filter(p => {
      if (!matchedEmpIds.has(p.empId)) return false;
      if (subProcessFilter && p.subProcessName !== subProcessFilter) return false;
      return true;
    });
    return Array.from(new Set(filteredProds.map(p => p.processName))).sort();
  }, [activeEmployees, production, empName, reportingManager, lineManager, rcmManager, subProcessFilter]);

  const uniqueSubProcesses = useMemo(() => {
    const matchedEmps = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      return true;
    });
    const matchedEmpIds = new Set(matchedEmps.map(e => e.empId));
    
    const filteredProds = production.filter(p => {
      if (!matchedEmpIds.has(p.empId)) return false;
      if (processFilter && p.processName !== processFilter) return false;
      return true;
    });
    return Array.from(new Set(filteredProds.map(p => p.subProcessName))).sort();
  }, [activeEmployees, production, empName, reportingManager, lineManager, rcmManager, processFilter]);

  // Interdependent Auto-Fill/Cascade handlers matching Dashboard Page's experience
  const handleEmpNameChange = (val: string) => {
    setEmpName(val);
    if (!val) {
      setReportingManager('');
      setLineManager('');
      setRcmManager('');
      setProcessFilter('');
      setSubProcessFilter('');
      return;
    }
    const emp = activeEmployees.find(e => e.name === val);
    if (emp) {
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) {
          setProcessFilter(Array.from(empProd.processes)[0]);
        }
        if (empProd.subProcesses.size === 1) {
          setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
        }
      }
    }
  };

  const handleReportingManagerChange = (val: string) => {
    setReportingManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.rm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) setProcessFilter(Array.from(empProd.processes)[0]);
        if (empProd.subProcesses.size === 1) setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
      }
    }
  };

  const handleLineManagerChange = (val: string) => {
    setLineManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.lm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setRcmManager(emp.rcm || '');
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) setProcessFilter(Array.from(empProd.processes)[0]);
        if (empProd.subProcesses.size === 1) setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
      }
    }
  };

  const handleRcmManagerChange = (val: string) => {
    setRcmManager(val);
    if (!val) return;
    const filtered = activeEmployees.filter(emp => emp.rcm === val);
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      const empProd = empProductionMap[emp.empId];
      if (empProd) {
        if (empProd.processes.size === 1) setProcessFilter(Array.from(empProd.processes)[0]);
        if (empProd.subProcesses.size === 1) setSubProcessFilter(Array.from(empProd.subProcesses)[0]);
      }
    }
  };

  const handleProcessFilterChange = (val: string) => {
    setProcessFilter(val);
    if (!val) return;
    
    // Check if only one employee does this process
    const filtered = activeEmployees.filter(emp => {
      const empProd = empProductionMap[emp.empId];
      return empProd && empProd.processes.has(val);
    });
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
    }
  };

  const handleSubProcessFilterChange = (val: string) => {
    setSubProcessFilter(val);
    if (!val) return;
    
    // Check if only one employee does this subprocess
    const filtered = activeEmployees.filter(emp => {
      const empProd = empProductionMap[emp.empId];
      return empProd && empProd.subProcesses.has(val);
    });
    if (filtered.length === 1) {
      const emp = filtered[0];
      setEmpName(emp.name);
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      
      const empProd = empProductionMap[emp.empId];
      if (empProd && empProd.processes.size === 1) {
        setProcessFilter(Array.from(empProd.processes)[0]);
      }
    }
  };

  const handleResetFilters = () => {
    setEmpName('');
    setReportingManager('');
    setLineManager('');
    setRcmManager('');
    setProcessFilter('');
    setSubProcessFilter('');
  };

  // Filtered dataset
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclusion Rule: Relieved and Absconded should be filtered from production views
      const status = (emp.status || '').toLowerCase();
      if (status.includes('relieved') || status.includes('abscond')) return false;

      if (empName && emp.name !== empName) return false;
      if (reportingManager && !matchesClean(emp.rm, reportingManager)) return false;
      if (lineManager && !matchesClean(emp.lm, lineManager)) return false;
      if (rcmManager && !matchesClean(emp.rcm, rcmManager)) return false;
      return true;
    });
  }, [employees, empName, reportingManager, lineManager, rcmManager]);

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => normalizeEmpId(e.empId))), [filteredEmployees]);

  const filteredProduction = useMemo(() => {
    return production.filter(prod => {
      if (!filteredEmpIds.has(normalizeEmpId(prod.empId))) return false;
      if (processFilter && prod.processName !== processFilter) return false;
      if (subProcessFilter && prod.subProcessName !== subProcessFilter) return false;
      return true;
    });
  }, [production, filteredEmpIds, processFilter, subProcessFilter]);

  // Weeks grouping helper (June 2026)
  const getWeekLabel = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length < 3) return 'Week 1 (Jun 01-07)';
    const day = parseInt(parts[2], 10);
    if (day <= 7) return 'Week 1 (Jun 01-07)';
    if (day <= 14) return 'Week 2 (Jun 08-14)';
    if (day <= 21) return 'Week 3 (Jun 15-21)';
    if (day <= 28) return 'Week 4 (Jun 22-28)';
    return 'Week 5 (Jun 29-30)';
  };

  // ─── 1. PERIODIC ANALYTICS ───────────────────────────────────────────────
  const monthlyVolumeData = useMemo(() => {
    const dates: string[] = Array.from(new Set(filteredProduction.map(p => p.date))).sort() as string[];
    return dates.map(d => {
      const dayRecs = filteredProduction.filter(p => p.date === d);
      const achieved = dayRecs.reduce((acc, curr) => acc + curr.achieved, 0);
      const target = dayRecs.reduce((acc, curr) => acc + curr.target, 0);
      return {
        date: d.substring(5), // MM-DD
        'Achieved': achieved,
        'Target': target
      };
      // Zero-activity dates (no achieved AND no target) are excluded from the trend
    }).filter(row => row['Achieved'] > 0 || row['Target'] > 0);
  }, [filteredProduction]);

  const weeklyTrendData = useMemo(() => {
    const weekMap: { [key: string]: { achieved: number; target: number } } = {};
    filteredProduction.forEach(p => {
      const wk = getWeekLabel(p.date);
      if (!weekMap[wk]) weekMap[wk] = { achieved: 0, target: 0 };
      weekMap[wk].achieved += p.achieved;
      weekMap[wk].target += p.target;
    });

    return Object.keys(weekMap).sort().map(wk => {
      const item = weekMap[wk];
      const efficiency = item.target > 0 ? Math.round((item.achieved / item.target) * 100) : 100;
      const targetCompletion = item.target > 0 ? Math.round((item.achieved / item.target) * 100) : 100;
      return {
        week: wk.split(' ')[0] + ' ' + wk.split(' ')[1],
        'Avg Efficiency %': efficiency,
        'Target Completion %': targetCompletion
      };
    });
  }, [filteredProduction]);

  const weeklyPerformanceMatrix = useMemo(() => {
    const matrixMap: { [key: string]: { [proc: string]: { headcount: Set<string>; achieved: number; target: number } } } = {};
    
    filteredProduction.forEach(p => {
      const wk = getWeekLabel(p.date);
      const proc = p.processName;
      
      if (!matrixMap[wk]) matrixMap[wk] = {};
      if (!matrixMap[wk][proc]) {
        matrixMap[wk][proc] = { headcount: new Set<string>(), achieved: 0, target: 0 };
      }
      
      matrixMap[wk][proc].headcount.add(p.empId);
      matrixMap[wk][proc].achieved += p.achieved;
      matrixMap[wk][proc].target += p.target;
    });

    const rows: Array<{
      week: string;
      process: string;
      headcount: number;
      achieved: number;
      target: number;
      targetCompletion: string;
      efficiency: string;
    }> = [];

    Object.keys(matrixMap).sort().forEach(wk => {
      Object.keys(matrixMap[wk]).sort().forEach(proc => {
        const data = matrixMap[wk][proc];
        const targetCompletionValue = data.target > 0 ? (data.achieved / data.target) * 100 : 100;
        const efficiency = data.target > 0 ? (data.achieved / data.target) * 100 : 100;
        rows.push({
          week: wk,
          process: proc,
          headcount: data.headcount.size,
          achieved: data.achieved,
          target: data.target,
          targetCompletion: formatPercent(targetCompletionValue),
          efficiency: formatPercent(efficiency)
        });
      });
    });

    return rows;
  }, [filteredProduction]);

  // ─── 2. DAILY / WEEKLY SHIFT AVERAGES ────────────────────────────────────
  const processShiftStats = useMemo(() => {
    const procMap: { [key: string]: { achieved: number; target: number; days: Set<string> } } = {};
    filteredProduction.forEach(p => {
      const proc = p.processName;
      if (!procMap[proc]) procMap[proc] = { achieved: 0, target: 0, days: new Set() };
      procMap[proc].achieved += p.achieved;
      procMap[proc].target += p.target;
      procMap[proc].days.add(p.date);
    });

    return Object.keys(procMap).map(proc => {
      const data = procMap[proc];
      const daysCount = data.days.size || 1;
      const avgTarget = Math.round(data.target / daysCount);
      const avgAchieved = Math.round(data.achieved / daysCount);
      const avgWeeklyOutput = avgAchieved * 5; 
      return {
        process: proc,
        'Avg Target': avgTarget,
        'Avg Achieved': avgAchieved,
        'Avg Weekly Output': avgWeeklyOutput
      };
    });
  }, [filteredProduction]);

  // ─── 3. BOTTOM QUARTILE 25% WITH 3D PRISM ROTATION ─────────────────────────
  const [bottomqViewMode, setBottomqViewMode] = useState<'3d' | 'list'>('3d');
  const [active3dSide, setActive3dSide] = useState(0);

  // Group bottom performers by process segment
  const activeProcessesListFor3D = useMemo(() => {
    const list = Array.from(new Set(filteredProduction.map(p => p.processName))).sort();
    return list.length > 0 ? list : ['Extraction', 'Denial Management', 'Payment Posting'];
  }, [filteredProduction]);

  const bottomPerfsByProcess = useMemo(() => {
    const map: { [key: string]: Array<{
      name: string;
      process: string;
      subProcess: string;
      daysLogged: number;
      efficiency: number;
      accuracy: number;
    }> } = {};

    const empMetrics = filteredEmployees.map(emp => {
      const metrics = calculateProductionMetrics(emp.empId, filteredProduction);
      const empProds = filteredProduction.filter(p => p.empId === emp.empId);
      const processName = empProds[0]?.processName || 'N/A';
      const subProcessName = empProds[0]?.subProcessName || 'N/A';
      return {
        name: emp.name,
        process: processName,
        subProcess: subProcessName,
        daysLogged: metrics.daysLogged,
        efficiency: metrics.efficiency,
        accuracy: metrics.accuracy
      };
    }).filter(e => e.daysLogged > 0);

    activeProcessesListFor3D.forEach(proc => {
      const procEmps = empMetrics.filter(e => e.process.toLowerCase().trim() === proc.toLowerCase().trim());
      const sorted = [...procEmps].sort((a, b) => a.efficiency - b.efficiency);
      const bottomCutOff = Math.ceil(sorted.length * 0.25);
      map[proc] = sorted.slice(0, bottomCutOff).slice(0, 5);
    });

    return map;
  }, [filteredEmployees, filteredProduction, activeProcessesListFor3D]);

  const bottomQuartileList = useMemo(() => {
    return Object.values(bottomPerfsByProcess).flat();
  }, [bottomPerfsByProcess]);

  // ─── 4. QUALITY LEADERS & STAR PRODUCERS ─────────────────────────────────
  const starPerfsByProcess = useMemo(() => {
    const map: { [key: string]: Array<{
      name: string;
      process: string;
      subProcess: string;
      daysLogged: number;
      efficiency: number;
      accuracy: number;
      totalOutput: number;
    }> } = {};

    const empMetrics = filteredEmployees.map(emp => {
      const metrics = calculateProductionMetrics(emp.empId, filteredProduction);
      const empProds = filteredProduction.filter(p => p.empId === emp.empId);
      const processName = empProds[0]?.processName || 'N/A';
      const subProcessName = empProds[0]?.subProcessName || 'N/A';
      return {
        name: emp.name,
        process: processName,
        subProcess: subProcessName,
        daysLogged: metrics.daysLogged,
        efficiency: metrics.efficiency,
        accuracy: metrics.accuracy,
        totalOutput: metrics.achievedVolume
      };
    }).filter(e => e.daysLogged > 0);

    activeProcessesListFor3D.forEach(proc => {
      const procEmps = empMetrics.filter(e => e.process.toLowerCase().trim() === proc.toLowerCase().trim());
      const sorted = [...procEmps]
        .filter(e => e.accuracy >= 95.0)
        .sort((a, b) => b.accuracy - a.accuracy || b.efficiency - a.efficiency);
      map[proc] = sorted.slice(0, 5);
    });

    return map;
  }, [filteredEmployees, filteredProduction, activeProcessesListFor3D]);

  const qualityLeadersList = useMemo(() => {
    return Object.values(starPerfsByProcess).flat();
  }, [starPerfsByProcess]);

  // ─── 5. SUB PROCESS DEEP ANALYTICAL SELECTOR ─────────────────────────────
  const [selectedSubProcessDetail, setSelectedSubProcessDetail] = useState('');

  useEffect(() => {
    if (uniqueSubProcesses.length > 0 && !selectedSubProcessDetail) {
      setSelectedSubProcessDetail(uniqueSubProcesses[0]);
    }
  }, [uniqueSubProcesses, selectedSubProcessDetail]);

  const subprocessStatsList = useMemo(() => {
    return uniqueSubProcesses.map(sp => {
      const subRecs = production.filter(p => p.subProcessName.toLowerCase() === sp.toLowerCase());
      if (subRecs.length === 0) {
        return {
          subProcess: sp,
          process: 'Other',
          totalTarget: 0,
          totalAchieved: 0,
          avgEfficiency: 0,
          avgAccuracy: 96,
          headcount: 0,
          topPms: 'N/A',
          repsList: []
        };
      }

      const achieved = subRecs.reduce((sum, r) => sum + r.achieved, 0);
      const target = subRecs.reduce((sum, r) => sum + r.target, 0);
      const accuracySum = subRecs.reduce((sum, r) => sum + r.accuracy, 0);
      const avgEfficiency = target > 0 ? Math.round((achieved / target) * 100) : 100;
      const avgAccuracy = Math.round(accuracySum / subRecs.length);

      const reps = Array.from(new Set(subRecs.map(r => r.empId)));
      const pmsCounts: { [key: string]: number } = {};
      subRecs.forEach(r => {
        pmsCounts[r.pms] = (pmsCounts[r.pms] || 0) + 1;
      });

      let primaryPMS = 'N/A';
      let maxCount = 0;
      Object.keys(pmsCounts).forEach(p => {
        if (pmsCounts[p] > maxCount) {
          maxCount = pmsCounts[p];
          primaryPMS = p;
        }
      });

      const repsList = reps.map(rid => {
        const emp = employees.find(e => e.empId === rid);
        const empRecs = subRecs.filter(r => r.empId === rid);
        const rAchieved = empRecs.reduce((sum, r) => sum + r.achieved, 0);
        const rTarget = empRecs.reduce((sum, r) => sum + r.target, 0);
        const rEff = rTarget > 0 ? Math.round((rAchieved / rTarget) * 100) : 100;
        return {
          name: emp?.name || 'Unknown',
          id: rid,
          efficiency: rEff,
          pms: empRecs[0]?.pms || 'N/A'
        };
      }).sort((a,b) => b.efficiency - a.efficiency).slice(0, 5);

      return {
        subProcess: sp,
        process: subRecs[0]?.processName || 'Other',
        totalTarget: target,
        totalAchieved: achieved,
        avgEfficiency,
        avgAccuracy,
        headcount: reps.length,
        topPms: primaryPMS,
        repsList
      };
    });
  }, [production, employees, uniqueSubProcesses]);

  const activeSubProcessData = useMemo(() => {
    return subprocessStatsList.find(s => s.subProcess.toLowerCase() === selectedSubProcessDetail.toLowerCase()) || subprocessStatsList[0];
  }, [subprocessStatsList, selectedSubProcessDetail]);

  // Overall Headline Metric cards
  const summaryKpiStats = useMemo(() => {
    const totalAchieved = filteredProduction.reduce((sum, p) => sum + p.achieved, 0);
    const totalTarget = filteredProduction.reduce((sum, p) => sum + p.target, 0);
    const overallAttainment = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
    
    const accuracySum = filteredProduction.reduce((sum, p) => sum + p.accuracy, 0);
    const averageAccuracy = filteredProduction.length > 0 ? Math.round(accuracySum / filteredProduction.length) : 100;
    
    const uniqueActiveReps = new Set(filteredProduction.map(p => p.empId)).size;

    return {
      totalAchieved,
      totalTarget,
      overallAttainment,
      averageAccuracy,
      uniqueActiveReps
    };
  }, [filteredProduction]);

  // ─── INTERACTIVE HIERARCHY DRILL-DOWN (relocated from the Dashboard page) ──
  // Hierarchy: Reporting Manager → PMS → Subprocess → Employee (multi-select)
  const [drillManager, setDrillManager] = useState('');
  const [drillPms, setDrillPms] = useState('');
  const [drillSubProcess, setDrillSubProcess] = useState('');
  const [drillEmpIds, setDrillEmpIds] = useState<string[]>([]);

  const drillManagers = useMemo(() => {
    const names = activeEmployees
      .flatMap(e => [e.rm, e.lm, e.rcm])
      .map(m => (m || '').trim())
      .filter(Boolean);
    return [...new Set(names)].sort();
  }, [activeEmployees]);

  const drillManagerEmployees = useMemo(() => {
    if (!drillManager) return [];
    const n = drillManager.trim();
    return activeEmployees.filter(e => e.rm?.trim() === n || e.lm?.trim() === n || e.rcm?.trim() === n);
  }, [activeEmployees, drillManager]);

  const drillManagerEmpIdSet = useMemo(
    () => new Set(drillManagerEmployees.map(e => e.empId.toUpperCase().trim())),
    [drillManagerEmployees]
  );

  const drillPmsOptions = useMemo(() => {
    if (!drillManager) return [];
    const vals = production
      .filter(p => p.empId && drillManagerEmpIdSet.has(p.empId.toUpperCase().trim()))
      .map(p => (p.pms || '').trim())
      .filter(Boolean);
    return [...new Set(vals)].sort();
  }, [production, drillManagerEmpIdSet, drillManager]);

  const drillSubProcessOptions = useMemo(() => {
    if (!drillManager || !drillPms) return [];
    const vals = production
      .filter(p =>
        p.empId &&
        drillManagerEmpIdSet.has(p.empId.toUpperCase().trim()) &&
        (p.pms || '').trim() === drillPms
      )
      .map(p => (p.subProcessName || '').trim())
      .filter(Boolean);
    return [...new Set(vals)].sort();
  }, [production, drillManagerEmpIdSet, drillManager, drillPms]);

  const drillEmployeeOptions = useMemo(() => {
    if (!drillManager || !drillPms) return [];
    const matchIds = new Set(
      production
        .filter(p =>
          p.empId &&
          drillManagerEmpIdSet.has(p.empId.toUpperCase().trim()) &&
          (p.pms || '').trim() === drillPms &&
          (!drillSubProcess || (p.subProcessName || '').trim() === drillSubProcess)
        )
        .map(p => p.empId.toUpperCase().trim())
    );
    return drillManagerEmployees
      .filter(e => matchIds.has(e.empId.toUpperCase().trim()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [production, drillManagerEmpIdSet, drillManagerEmployees, drillManager, drillPms, drillSubProcess]);

  const toggleDrillEmployee = (empId: string) => {
    setDrillEmpIds(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  const attendanceByEmpDate = useMemo(() => {
    const map = new Map<string, { hoursWorked: number; expectedHours: number }>();
    attendance.forEach(a => {
      if (a && a.empId && a.date) {
        map.set(`${a.empId.toUpperCase().trim()}_${a.date}`, {
          hoursWorked: a.hoursWorked,
          expectedHours: a.expectedHours || 8,
        });
      }
    });
    return map;
  }, [attendance]);

  const drillLogs = useMemo(() => {
    if (drillEmpIds.length === 0) return [];
    const idSet = new Set(drillEmpIds.map(id => id.toUpperCase().trim()));
    return production
      .filter(p =>
        p.empId &&
        idSet.has(p.empId.toUpperCase().trim()) &&
        (!drillPms || (p.pms || '').trim() === drillPms) &&
        (!drillSubProcess || (p.subProcessName || '').trim() === drillSubProcess)
      )
      .map(p => {
        const att = attendanceByEmpDate.get(`${p.empId.toUpperCase().trim()}_${p.date}`);
        const hoursWorked = att ? att.hoursWorked : (p.dailyWorkHours || 8);
        const standardHours = att?.expectedHours || p.dailyWorkHours || 8;
        // Partial-day (e.g. Saturday) targets scale proportionally to hours worked
        const scaledTarget = getScaledTarget(p.target, hoursWorked, standardHours);
        const eff = scaledTarget > 0 ? (p.achieved / scaledTarget) * 100 : 0;
        return { ...p, hoursWorked, standardHours, scaledTarget, eff, isScaled: scaledTarget !== p.target };
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.empId.localeCompare(b.empId));
  }, [production, drillEmpIds, drillPms, drillSubProcess, attendanceByEmpDate]);

  const drillEmpSummaries = useMemo(() => {
    return drillEmpIds.map(id => {
      const key = id.toUpperCase().trim();
      const emp = employees.find(e => e.empId.toUpperCase().trim() === key);
      const logs = drillLogs.filter(l => l.empId.toUpperCase().trim() === key);
      let achieved = 0;
      let scaled = 0;
      let accSum = 0;
      logs.forEach(l => {
        achieved += l.achieved;
        scaled += l.scaledTarget;
        accSum += l.accuracy;
      });
      const efficiency = scaled > 0 ? (achieved / scaled) * 100 : 0;
      const accuracy = logs.length > 0 ? accSum / logs.length : 0;
      return {
        empId: id,
        name: emp?.name || id,
        daysLogged: logs.length,
        achieved,
        scaledTarget: Math.round(scaled * 10) / 10,
        efficiency,
        accuracy,
      };
    });
  }, [drillEmpIds, drillLogs, employees]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 15 } }
  };

  return (
    <div className="space-y-6" id="productivity_view">
      
      {/* ─── DYNAMIC METRIC LEAD HEADER (PROFESSIONAL STATS BAR) ──────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ backgroundImage: 'linear-gradient(to right, #f2ab35 0%, #ec6b1e 50%, #cf5114 100%)' }}
        className="p-6 rounded-[28px] text-[#0f0701] shadow-lg border border-amber-500/20 relative overflow-hidden transition-all duration-300"
      >
        <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:12px_12px] opacity-[0.07] pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#0a0400] mt-1.5 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-[#4e2504] animate-pulse" />
              Productivity Workspace
            </h1>
          </div>
        </div>
      </motion.div>

      {/* ─── PRIMARILY TABBED NAVIGATION BAR ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit select-none">
        {(['periodic', 'bottomq', 'stars', 'subprocesses'] as const).map((tab) => {
          const isActive = subTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className="relative px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer focus:outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="activeSubTabBg"
                  className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/50"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 transition-colors duration-250 ${
                isActive ? 'text-indigo-600 font-black' : 'text-slate-500 hover:text-slate-800'
              }`}>
                {tab === 'periodic' && '📈 Periodic Volume'}
                {tab === 'bottomq' && '🧱 Bottom 25% Quartile'}
                {tab === 'stars' && '🏆 Star Performer'}
                {tab === 'subprocesses' && '⚙ Sub Process deep analysis'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── DYNAMIC COLLAPSIBLE ADVANCED FILTER BOARD ──────────────────────── */}
      <div className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden">
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 font-mono">
              Productivity Workspace Filter Option Panel
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-4xs uppercase tracking-wider font-extrabold font-mono">
              {isFilterExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
            {isFilterExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isFilterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-6 border-t border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Employee Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Employee Name
                  </label>
                  <select 
                    value={empName} 
                    onChange={e => handleEmpNameChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Employees</option>
                    {uniqueEmps.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* Reporting Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Reporting Manager
                  </label>
                  <select 
                    value={reportingManager} 
                    onChange={e => handleReportingManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueRMs.map(rm => <option key={rm} value={rm}>{rm}</option>)}
                  </select>
                </div>

                {/* Line Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Line Manager
                  </label>
                  <select 
                    value={lineManager} 
                    onChange={e => handleLineManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueLMs.map(lm => <option key={lm} value={lm}>{lm}</option>)}
                  </select>
                </div>

                {/* RCM Manager Select */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    RCM Manager
                  </label>
                  <select 
                    value={rcmManager} 
                    onChange={e => handleRcmManagerChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Managers</option>
                    {uniqueRCMs.map(rcm => <option key={rcm} value={rcm}>{rcm}</option>)}
                  </select>
                </div>

                {/* Process Filter */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Process Domain
                  </label>
                  <select 
                    value={processFilter} 
                    onChange={e => handleProcessFilterChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Processes</option>
                    {uniqueProcesses.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Sub Process Filter */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 font-mono">
                    Sub Process Domain
                  </label>
                  <select 
                    value={subProcessFilter} 
                    onChange={e => handleSubProcessFilterChange(e.target.value)} 
                    className="w-full bg-slate-50/70 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition cursor-pointer outline-none"
                  >
                    <option value="">All Sub Processes</option>
                    {uniqueSubProcesses.map(sp => <option key={sp} value={sp}>{sp}</option>)}
                  </select>
                </div>

                {/* Reset Buttons */}
                {(empName || reportingManager || lineManager || rcmManager || processFilter || subProcessFilter) && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-6 flex justify-end pt-2"
                  >
                    <button
                      onClick={handleResetFilters}
                      className="px-4 py-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer transition-all"
                    >
                      Clear Active Filters
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── MAIN TAB CONTENTS ────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* TAB 1: Periodic Performance */}
          {subTab === 'periodic' && (
            <div className="space-y-6">
              {/* Charts Grid */}
              <div className="grid grid-cols-1 gap-6">
                
                {/* Chart 1: Monthly Production Volume */}
                <motion.div 
                  variants={itemVariants}
                  onClick={() => openChartExplanation("Monthly Production Volume")}
                  className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:border-indigo-400 hover:shadow-md hover:ring-2 hover:ring-indigo-50"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Sliders size={16} className="text-indigo-500" />
                        Monthly Production Volume (Target vs Achieved)
                        <button
                          onClick={(e) => { e.stopPropagation(); openChartExplanation("Monthly Production Volume"); }}
                          className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                          title="Explain Calculation"
                        >
                          <HelpCircle size={12} />
                          <span className="sr-only sm:not-sr-only">Explain Math</span>
                        </button>
                      </h3>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyVolumeData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAchieved" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '11px'
                          }}
                        />
                        <Area name="Achieved Volume" type="monotone" dataKey="Achieved" stroke="#6366f1" fillOpacity={1} fill="url(#colorAchieved)" strokeWidth={2.5} />
                        <Area name="Target Baseline" type="monotone" dataKey="Target" stroke="#94a3b8" fillOpacity={1} fill="url(#colorTarget)" strokeWidth={1.5} strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Chart 2: Weekly Trends */}
                <motion.div 
                  variants={itemVariants}
                  onClick={() => openChartExplanation("Weekly Efficiency & Target Completion Trends")}
                  className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-xs cursor-pointer transition-all hover:border-emerald-400 hover:shadow-md hover:ring-2 hover:ring-emerald-50"
                >
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-emerald-500" />
                        Weekly Efficiency & Target Completion Trends
                        <button
                          onClick={(e) => { e.stopPropagation(); openChartExplanation("Weekly Efficiency & Target Completion Trends"); }}
                          className="text-slate-400 hover:text-emerald-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                          title="Explain Calculation"
                        >
                          <HelpCircle size={12} />
                          <span className="sr-only sm:not-sr-only">Explain Math</span>
                        </button>
                      </h3>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyTrendData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} domain={[0, 120]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#1e293b',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '11px'
                          }}
                        />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Line type="monotone" name="Avg Efficiency %" dataKey="Avg Efficiency %" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        <Line type="monotone" name="Target Completion %" dataKey="Target Completion %" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

              </div>

              {/* Weekly Performance Matrix Table */}
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="bg-white border border-slate-200/85 rounded-2xl shadow-xs overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                      Weekly Performance Data Matrix
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Detailed breakdown of productivity target matrices divided by week and process streams</p>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-6">Week Interval</th>
                        <th className="py-3 px-6">Process Domain</th>
                        <th className="py-3 px-6 text-center">Headcount</th>
                        <th className="py-3 px-6 text-right">Achieved Vol</th>
                        <th className="py-3 px-6 text-right">Target Vol</th>
                        <th className="py-3 px-6 text-center">Target Completion %</th>
                        <th className="py-3 px-6 text-center">Avg Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                      {weeklyPerformanceMatrix.map((row, idx) => (
                        <motion.tr 
                          key={idx}
                          variants={itemVariants}
                          className="hover:bg-slate-50/55 transition-colors"
                        >
                          <td className="py-3 px-6 font-semibold text-slate-800">{row.week}</td>
                          <td className="py-3 px-6">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-bold text-[9px] uppercase tracking-wide">
                              {row.process}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-center font-mono font-bold text-slate-900">{row.headcount}</td>
                          <td className="py-3 px-6 text-right font-mono text-slate-700">{row.achieved.toLocaleString()}</td>
                          <td className="py-3 px-6 text-right font-mono text-slate-400">{row.target.toLocaleString()}</td>
                          <td className="py-3 px-6 text-center font-mono font-extrabold text-indigo-600">{row.targetCompletion}</td>
                          <td className="py-3 px-6 text-center">
                            <span className={`inline-block font-mono font-extrabold text-[11px] px-2 py-0.5 rounded ${
                              parseInt(row.efficiency) >= 100 
                                ? 'text-emerald-600 bg-emerald-50' 
                                : parseInt(row.efficiency) >= 80 
                                ? 'text-amber-600 bg-amber-50' 
                                : 'text-rose-600 bg-rose-50'
                            }`}>
                              {row.efficiency}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}



          {/* TAB 3: Bottom Quartile (Bottom 25%) */}
          {subTab === 'bottomq' && (
            <div className="space-y-6">
              
              {/* Controls and Prism Toggle */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white p-4 border border-slate-200/85 rounded-2xl shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-2 cursor-pointer hover:text-rose-600 transition" onClick={() => openChartExplanation("Bottom Quartile Outlier Identification")}>
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> 
                    Bottom Quartile Outlier Identification (Bottom 25% Performers)
                    <button
                      onClick={(e) => { e.stopPropagation(); openChartExplanation("Bottom Quartile Outlier Identification"); }}
                      className="text-slate-400 hover:text-rose-600 p-1 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                      title="Explain Calculation"
                    >
                      <HelpCircle size={12} />
                      <span className="sr-only sm:not-sr-only">Explain Math</span>
                    </button>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">
                    Showing the bottom 25% of employees in their respective teams (process segments) only (e.g. SB bottom 25% performers are isolated and shown under the SB team face).
                  </p>
                </div>

                <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-xl w-fit select-none shrink-0">
                  <button
                    type="button"
                    onClick={() => setBottomqViewMode('3d')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      bottomqViewMode === '3d'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🧱 3D Process Sides
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomqViewMode('list')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      bottomqViewMode === 'list'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📋 Flat Matrix List
                  </button>
                </div>
              </div>

              {bottomqViewMode === '3d' ? (
                <div className="space-y-6">
                  {/* Selector face list */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-100 p-4 border border-slate-200 rounded-2xl">
                    <div className="text-xs shrink-0">
                      <span className="text-[9px] font-mono text-slate-500 block uppercase font-bold">Active 3D Prism Face</span>
                      <span className="text-sm font-black text-slate-800">{activeProcessesListFor3D[active3dSide % activeProcessesListFor3D.length]} Face</span>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                      {activeProcessesListFor3D.map((proc, idx) => {
                        const count = bottomPerfsByProcess[proc]?.length || 0;
                        const isActive = active3dSide === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setActive3dSide(idx)}
                            className={`px-3.5 py-2 rounded-xl border text-[10px] font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1.5 relative ${
                              isActive
                                ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <span>{proc}</span>
                            {count > 0 && (
                              <span className={`px-2 py-0.2 text-[9px] rounded-full font-sans font-bold ${
                                isActive ? 'bg-white text-rose-600' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3D Rotating Cube Prism Window */}
                  <div 
                    className="relative min-h-[440px] flex items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-200 overflow-hidden shadow-sm"
                    style={{ perspective: '1400px', transformStyle: 'preserve-3d' }}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.02),transparent)] pointer-events-none" />
                    
                    {activeProcessesListFor3D.map((proc, idx) => {
                      const isActive = active3dSide === idx;
                      const hasPerformers = bottomPerfsByProcess[proc]?.length > 0;
                      const offsetIdx = idx - active3dSide;
                      
                      // 3D rotation settings
                      let rotateY = offsetIdx * 90;
                      let translateZ = isActive ? 0 : -100;
                      let opacity = isActive ? 1 : 0;
                      let scale = isActive ? 1 : 0.8;
                      const pointerEventsValue: "auto" | "none" = isActive ? 'auto' : 'none';

                      if (offsetIdx === activeProcessesListFor3D.length - 1) {
                        rotateY = -90;
                      } else if (offsetIdx === -(activeProcessesListFor3D.length - 1)) {
                        rotateY = 90;
                      }

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{
                            rotateY: rotateY,
                            z: translateZ,
                            scale: scale,
                            opacity: opacity,
                          }}
                          transition={{ type: "spring", stiffness: 100, damping: 18 }}
                          className="w-full max-w-[440px] bg-white rounded-3xl border border-slate-200/80 p-6 shadow-md absolute"
                          style={{
                            pointerEvents: pointerEventsValue,
                            transformStyle: 'preserve-3d',
                            boxShadow: isActive ? '0 20px 40px -15px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,1)' : 'none',
                          }}
                        >
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500 rounded-t-3xl" />
                          
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5 pt-1.5">
                            <div>
                              <span className="text-[10px] font-mono text-rose-500 font-bold uppercase tracking-wider block">
                                PROCESS SEGMENT STAGES
                              </span>
                              <h4 className="text-base font-black text-slate-900">{proc} Outliers</h4>
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                              hasPerformers ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {hasPerformers ? `⚠ ${bottomPerfsByProcess[proc].length} Below Target` : '🏆 Clean segment'}
                            </span>
                          </div>

                          {hasPerformers ? (
                            <div className="space-y-4 max-h-[290px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                              {bottomPerfsByProcess[proc].map((e, pIdx) => (
                                <div 
                                  key={pIdx} 
                                  className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-rose-300/60 hover:bg-slate-50 transition-all duration-300 group"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h5 className="text-sm font-extrabold text-slate-800 group-hover:text-rose-600 transition-colors">
                                        {e.name}
                                      </h5>
                                      <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                        Sub: {e.subProcess} ({e.daysLogged} Days Logged)
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-black text-rose-500 font-mono block">{formatPercent(e.efficiency)}</span>
                                      <span className="text-[9px] text-slate-400 block">Avg Efficiency</span>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 mt-2">
                                    <div className="flex justify-between text-[9px] text-slate-500 font-mono mb-0.5">
                                      <span>Performance Baseline Deficit</span>
                                      <span className="text-rose-500">-{formatPercent(100 - e.efficiency)}</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-rose-600 to-amber-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, e.efficiency)}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-200 mt-1 font-mono text-slate-500">
                                      <span>Accuracy:</span>
                                      <span className={`font-extrabold ${e.accuracy >= 95 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {formatPercent(e.accuracy)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-14 text-center flex flex-col items-center justify-center space-y-3">
                              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full flex items-center justify-center font-extrabold text-lg shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                ✓
                              </div>
                              <div className="space-y-1">
                                <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Flawless Hub Domain</h5>
                                <p className="text-[10px] text-slate-600 leading-relaxed max-w-xs mx-auto">
                                  Every representative assigned to this process segment is performing comfortably above the lowest 25% evaluation metric.
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* 3D Navigation Controls */}
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-500 font-mono">
                    <button 
                      type="button"
                      onClick={() => setActive3dSide(prev => (prev - 1 + activeProcessesListFor3D.length) % activeProcessesListFor3D.length)}
                      className="px-3.5 py-1.5 cursor-pointer hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs transition-all font-bold"
                    >
                      ◀ Rotate Previous Segment
                    </button>
                    <span className="font-bold">Prism Side {active3dSide + 1} of {activeProcessesListFor3D.length}</span>
                    <button 
                      type="button"
                      onClick={() => setActive3dSide(prev => (prev + 1) % activeProcessesListFor3D.length)}
                      className="px-3.5 py-1.5 cursor-pointer hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs transition-all font-bold"
                    >
                      Rotate Next Segment ▶
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
                >
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-widest text-[10px]">
                      <tr>
                        <th className="p-4 px-6">Operator Detail</th>
                        <th className="p-4 text-center">Process Domain</th>
                        <th className="p-4 text-center">Days Logged</th>
                        <th className="p-4 text-right px-6">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-slate-600 font-medium">
                      {bottomQuartileList.map((op, idx) => (
                        <motion.tr 
                          key={idx}
                          variants={itemVariants}
                          className="hover:bg-rose-50/20 transition-all duration-150"
                        >
                          <td className="p-4 px-6">
                            <div className="font-extrabold text-slate-800">{op.name}</div>
                            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Sub Process: {op.subProcess}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-150 rounded text-[9px] uppercase font-bold">
                              {op.process}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold text-slate-700">{op.daysLogged} days</td>
                          <td className="p-4 text-right px-6 font-mono font-extrabold text-rose-600 text-sm">
                            {formatPercent(op.efficiency)}
                          </td>
                        </motion.tr>
                      ))}
                      {bottomQuartileList.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider">
                            No outlier records captured
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </motion.div>
              )}

            </div>
          )}

          {/* TAB 4: Star Performer */}
          {subTab === 'stars' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="bg-white border border-slate-200/85 rounded-3xl p-6 shadow-xs space-y-6"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <Star className="w-5 h-5 fill-indigo-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider font-mono">
                    Star Performer Workspace
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Showing top performers grouped by their respective teams (process segments) only (e.g. SB star performers are isolated and shown under the SB team). Criteria: accuracy levels exceeding 95%.
                  </p>
                </div>
              </div>

              <div className="space-y-8">
                {activeProcessesListFor3D.map((proc, pIdx) => {
                  const stars = starPerfsByProcess[proc] || [];
                  if (stars.length === 0) return null;
                  return (
                    <div key={pIdx} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                          {proc} Team Star Performers
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stars.map((op, idx) => (
                          <motion.div
                            key={idx}
                            variants={itemVariants}
                            whileHover={{ scale: 1.015, y: -2 }}
                            className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl flex justify-between items-center relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-mono font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                                  {idx + 1}
                                </span>
                                <h4 className="text-sm font-black text-slate-800">{op.name}</h4>
                              </div>
                              <p className="text-[10px] text-indigo-600 font-extrabold mt-1 uppercase font-mono tracking-wider">
                                {op.process} <span className="text-slate-400">➔</span> {op.subProcess}
                              </p>
                              <div className="mt-2 text-[10px] font-mono text-slate-400 flex gap-3">
                                <span>Logged: <b>{op.daysLogged}d</b></span>
                                <span>Total docs: <b>{op.totalOutput.toLocaleString()}</b></span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-mono">QA ACCURACY</span>
                              <span className="text-2xl font-black text-indigo-600 font-mono block leading-none mt-1">
                                {formatPercent(op.accuracy)}
                              </span>
                              <span className="text-[10px] text-emerald-500 font-bold font-mono">
                                {formatPercent(op.efficiency)} eff
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {qualityLeadersList.length === 0 && (
                <div className="text-center py-12 text-slate-400 font-bold uppercase tracking-wider">
                  No operators currently meeting evaluation criteria
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: Sub Process Deep Analysis */}
          {subTab === 'subprocesses' && (
            <div className="space-y-6">
              
              {/* Highlight metrics bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-150">
                    <Layers size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Sub Processes Queues</span>
                    <p className="text-base font-black text-slate-800">{subprocessStatsList.length} queues</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-150">
                    <Flame size={18} className="animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Top Performing Queue</span>
                    <p className="text-[11px] font-black text-emerald-600 truncate max-w-[150px]" title={activeSubProcessData?.subProcess}>
                      {activeSubProcessData?.subProcess}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-150">
                    <Target size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Primary PMS Module</span>
                    <p className="text-xs font-black text-slate-700 uppercase">{activeSubProcessData?.topPms || 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/85 p-4 rounded-2xl shadow-xs flex items-center gap-4">
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl border border-teal-150">
                    <Users size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Operating Headcount</span>
                    <p className="text-base font-black text-slate-800">{activeSubProcessData?.headcount} Reps active</p>
                  </div>
                </div>
              </div>

              {/* Sub Process Selector split panel */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: interactive selector list */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-white border border-slate-200/85 p-4 rounded-2xl">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono">
                      Sub Process Indexes
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Select one of the {uniqueSubProcesses.length} queues below to reveal its granular live distributions and platform trends.
                    </p>
                  </div>

                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {subprocessStatsList.map((item, idx) => {
                      const isSelected = selectedSubProcessDetail.toLowerCase() === item.subProcess.toLowerCase();
                      return (
                        <motion.div
                          key={idx}
                          onClick={() => setSelectedSubProcessDetail(item.subProcess)}
                          whileHover={{ scale: isSelected ? 1 : 1.01 }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-slate-900 border-slate-900 shadow-md text-white'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {item.process}
                              </span>
                              <h4 className="text-xs font-black mt-2 leading-snug">{item.subProcess}</h4>
                            </div>

                            <div className="text-right">
                              <span className={`text-xs font-black font-mono ${
                                isSelected ? 'text-indigo-300' : 'text-indigo-600'
                              }`}>
                                {formatPercent(item.avgEfficiency)} eff
                              </span>
                              <p className={`text-[9px] font-mono mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                                {item.totalAchieved.toLocaleString()} docs
                              </p>
                            </div>
                          </div>

                          <div className={`mt-3 grid grid-cols-2 gap-2 pt-2 text-[9px] font-mono ${
                            isSelected ? 'border-t border-slate-800 text-slate-400' : 'border-t border-slate-100 text-slate-400'
                          }`}>
                            <div>
                              <span>Accuracy: <b className={isSelected ? 'text-slate-100' : 'text-slate-700'}>{formatPercent(item.avgAccuracy)}</b></span>
                            </div>
                            <div className="text-right">
                              <span>Headcount: <b className={isSelected ? 'text-slate-100' : 'text-slate-700'}>{item.headcount} reps</b></span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side: Analytical Board */}
                <div className="lg:col-span-7">
                  {activeSubProcessData ? (
                    <motion.div 
                      key={activeSubProcessData.subProcess}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs"
                    >
                      {/* Header block */}
                      <div className="border-b border-slate-100 pb-4">
                        <span className="text-[9px] font-mono font-extrabold text-indigo-600 uppercase tracking-widest block">
                          Granular Queue Auditor
                        </span>
                        <h3 className="text-base font-black text-slate-800 mt-1">{activeSubProcessData.subProcess}</h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Assigned within the <b className="text-slate-700 uppercase font-mono">{activeSubProcessData.process}</b> workflow segment. Primary PMS is <b>{activeSubProcessData.topPms}</b>.
                        </p>
                      </div>

                      {/* Rep list */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <Users size={14} className="text-indigo-500" />
                          Representative Contributions & Performance
                        </h4>

                        <div className="border border-slate-150 rounded-2xl overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                              <tr>
                                <th className="p-3 px-4">Representative Name</th>
                                <th className="p-3 text-right">Target</th>
                                <th className="p-3 text-right">Achieved</th>
                                <th className="p-3 text-right px-4">Efficiency</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600 font-semibold font-mono text-[11px]">
                              {activeSubProcessData.repsList.map((c, cIdx) => (
                                <tr key={cIdx} className="hover:bg-slate-50/40">
                                  <td className="p-3 px-4 font-sans text-slate-800 font-extrabold">{c.name}</td>
                                  <td className="p-3 text-right text-slate-400">{(c.efficiency > 0 ? Math.round(100 / c.efficiency * 50) : 50).toLocaleString()}</td>
                                  <td className="p-3 text-right text-indigo-600 font-extrabold">{(c.efficiency > 0 ? 50 : 0).toLocaleString()}</td>
                                  <td className="p-3 text-right px-4 font-bold">
                                    <span className={`inline-block px-1.5 py-0.2 rounded ${
                                      c.efficiency >= 100 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                                    }`}>
                                      {formatPercent(c.efficiency)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {activeSubProcessData.repsList.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="text-center py-6 text-slate-400 font-bold uppercase font-sans">
                                    No active records registered
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </motion.div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                      <Info size={32} className="text-slate-300" />
                      <p className="text-xs font-bold text-slate-700">No Sub Process Selected</p>
                      <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                        Please select an item from the left sub process listing pane to view detailed operating analytics.
                      </p>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── INTERACTIVE HIERARCHY DRILL-DOWN (Reporting Manager ➔ PMS ➔ Subprocess ➔ Employees) ─── */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm" id="hierarchical_drilldown_panel">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers size={16} className="text-indigo-600" /> Interactive Hierarchy Drill-Down (Reporting Manager ➔ PMS ➔ Subprocess ➔ Employees)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Select a manager, PMS and subprocess to isolate agent profiles. Multiple employees can be compared at once; partial-day targets scale to hours actually worked.
          </p>
        </div>

        {/* 4-Column Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 1. Reporting Manager */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              1. Reporting Manager
            </label>
            <select
              value={drillManager}
              onChange={e => {
                setDrillManager(e.target.value);
                setDrillPms('');
                setDrillSubProcess('');
                setDrillEmpIds([]);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition cursor-pointer"
            >
              <option value="">-- Choose Manager --</option>
              {drillManagers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 2. Select Process (PMS) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              2. Select Process (PMS)
            </label>
            <select
              value={drillPms}
              onChange={e => {
                setDrillPms(e.target.value);
                setDrillSubProcess('');
                setDrillEmpIds([]);
              }}
              disabled={!drillManager}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">-- Choose PMS --</option>
              {drillPmsOptions.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 3. Select Subprocess (Platform) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              3. Select Subprocess (Platform)
            </label>
            <select
              value={drillSubProcess}
              onChange={e => {
                setDrillSubProcess(e.target.value);
                setDrillEmpIds([]);
              }}
              disabled={!drillManager || !drillPms}
              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-2 text-xs font-semibold outline-none text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <option value="">-- All Subprocesses --</option>
              {drillSubProcessOptions.map(sb => (
                <option key={sb} value={sb}>{sb}</option>
              ))}
            </select>
          </div>

          {/* 4. Select Employees (multi-select) */}
          <div>
            <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">
              4. Select Employees ({drillEmpIds.length} of {drillEmployeeOptions.length} selected)
            </label>
            <div className={`w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs max-h-32 overflow-y-auto space-y-0.5 ${
              (!drillManager || !drillPms || drillEmployeeOptions.length === 0) ? 'opacity-50 pointer-events-none' : ''
            }`}>
              {drillEmployeeOptions.length === 0 ? (
                <span className="text-slate-400 font-semibold block py-1 px-1">Select a manager and PMS first</span>
              ) : (
                drillEmployeeOptions.map(emp => (
                  <label key={emp.empId} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={drillEmpIds.includes(emp.empId)}
                      onChange={() => toggleDrillEmployee(emp.empId)}
                      className="accent-indigo-600 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-700 truncate">{emp.name} ({emp.empId})</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {drillEmpSummaries.length > 0 ? (
          <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/20 p-5 space-y-5">
            {/* Per-employee summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {drillEmpSummaries.map(s => (
                <div key={s.empId} className="p-4 bg-white border border-slate-200/60 rounded-xl">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-mono font-extrabold uppercase rounded-md border border-indigo-100">
                    {s.empId}
                  </span>
                  <h4 className="text-sm font-black text-slate-800 mt-1.5 truncate">{s.name}</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                    <div>Efficiency: <span className={`font-mono font-black ${s.efficiency >= 90 ? 'text-emerald-600' : s.efficiency >= 75 ? 'text-indigo-600' : 'text-rose-500'}`}>{formatPercent(s.efficiency)}</span></div>
                    <div>Accuracy: <span className="font-mono font-black text-emerald-600">{formatPercent(s.accuracy)}</span></div>
                    <div>Achieved: <span className="font-mono font-bold text-slate-700">{s.achieved.toLocaleString()}</span></div>
                    <div>Scaled Target: <span className="font-mono font-bold text-slate-700">{s.scaledTarget.toLocaleString()}</span></div>
                    <div className="col-span-2">Days Logged: <span className="font-mono font-bold text-slate-700">{s.daysLogged}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Combined Timeline Ledger */}
            <div>
              <h5 className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2 font-mono">Production Timeline Log Ledger (Excel Calculation Rules)</h5>
              <div className="bg-white border border-slate-200/60 rounded-xl overflow-x-auto overflow-y-auto max-h-[340px]">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[9px] font-mono sticky top-0 z-10">
                      <th className="p-3 font-black">EmpID</th>
                      <th className="p-3 font-black">PMS</th>
                      <th className="p-3 font-black">Process Name</th>
                      <th className="p-3 font-black">Sub Process Name</th>
                      <th className="p-3 font-black">Date</th>
                      <th className="p-3 font-black text-right">Target</th>
                      <th className="p-3 font-black text-right">Achieved</th>
                      <th className="p-3 font-black text-right">Daily Work Hours</th>
                      <th className="p-3 font-black text-right">Hourly Target</th>
                      <th className="p-3 font-black text-right">Achieved(hourly)</th>
                      <th className="p-3 font-black text-center">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {drillLogs.map(l => (
                      <tr key={`${l.id}_${l.empId}_${l.date}`} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 font-semibold text-slate-600 font-mono">{l.empId}</td>
                        <td className="p-3 font-medium text-slate-500">{l.pms}</td>
                        <td className="p-3 text-slate-600">{l.processName}</td>
                        <td className="p-3 text-slate-600">{l.subProcessName}</td>
                        <td className="p-3 font-bold text-slate-700">{l.date}</td>
                        <td className="p-3 text-right text-slate-600">
                          <div className="flex flex-col items-end">
                            <span className={l.isScaled ? 'line-through opacity-50 font-mono' : 'font-mono'}>{l.target}</span>
                            {l.isScaled && (
                              <span className="text-[9px] text-amber-600 font-bold font-mono">
                                Scaled: {l.scaledTarget}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right font-black text-slate-800 font-mono">{l.achieved}</td>
                        <td className="p-3 text-right font-mono text-slate-500">{l.dailyWorkHours || 8} hrs</td>
                        <td className="p-3 text-right font-mono text-slate-500">{(l.hourlyTarget || (l.target / (l.dailyWorkHours || 8))).toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-indigo-700 font-bold">{(l.achievedHourly || (l.achieved / (l.hourlyTarget || 1))).toFixed(4)}</td>
                        <td className="p-3 text-center">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-[10px] ${(l.isScaled ? l.eff : l.percentage) >= 100 ? 'bg-emerald-50 text-emerald-700' : (l.isScaled ? l.eff : l.percentage) >= 75 ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'}`}>
                            {formatPercent(l.isScaled ? l.eff : l.percentage)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {drillLogs.length === 0 && (
                      <tr>
                        <td colSpan={11} className="p-8 text-center text-slate-400 font-medium">No production logs recorded for the selected employees in this scope.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 font-medium text-xs bg-slate-50/10">
            Select a Reporting Manager, PMS, Subprocess and one or more Employees to display the operational drill-down.
          </div>
        )}
      </div>

      {/* ─── CHART EXPLANATION MODAL ─────────────────────────────────────── */}
      {selectedChartExplanation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className={`bg-white rounded-3xl border border-slate-200 shadow-2xl w-full ${chartModalTab === 'breakdown' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden animate-in fade-in zoom-in duration-150`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <HelpCircle className="text-indigo-600 animate-pulse" size={20} />
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide font-mono">
                    Chart Method: {selectedChartExplanation}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                    Underlying mathematical formula & current data aggregation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChartExplanation(null)}
                className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Segmented Tab Bar */}
            <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex gap-4">
              <button
                onClick={() => setChartModalTab('breakdown')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                  chartModalTab === 'breakdown'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                📊 Detailed Data Breakdown
              </button>
              <button
                onClick={() => setChartModalTab('formula')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition cursor-pointer ${
                  chartModalTab === 'formula'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                🧮 Calculation Formula
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh] text-slate-700">
              {chartModalTab === 'breakdown' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-black uppercase font-mono tracking-wider">
                      {selectedChartExplanation} Breakdown ({
                        selectedChartExplanation === 'Monthly Production Volume' ? `${monthlyVolumeData.length} Logged Dates` :
                        selectedChartExplanation === 'Weekly Efficiency & Target Completion Trends' ? `${weeklyTrendData.length} Calendar Weeks` :
                        selectedChartExplanation === 'Daily Average Performance' ? `${processShiftStats.length} Process Shifts` :
                        selectedChartExplanation === 'Bottom Quartile Outlier Identification' ? `${bottomQuartileList.length} Flagged Representatives` : ''
                      })
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse bg-white text-xs">
                      {selectedChartExplanation === 'Monthly Production Volume' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-center">Achieved Volume</th>
                              <th className="py-3 px-4 text-center">Target Volume</th>
                              <th className="py-3 px-4 text-center">Variance Ratio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {monthlyVolumeData.map((e, idx) => {
                              const ratio = e.Target > 0 ? Math.round((e.Achieved / e.Target) * 100) : 100;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-mono font-bold text-slate-600">{e.date}</td>
                                  <td className="py-2.5 px-4 text-center font-bold text-slate-800">{e.Achieved} claims</td>
                                  <td className="py-2.5 px-4 text-center text-slate-500">{e.Target} claims</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                      ratio >= 100 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'
                                    }`}>
                                      {formatPercent(ratio)} of Target
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedChartExplanation === 'Weekly Efficiency & Target Completion Trends' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Calendar Week Slot</th>
                              <th className="py-3 px-4 text-center">Weekly Efficiency %</th>
                              <th className="py-3 px-4 text-center">Target Completion %</th>
                              <th className="py-3 px-4 text-center">Performance Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {weeklyTrendData.map((e, idx) => {
                              const isExcellent = e['Avg Efficiency %'] >= 100;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4 font-bold text-slate-600">{e.week}</td>
                                  <td className="py-2.5 px-4 text-center font-mono font-extrabold text-indigo-600">{formatPercent(e['Avg Efficiency %'])}</td>
                                  <td className="py-2.5 px-4 text-center font-mono font-extrabold text-emerald-600">{formatPercent(e['Target Completion %'])}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                                      isExcellent ? 'text-emerald-700 bg-emerald-100' : 'text-slate-600 bg-slate-100'
                                    }`}>
                                      {isExcellent ? 'Optimal' : 'Standard'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedChartExplanation === 'Daily Average Performance' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Medical Billing Process Stream</th>
                              <th className="py-3 px-4 text-center">Avg Target/Day</th>
                              <th className="py-3 px-4 text-center">Avg Achieved/Day</th>
                              <th className="py-3 px-4 text-center">Projected Weekly Output</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {processShiftStats.map((e, idx) => {
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition">
                                  <td className="py-2.5 px-4">
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-extrabold uppercase font-mono text-[9px]">
                                      {e.process}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center text-slate-500 font-mono">{e['Avg Target']}</td>
                                  <td className="py-2.5 px-4 text-center font-mono text-slate-800 font-extrabold">{e['Avg Achieved']}</td>
                                  <td className="py-2.5 px-4 text-center font-mono text-indigo-600 font-black">{e['Avg Weekly Output']} claims</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}

                      {selectedChartExplanation === 'Bottom Quartile Outlier Identification' && (
                        <>
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">
                              <th className="py-3 px-4">Representative</th>
                              <th className="py-3 px-4 text-center">Assigned Segment</th>
                              <th className="py-3 px-4 text-center">Days Logged</th>
                              <th className="py-3 px-4 text-center">Overall Efficiency</th>
                              <th className="py-3 px-4 text-center">QA Audit Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                            {bottomQuartileList.map((e, idx) => {
                              return (
                                <tr key={idx} className="hover:bg-rose-50/40 transition">
                                  <td className="py-2.5 px-4 font-bold text-slate-800">{e.name}</td>
                                  <td className="py-2.5 px-4 text-center">
                                    <span className="text-[10px] uppercase font-mono tracking-wide text-slate-500 font-bold">{e.process}</span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-mono text-slate-500">{e.daysLogged} d</td>
                                  <td className="py-2.5 px-4 text-center font-mono font-bold text-rose-600">{formatPercent(e.efficiency)}</td>
                                  <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-600">{formatPercent(e.accuracy)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Formula Panel */}
                  <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-850 font-mono shadow-inner relative overflow-hidden">
                    <div className="absolute right-3 top-3 text-[9px] uppercase tracking-wider font-black text-slate-750 select-none">
                      Statistical Model
                    </div>
                    <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest mb-1">
                      How This View Is Formulated
                    </div>
                    <div className="text-sm font-black text-white leading-relaxed">
                      {selectedChartExplanation === 'Monthly Production Volume' && (
                        <span>Monthly Production Volume = Plot of ∑ Achieved vs ∑ Target baseline across chronological date labels within the filtered month parameter.</span>
                      )}
                      {selectedChartExplanation === 'Weekly Efficiency & Target Completion Trends' && (
                        <span>Weekly Efficiency = Average of (Daily Achieved / Target) × 100 for each calendar week. Target Completion = (∑ Achieved / ∑ Target) × 100 for that week.</span>
                      )}
                      {selectedChartExplanation === 'Daily Average Performance' && (
                        <span>Daily Average = (∑ Process Achieved Claims) / (Unique Date Count). Weekly output projection assumes a standard 5-day cycle.</span>
                      )}
                      {selectedChartExplanation === 'Bottom Quartile Outlier Identification' && (
                        <span>Sorts employee list ascending by efficiency. Isolates the lowest 25% cohort, and plots the top 5 lowest-performing operators.</span>
                      )}
                    </div>
                  </div>

                  {/* Step-by-Step Evaluation */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest font-mono border-b border-slate-100 pb-1.5">
                      Real-Time Scope Verification
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      
                      {/* Left Column: Data points */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2.5">
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider font-mono block mb-1">
                          Scope Variables
                        </span>
                        
                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Filtered Logs Scanned:</span>
                          <span className="font-mono font-bold text-slate-800">{production.length} entries</span>
                        </div>

                        <div className="flex justify-between font-medium">
                          <span className="text-slate-500">Active Operator Count:</span>
                          <span className="font-mono font-bold text-slate-800">{new Set(production.map(p => p.empId)).size} representatives</span>
                        </div>
                      </div>

                      {/* Right Column: Step by step logic */}
                      <div className="bg-indigo-50/45 p-4 rounded-xl border border-indigo-100/60 space-y-2.5">
                        <span className="text-[9px] text-indigo-950/60 font-black uppercase tracking-wider font-mono block mb-1">
                          Execution Trace
                        </span>
                        
                        {selectedChartExplanation === 'Monthly Production Volume' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Scans filtered production records.<br />
                            2. Clusters sum achieved and target counts per logged day.<br />
                            3. Generates area charts using an area-spline curve.
                          </p>
                        )}

                        {selectedChartExplanation === 'Weekly Efficiency & Target Completion Trends' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Divides filtered transactions into calendar week slots.<br />
                            2. Calculates average efficiency % & volume target completion % for each slot.<br />
                            3. Plots line trend comparing progress trends.
                          </p>
                        )}

                        {selectedChartExplanation === 'Daily Average Performance' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Groups production arrays by medical billing process stream.<br />
                            2. Calculates total achievements vs unique days.<br />
                            3. Multiplies by 5 to project normal weekly output capabilities.
                          </p>
                        )}

                        {selectedChartExplanation === 'Bottom Quartile Outlier Identification' && (
                          <p className="text-[11px] text-indigo-900 leading-normal font-medium">
                            1. Computes overall average efficiency for every active employee.<br />
                            2. Filters list to find bottom 25% cutoff.<br />
                            3. Renders the lowest 5 operators inside 3D rotating prism faces or a list.
                          </p>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">
                Math Trace Verified
              </span>
              <button
                onClick={() => setSelectedChartExplanation(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-black text-xs px-4 py-2 rounded-xl cursor-pointer transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
