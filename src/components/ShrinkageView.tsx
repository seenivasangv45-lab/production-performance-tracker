import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { calculateAttendanceMetrics, formatPercent, normalizeEmpId, matchesClean } from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, Filter, AlertTriangle, ShieldCheck, TrendingDown, HelpCircle, UserX, UserCheck } from 'lucide-react';

export const ShrinkageView: React.FC = () => {
  const { employees, attendance, production } = useApp();

  // Filters
  const [empName, setEmpName] = useState('');
  const [designationLevel, setDesignationLevel] = useState('');
  const [reportingManager, setReportingManager] = useState('');
  const [lineManager, setLineManager] = useState('');
  const [rcmManager, setRcmManager] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown lists
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      const status = (emp.status || '').toLowerCase();
      return !status.includes('relieved') && !status.includes('abscond');
    });
  }, [employees]);

  // Dropdown option sets computed dynamically to support cascaded filtering
  const uniqueEmps = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      if (designationLevel && emp.designation !== designationLevel) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.name))).sort();
  }, [activeEmployees, reportingManager, lineManager, rcmManager, designationLevel]);

  const uniqueDepts = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.designation))).sort();
  }, [activeEmployees, empName, reportingManager, lineManager, rcmManager]);

  const uniqueRMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      if (designationLevel && emp.designation !== designationLevel) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rm).filter(Boolean))).sort();
  }, [activeEmployees, empName, lineManager, rcmManager, designationLevel]);

  const uniqueLMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (rcmManager && emp.rcm !== rcmManager) return false;
      if (designationLevel && emp.designation !== designationLevel) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.lm).filter(Boolean))).sort();
  }, [activeEmployees, empName, reportingManager, rcmManager, designationLevel]);

  const uniqueRCMs = useMemo(() => {
    const filtered = activeEmployees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (reportingManager && emp.rm !== reportingManager) return false;
      if (lineManager && emp.lm !== lineManager) return false;
      if (designationLevel && emp.designation !== designationLevel) return false;
      return true;
    });
    return Array.from(new Set(filtered.map(e => e.rcm).filter(Boolean))).sort();
  }, [activeEmployees, empName, reportingManager, lineManager, designationLevel]);

  // Interdependent Auto-Fill/Cascade handlers
  const handleEmpNameChange = (val: string) => {
    setEmpName(val);
    if (!val) {
      setReportingManager('');
      setLineManager('');
      setRcmManager('');
      setDesignationLevel('');
      return;
    }
    const emp = activeEmployees.find(e => e.name === val);
    if (emp) {
      setReportingManager(emp.rm || '');
      setLineManager(emp.lm || '');
      setRcmManager(emp.rcm || '');
      setDesignationLevel(emp.designation || '');
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
      setDesignationLevel(emp.designation || '');
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
      setDesignationLevel(emp.designation || '');
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
      setDesignationLevel(emp.designation || '');
    }
  };

  const handleDesignationLevelChange = (val: string) => {
    setDesignationLevel(val);
  };

  const handleResetFilters = () => {
    setEmpName('');
    setDesignationLevel('');
    setReportingManager('');
    setLineManager('');
    setRcmManager('');
    setStartDate('');
    setEndDate('');
  };

  // Filtered dataset
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (empName && emp.name !== empName) return false;
      if (designationLevel && emp.designation !== designationLevel) return false;
      if (reportingManager && !matchesClean(emp.rm, reportingManager)) return false;
      if (lineManager && !matchesClean(emp.lm, lineManager)) return false;
      if (rcmManager && !matchesClean(emp.rcm, rcmManager)) return false;
      return true;
    });
  }, [employees, empName, designationLevel, reportingManager, lineManager, rcmManager]);

  const filteredEmpIds = useMemo(() => new Set(filteredEmployees.map(e => normalizeEmpId(e.empId))), [filteredEmployees]);

  const filteredAttendance = useMemo(() => {
    return attendance.filter(att => {
      const matchEmp = filteredEmpIds.has(normalizeEmpId(att.empId));
      if (!matchEmp) return false;
      if (startDate && att.date < startDate) return false;
      if (endDate && att.date > endDate) return false;
      return true;
    });
  }, [attendance, filteredEmpIds, startDate, endDate]);

  // Calculations for registry
  const attendanceRegistry = useMemo(() => {
    return filteredEmployees.map(emp => {
      // Find assigned process for display
      const normId = normalizeEmpId(emp.empId);
      const empProds = production.filter(p => normalizeEmpId(p.empId) === normId);
      const processName = empProds[0]?.processName || 'N/A';

      const metrics = calculateAttendanceMetrics(emp.empId, filteredAttendance);

      // Standard total work hours: sum up expectedHours of all attendance records for this employee in the filtered period
      const empRecords = filteredAttendance.filter(r => normalizeEmpId(r.empId) === normId);
      const standardHours = empRecords.reduce((sum, r) => sum + (r.expectedHours || 8), 0);

      return {
        id: emp.empId,
        name: emp.name,
        process: processName,
        designation: emp.designation,
        expectedDays: metrics.expectedDays,
        workedDays: metrics.workedDays,
        leaves: metrics.leaves,
        attendanceRate: metrics.attendanceRate,
        hoursWorked: metrics.totalHoursWorked,
        standardHours,
        hoursBreak: metrics.totalHoursBreak,
        hoursOT: metrics.totalHoursOT,
        shortfall: metrics.totalShortfall,
        breakExcessCount: metrics.breakExcessCount,
        breakExcessHours: metrics.breakExcessHours
      };
    }).filter(item => item.expectedDays > 0);
  }, [filteredEmployees, filteredAttendance, production]);

  // Highest Shortfall Hours Ranking (Top 10) Bar Chart
  const topShortfallChartData = useMemo(() => {
    return [...attendanceRegistry]
      .sort((a, b) => b.shortfall - a.shortfall)
      .slice(0, 10)
      .map(item => ({
        name: item.name.split(' ')[0], // First name only for legibility
        'Shortfall Hours': item.shortfall,
        'Hours Worked': item.hoursWorked
      }));
  }, [attendanceRegistry]);

  // Core Productive Loss Metrics
  const coreLossStats = useMemo(() => {
    let totalShortfall = 0;
    let totalBreakExcessHours = 0;
    let totalOTHours = 0;
    let totalWorkedHours = 0;
    let totalWorkedDays = 0;
    let totalAbsences = 0;

    attendanceRegistry.forEach(a => {
      totalShortfall += a.shortfall;
      totalBreakExcessHours += a.breakExcessHours;
      totalOTHours += a.hoursOT;
      totalWorkedHours += a.hoursWorked;
      totalWorkedDays += a.workedDays;
      totalAbsences += a.leaves;
    });

    const averageDailyWorkedHours = totalWorkedDays > 0 
      ? Number((totalWorkedHours / totalWorkedDays).toFixed(1)) 
      : 0;

    const totalExpectedDays = attendanceRegistry.reduce((sum, r) => sum + r.expectedDays, 0);
    const totalExpectedHours = totalExpectedDays * 8;
    const netProductiveLoss = Number((totalShortfall + totalBreakExcessHours - totalOTHours).toFixed(1));
    const activeLeaveRate = totalExpectedDays > 0 ? Number(((totalAbsences / totalExpectedDays) * 100).toFixed(1)) : 0;
    const averageAdherenceRate = totalExpectedDays > 0 ? Number(((totalWorkedDays / totalExpectedDays) * 100).toFixed(1)) : 100;

    return {
      totalShortfall: Number(totalShortfall.toFixed(1)),
      totalBreakExcessHours: Number(totalBreakExcessHours.toFixed(1)),
      totalOTHours: Number(totalOTHours.toFixed(1)),
      averageDailyWorkedHours,
      totalAbsences,
      totalExpectedHours: Number(totalExpectedHours.toFixed(1)),
      totalWorkedHours: Number(totalWorkedHours.toFixed(1)),
      netProductiveLoss,
      activeLeaveRate,
      averageAdherenceRate
    };
  }, [attendanceRegistry]);

  const totalWorkingDays = useMemo(() => {
    return attendanceRegistry.reduce((sum, r) => sum + r.expectedDays, 0);
  }, [attendanceRegistry]);

  const attendancePresent = useMemo(() => {
    return attendanceRegistry.reduce((sum, r) => sum + r.workedDays, 0);
  }, [attendanceRegistry]);

  const attendanceAbsent = useMemo(() => {
    return attendanceRegistry.reduce((sum, r) => sum + r.leaves, 0);
  }, [attendanceRegistry]);

  const shrinkagePct = useMemo(() => {
    if (totalWorkingDays === 0) return 0;
    return Number(((attendanceAbsent / totalWorkingDays) * 100).toFixed(2));
  }, [attendanceAbsent, totalWorkingDays]);

  const hoursShortfall = useMemo(() => {
    return Number(filteredAttendance.reduce((acc, rec) => {
      if (rec.onLeave) return acc;
      const expected = rec.expectedHours || 8;
      const worked = rec.hoursWorked || 0;
      return acc + Math.max(0, expected - worked);
    }, 0).toFixed(1));
  }, [filteredAttendance]);

  return (
    <div className="space-y-6" id="shrinkage_view">
      {/* Workforce Shrinkage Filter Option Panel */}
      <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Shrinkage & Shift Controls</h2>
          </div>
          <button 
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <label className="block text-gray-500 mb-1">Employee Name</label>
            <select value={empName} onChange={e => handleEmpNameChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
              <option value="">All</option>
              {uniqueEmps.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Designation Level</label>
            <select value={designationLevel} onChange={e => handleDesignationLevelChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
              <option value="">All</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Reporting Manager</label>
            <select value={reportingManager} onChange={e => handleReportingManagerChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
              <option value="">All</option>
              {uniqueRMs.map(rm => <option key={rm} value={rm}>{rm}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Line Manager</label>
            <select value={lineManager} onChange={e => handleLineManagerChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
              <option value="">All</option>
              {uniqueLMs.map(lm => <option key={lm} value={lm}>{lm}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">RCM Manager</label>
            <select value={rcmManager} onChange={e => handleRcmManagerChange(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
              <option value="">All</option>
              {uniqueRCMs.map(rcm => <option key={rcm} value={rcm}>{rcm}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs" 
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs" 
            />
          </div>
        </div>
      </div>

      {/* Workforce Shrinkage KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="shrinkage_view_kpi_cards">
        {/* Attendance Present Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition hover:shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Attendance Present</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-black text-slate-800">{attendancePresent}</h3>
              <span className="text-[10px] text-slate-400 font-medium ml-1.5">Days Worked</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <UserCheck className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        {/* Attendance Absent Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition hover:shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Attendance Absent</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-black text-rose-600">{attendanceAbsent}</h3>
              <span className="text-[10px] text-rose-400 font-medium ml-1">Days Off / Leave</span>
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <UserX className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        {/* Total Working Days Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition hover:shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Total Working Days</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-black text-slate-800">{totalWorkingDays}</h3>
              <span className="text-[10px] text-slate-400 font-medium ml-1.5">Expected Days</span>
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Clock className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        {/* Shrinkage % Card */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs transition hover:shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Shrinkage %</span>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-2xl font-black text-amber-600">{formatPercent(shrinkagePct)}</h3>
              <span className="text-[10px] text-amber-500 font-medium ml-1.5">Rate</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <TrendingDown className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Overview stats & Loss evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shortfall chart */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm lg:col-span-2">
          <div className="flex items-center gap-1.5 mb-4">
            <Clock className="w-5 h-5 text-rose-500" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Highest Shortfall Hours Ranking (Top 10)</h3>
          </div>
          <div className="h-64">
            {topShortfallChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topShortfallChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} label={{ value: 'Hours Deficit', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Shortfall Hours" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={20} />
                  <Bar dataKey="Hours Worked" fill="#94a3b8" radius={[2, 2, 0, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">No attendance records generated</div>
            )}
          </div>
        </div>

        {/* Productive Loss Evaluation Panel */}
        <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Core Productive Loss Metrics</h3>
            </div>
            <p className="text-[10px] text-slate-400 mb-4 uppercase font-bold tracking-wider">Evaluating deviances from typical 8-hour daily shifts</p>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500">Accumulated Shift Shortfall</span>
                <span className="font-mono font-bold text-rose-600">{coreLossStats.totalShortfall} hrs</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500">Accumulated Break Excess</span>
                <span className="font-mono font-bold text-amber-600">+{coreLossStats.totalBreakExcessHours} hrs</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500">Compensating OT Logged</span>
                <span className="font-mono font-bold text-emerald-600">-{coreLossStats.totalOTHours} hrs</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50 bg-rose-50/40 px-2 py-1 rounded border border-rose-100">
                <span className="text-rose-800 font-bold">Net Productive Deficit</span>
                <span className="font-mono font-black text-rose-700">{coreLossStats.netProductiveLoss} hrs</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500">Scheduled vs Worked Hours</span>
                <span className="font-mono font-semibold text-slate-700">
                  {coreLossStats.totalExpectedHours}h / {coreLossStats.totalWorkedHours}h
                </span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500 font-semibold">Average Adherence Rate</span>
                <span className="font-mono font-bold text-indigo-600">{formatPercent(coreLossStats.averageAdherenceRate)}</span>
              </div>
              <div className="flex justify-between items-center pb-1.5 border-b border-gray-50">
                <span className="text-gray-500">Active Leave Frequency</span>
                <span className="font-mono font-bold text-amber-600">{formatPercent(coreLossStats.activeLeaveRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Average Shift Duration</span>
                <span className="font-mono font-bold text-gray-800">{coreLossStats.averageDailyWorkedHours} hrs / day</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Attendance & Work Hours Registry */}
      <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Attendance & Work Hours Registry</h3>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-3xs uppercase font-bold sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Operator Name</th>
                <th className="py-2.5 px-4">Process stream</th>
                <th className="py-2.5 px-4 text-center">Expected Days</th>
                <th className="py-2.5 px-4 text-center">Worked Days</th>
                <th className="py-2.5 px-4 text-center">Leaves</th>
                <th className="py-2.5 px-4 text-center">Adherence %</th>
                <th className="py-2.5 px-4 text-right">Hours worked</th>
                <th className="py-2.5 px-4 text-right">Standard Work Hours</th>
                <th className="py-2.5 px-4 text-right">Break taken</th>
                <th className="py-2.5 px-4 text-right">Overtime</th>
                <th className="py-2.5 px-4 text-right text-rose-600">Shortfall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
              {attendanceRegistry.map((op, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-4 font-semibold text-gray-800">{op.name}</td>
                  <td className="py-2.5 px-4 text-gray-500">{op.process}</td>
                  <td className="py-2.5 px-4 text-center font-mono">{op.expectedDays}</td>
                  <td className="py-2.5 px-4 text-center font-mono">{op.workedDays}</td>
                  <td className="py-2.5 px-4 text-center font-mono text-amber-600">{op.leaves}</td>
                  <td className="py-2.5 px-4 text-center font-bold text-slate-700">{formatPercent(op.attendanceRate)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{op.hoursWorked}h</td>
                  <td className="py-2.5 px-4 text-right font-mono">{op.standardHours}h</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-500">
                    {op.hoursBreak}h 
                    {op.breakExcessCount > 0 && (
                      <span className="block text-4xs text-amber-600 font-bold">({op.breakExcessCount} excess)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-emerald-600">+{op.hoursOT}h</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">{op.shortfall}h</td>
                </tr>
              ))}
              {attendanceRegistry.length === 0 && (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-400">No shift records retrieved for this query</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
