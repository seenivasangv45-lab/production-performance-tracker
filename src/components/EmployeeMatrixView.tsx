import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  calculateTenure, 
  getModifiedStatus, 
  calculateAttendanceMetrics,
  getBillingCycles,
  calculateAttendanceMetricsForCycle,
  evaluateSaturdayRuleForEmployee
} from '../utils/calculations';
import { Search, Filter, Users, GitFork, ClipboardList, PlusCircle, Trash2, ShieldAlert, ChevronDown, ChevronUp, Calendar, CheckCircle, XCircle, AlertTriangle, Maximize2, Minimize2, Folder, FolderOpen, ChevronRight, User, ArrowRight } from 'lucide-react';

export const EmployeeMatrixView: React.FC = () => {
  const { employees, attendance, addEmployee, removeEmployee, clearEmployees, showAlert } = useApp();

  // Active sub-tab within Employee Matrix
  const [activeTab, setActiveTab] = useState<'roster' | 'orgTree' | 'quickImport'>('roster');

  // Selected Billing Cycle ID
  const [selectedCycleId, setSelectedCycleId] = useState('2026-06'); // May 26 - Jun 25, 2026

  // Expanded row employee ID
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // States for expandable organizational directory tree
  const [expandedRcms, setExpandedRcms] = useState<string[]>([]);
  const [expandedLms, setExpandedLms] = useState<string[]>([]);
  const [expandedRms, setExpandedRms] = useState<string[]>([]);
  const [treeSearch, setTreeSearch] = useState('');

  // Fullscreen view for employee spreadsheet logs
  const [fullscreenEmpId, setFullscreenEmpId] = useState<string | null>(null);
  const [modalMarkingFilter, setModalMarkingFilter] = useState('');
  const [modalDateSearch, setModalDateSearch] = useState('');

  // Search/Filters States
  const [nameSearch, setNameSearch] = useState('');
  const [idSearch, setIdSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Dropdowns lists
  const uniqueDepts = useMemo(() => Array.from(new Set(employees.map(e => e.designation))).sort(), [employees]);
  const uniqueStatus = ['Active', 'Notice', 'New Joiner', 'Relieved', 'Abscond'];

  const billingCycles = useMemo(() => getBillingCycles(), []);
  const activeCycle = useMemo(() => {
    return billingCycles.find(c => c.id === selectedCycleId) || billingCycles[4]; // fallback to June 2026
  }, [billingCycles, selectedCycleId]);

  const fullscreenEmp = useMemo(() => {
    if (!fullscreenEmpId) return null;
    const emp = employees.find(e => e.empId === fullscreenEmpId);
    if (!emp) return null;
    const tenure = calculateTenure(emp.doj);
    const modifiedStatus = getModifiedStatus(emp);
    const metrics = calculateAttendanceMetricsForCycle(emp.empId, attendance, activeCycle.startDate, activeCycle.endDate);
    return {
      ...emp,
      tenure,
      modifiedStatus,
      attendanceMetrics: metrics
    };
  }, [employees, fullscreenEmpId, attendance, activeCycle]);

  const fullscreenLogs = useMemo(() => {
    if (!fullscreenEmpId) return [];
    return attendance.filter(
      a => a.empId === fullscreenEmpId &&
      a.date >= activeCycle.startDate &&
      a.date <= activeCycle.endDate
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [attendance, fullscreenEmpId, activeCycle]);

  const handleResetFilters = () => {
    setNameSearch('');
    setIdSearch('');
    setSelectedDept('');
    setSelectedDesignation('');
    setSelectedStatus('');
  };

  // Add Employee Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [newDOJ, setNewDOJ] = useState('2026-06-01');
  const [newDOB, setNewDOB] = useState('1995-05-15');
  const [newDesignation, setNewDesignation] = useState('Process Associate');
  const [newStatus, setNewStatus] = useState<'Active' | 'Notice' | 'New Joiner' | 'Relieved' | 'Abscond'>('Active');
  const [newRM, setNewRM] = useState('');
  const [newLM, setNewLM] = useState('');
  const [newRCM, setNewRCM] = useState('');
  const [newShift, setNewShift] = useState('09:00 AM - 06:00 PM');

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpId || !newEmpName) {
      showAlert('Employee ID and Name are required.');
      return;
    }
    addEmployee({
      empId: newEmpId,
      name: newEmpName,
      status: newStatus,
      doj: newDOJ,
      designation: newDesignation,
      rm: newRM,
      lm: newLM,
      rcm: newRCM,
      shiftTiming: newShift,
      dob: newDOB
    });
    // Reset Form
    setNewEmpId('');
    setNewEmpName('');
    setShowAddForm(false);
  };

  // Filtered employees listing
  const filteredEmployeesList = useMemo(() => {
    return employees.map(emp => {
      // Calculate tenure & modified status dynamically
      const tenure = calculateTenure(emp.doj);
      const modifiedStatus = getModifiedStatus(emp);
      
      // Calculate month metrics based on attendance logs for the active cycle
      const metrics = calculateAttendanceMetricsForCycle(emp.empId, attendance, activeCycle.startDate, activeCycle.endDate);

      return {
        ...emp,
        tenure,
        modifiedStatus,
        attendanceMetrics: metrics
      };
    }).filter(emp => {
      if (nameSearch && !emp.name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
      if (idSearch && !emp.empId.toLowerCase().includes(idSearch.toLowerCase())) return false;
      if (selectedDept && emp.designation !== selectedDept) return false;
      if (selectedStatus) {
        if (selectedStatus === 'Active' && emp.modifiedStatus !== 'Active') return false;
        if (selectedStatus !== 'Active' && emp.status !== selectedStatus) return false;
      }
      return true;
    });
  }, [employees, nameSearch, idSearch, selectedDept, selectedStatus, attendance, activeCycle]);

  // Operational Hierarchy Directory Tree representation
  const hierarchyTree = useMemo(() => {
    // Top levels: RCM Managers
    // Middle: LMs, RMs
    // Leaf nodes: Process Associates and Trainees
    const rcmMap: { [rcm: string]: { [lm: string]: { [rm: string]: string[] } } } = {};

    employees.forEach(emp => {
      const rcm = emp.rcm || 'No RCM Manager Assigned';
      const lm = emp.lm || 'No Line Manager Assigned';
      const rm = emp.rm || 'No Reporting Manager Assigned';

      if (!rcmMap[rcm]) rcmMap[rcm] = {};
      if (!rcmMap[rcm][lm]) rcmMap[rcm][lm] = {};
      if (!rcmMap[rcm][lm][rm]) rcmMap[rcm][lm][rm] = [];

      rcmMap[rcm][lm][rm].push(`${emp.name} (${emp.empId})`);
    });

    return rcmMap;
  }, [employees]);

  // Filtered operational hierarchy tree based on search
  const filteredHierarchyTree = useMemo(() => {
    if (!treeSearch) return hierarchyTree;

    const term = treeSearch.toLowerCase();
    const result: typeof hierarchyTree = {};

    Object.keys(hierarchyTree).forEach(rcm => {
      const rcmMatches = rcm.toLowerCase().includes(term);
      const tempRcm: { [lm: string]: { [rm: string]: string[] } } = {};

      Object.keys(hierarchyTree[rcm]).forEach(lm => {
        const lmMatches = lm.toLowerCase().includes(term);
        const tempLm: { [rm: string]: string[] } = {};

        Object.keys(hierarchyTree[rcm][lm]).forEach(rm => {
          const rmMatches = rm.toLowerCase().includes(term);
          const matchedEmps = hierarchyTree[rcm][lm][rm].filter(emp => 
            emp.toLowerCase().includes(term)
          );

          if (rmMatches || matchedEmps.length > 0 || lmMatches || rcmMatches) {
            tempLm[rm] = (rmMatches || lmMatches || rcmMatches) ? hierarchyTree[rcm][lm][rm] : matchedEmps;
          }
        });

        if (Object.keys(tempLm).length > 0 || lmMatches || rcmMatches) {
          tempRcm[lm] = tempLm;
        }
      });

      if (Object.keys(tempRcm).length > 0 || rcmMatches) {
        result[rcm] = tempRcm;
      }
    });

    return result;
  }, [hierarchyTree, treeSearch]);

  const handleExpandAll = () => {
    const allRcms = Object.keys(hierarchyTree);
    const allLms: string[] = [];
    const allRms: string[] = [];

    Object.keys(hierarchyTree).forEach(rcm => {
      Object.keys(hierarchyTree[rcm]).forEach(lm => {
        allLms.push(`${rcm}-${lm}`);
        Object.keys(hierarchyTree[rcm][lm]).forEach(rm => {
          allRms.push(`${rcm}-${lm}-${rm}`);
        });
      });
    });

    setExpandedRcms(allRcms);
    setExpandedLms(allLms);
    setExpandedRms(allRms);
  };

  const handleCollapseAll = () => {
    setExpandedRcms([]);
    setExpandedLms([]);
    setExpandedRms([]);
  };

  return (
    <div className="space-y-6" id="employee_matrix_view">
      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'roster'
              ? 'border-blue-600 text-blue-600 bg-blue-50/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Roster Database
        </button>
        <button
          onClick={() => setActiveTab('orgTree')}
          className={`flex items-center gap-2 py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'orgTree'
              ? 'border-blue-600 text-blue-600 bg-blue-50/10'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitFork className="w-4 h-4" />
          Organizational Tree
        </button>
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-6" id="roster_tab_content">
          {/* Multi-Filter Criteria Board */}
          <div className="bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Roster Filter Board</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Employee
                </button>
                <button 
                  onClick={handleResetFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-gray-500 mb-1">Search Employee Name</label>
                <input 
                  type="text"
                  placeholder="Type name..."
                  value={nameSearch}
                  onChange={e => setNameSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Search Employee ID</label>
                <input 
                  type="text"
                  placeholder="Type ID..."
                  value={idSearch}
                  onChange={e => setIdSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Role / Designation</label>
                <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <option value="">All</option>
                  {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-500 mb-1">Employment Status</label>
                <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2">
                  <option value="">All</option>
                  {uniqueStatus.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-blue-600 font-semibold mb-1">📅 Working Billing Cycle</label>
                <select value={selectedCycleId} onChange={e => setSelectedCycleId(e.target.value)} className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded-lg p-2 focus:ring-1 focus:ring-blue-400 focus:outline-hidden">
                  {billingCycles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Add Employee Form */}
          {showAddForm && (
            <form onSubmit={handleCreateEmployee} className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Employee ID (Required)</label>
                <input type="text" value={newEmpId} onChange={e => setNewEmpId(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" placeholder="e.g. RMCB 1700" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Full Name (Required)</label>
                <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" placeholder="e.g. JOHN DOE" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Date of Birth (DOB)</label>
                <input type="date" value={newDOB} onChange={e => setNewDOB(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Date of Joining (DOJ)</label>
                <input type="date" value={newDOJ} onChange={e => setNewDOJ(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Designation Role</label>
                <input type="text" value={newDesignation} onChange={e => setNewDesignation(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Reporting Manager (RM)</label>
                <input type="text" value={newRM} onChange={e => setNewRM(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Line Manager (LM)</label>
                <input type="text" value={newLM} onChange={e => setNewLM(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">RCM Manager</label>
                <input type="text" value={newRCM} onChange={e => setNewRCM(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Shift Timing</label>
                <input type="text" value={newShift} onChange={e => setNewShift(e.target.value)} className="w-full bg-white border border-gray-200 p-2 rounded-lg" />
              </div>
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Employment Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value as any)} className="w-full bg-white border border-gray-200 p-2 rounded-lg">
                  <option value="Active">Active</option>
                  <option value="New Joiner">New Joiner</option>
                  <option value="Notice">Notice</option>
                  <option value="Relieved">Relieved</option>
                  <option value="Abscond">Abscond</option>
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Register Employee</button>
              </div>
            </form>
          )}

          {/* Employees Database & Roster Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Matrix & Roster Database</h3>
              <span className="text-4xs text-slate-400 font-bold uppercase">Real-time workforce registry with automatic conversions</span>
            </div>

            <div className="overflow-x-auto max-h-120 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-500 text-4xs uppercase font-bold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">EMP ID</th>
                    <th className="py-2.5 px-4">Employee Details & DOB</th>
                    <th className="py-2.5 px-4">Role & Status</th>
                    <th className="py-2.5 px-4">Onboarding & Tenure</th>
                    <th className="py-2.5 px-4">Timings (Shift)</th>
                    <th className="py-2.5 px-3 text-center">Worked Days</th>
                    <th className="py-2.5 px-3 text-center">Leaves</th>
                    <th className="py-2.5 px-3 text-right">Shortfall</th>
                    <th className="py-2.5 px-4 text-center">Saturday Exemption Analysis</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-600">
                  {filteredEmployeesList.map((emp, idx) => {
                    const isExcused = emp.attendanceMetrics.saturdayStatus?.isExcusedFromSaturday;
                    
                    return (
                      <React.Fragment key={emp.empId}>
                        <tr 
                          className="hover:bg-blue-50/15 cursor-pointer transition-all group"
                          onClick={() => setFullscreenEmpId(emp.empId)}
                        >
                          <td className="py-2.5 px-4 font-mono text-gray-500 flex items-center gap-2">
                            <span title="Click to open Widescreen Detailed Log">
                              <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                            </span>
                            <span>{emp.empId}</span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{emp.name}</div>
                            <div className="text-3xs text-gray-400">DOB: {emp.dob || '05/15/1995'}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-medium text-slate-700">{emp.designation}</div>
                            <div className="mt-0.5 flex gap-1 items-center">
                              <span className={`inline-flex px-1.5 py-0.5 text-4xs rounded-full font-semibold border ${
                                emp.modifiedStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  : emp.status === 'New Joiner'
                                  ? 'bg-blue-50 text-blue-700 border-blue-100'
                                  : emp.status === 'Notice'
                                  ? 'bg-amber-50 text-amber-700 border-amber-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {emp.modifiedStatus}
                              </span>
                              {emp.status === 'New Joiner' && emp.modifiedStatus === 'Active' && (
                                <span className="text-4xs text-emerald-600 font-bold block" title="Automatically converted to Standard Employee after 3 months.">(Standard Auto-Promo)</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="text-slate-700 font-medium">DOJ: {emp.doj}</div>
                            <div className="text-3xs font-mono text-indigo-600 font-semibold">{emp.tenure}</div>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="text-slate-500 font-medium">{emp.shiftTiming || '09:00 AM - 06:00 PM'}</div>
                            <div className="text-3xs text-gray-400">8.0 hrs/day expected</div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">{emp.attendanceMetrics.workedDays}d</td>
                          <td className="py-2.5 px-3 text-center font-mono text-amber-600 font-semibold">{emp.attendanceMetrics.leaves}d</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{emp.attendanceMetrics.totalShortfall}h</td>
                          <td className="py-2.5 px-4 text-center">
                            <div 
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-3xs font-bold rounded-full border transition-all shadow-3xs hover:scale-102 ${
                                isExcused
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                  : 'bg-amber-50 text-amber-700 border-amber-150'
                              }`}
                            >
                              {isExcused ? (
                                <span className="flex items-center gap-1">🎉 Excused Holiday</span>
                              ) : (
                                <span className="flex items-center gap-1">⚠️ Attendance Required</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => removeEmployee(emp.empId)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove Employee from Roster"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {filteredEmployeesList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-gray-400">No Roster Profiles retrieved</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'orgTree' && (
        <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-xs" id="org_tree_tab_content">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GitFork className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider font-sans">Operational Pipeline Directory Hierarchy</h3>
              </div>
              <p className="text-3xs text-slate-500 leading-relaxed max-w-2xl">
                Explore a folder-style, nested representative directory tree. Click Process segments, Sub-pipelines, or Reporting Managers to toggle expansion. Use the instant search box to locate individuals or branches.
              </p>
            </div>
            
            {/* Tree Utilities */}
            <div className="flex flex-wrap items-center gap-2 text-3xs">
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-lg transition-all border border-indigo-150 cursor-pointer uppercase tracking-wider"
              >
                📂 Expand All
              </button>
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold rounded-lg transition-all border border-slate-200 cursor-pointer uppercase tracking-wider"
              >
                📁 Collapse All
              </button>
            </div>
          </div>

          {/* Tree Filter Search Row */}
          <div className="mb-6">
            <div className="relative w-full max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search managers, reps, or IDs in directory..."
                value={treeSearch}
                onChange={(e) => setTreeSearch(e.target.value)}
                className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 p-2 pl-9 pr-8 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-3xs"
              />
              {treeSearch && (
                <button
                  onClick={() => setTreeSearch('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            {treeSearch && (
              <div className="text-4xs text-slate-400 mt-1.5 font-bold font-mono">
                🔍 Filter Active: Showing matching tree branches only (auto-expanded).
              </div>
            )}
          </div>

          {/* Core Interactive Tree View */}
          <div className="bg-slate-50/30 border border-slate-150 rounded-2xl p-6 overflow-hidden">
            <div className="space-y-4 animate-fade-in font-sans">
              {Object.keys(filteredHierarchyTree).length > 0 ? (
                Object.keys(filteredHierarchyTree).sort().map((rcm) => {
                  const rcmEmployeesCount = Object.values(filteredHierarchyTree[rcm]).reduce(
                    (sum: number, lmObj) => sum + (Object.values(lmObj) as string[][]).reduce((sum2: number, arr) => sum2 + arr.length, 0),
                    0
                  );
                  const isRcmExpanded = expandedRcms.includes(rcm) || !!treeSearch;

                  return (
                    <div key={rcm} className="group/rcm select-none">
                      {/* Level 1: RCM Node */}
                      <div
                        onClick={() => {
                          if (treeSearch) return; // ignore toggles during search for ease of use
                          setExpandedRcms(prev =>
                            prev.includes(rcm) ? prev.filter(x => x !== rcm) : [...prev, rcm]
                          );
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                          isRcmExpanded 
                            ? 'bg-blue-50/80 border border-blue-100 shadow-3xs' 
                            : 'hover:bg-slate-100/70 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-blue-500 transition-transform duration-200 ${isRcmExpanded ? 'rotate-90' : 'rotate-0'}`}>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                          {isRcmExpanded ? (
                            <FolderOpen className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Folder className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-xs font-black text-blue-950 uppercase tracking-wide font-mono">
                            RCM Manager: {rcm}
                          </span>
                        </div>
                        <span className="text-4xs font-mono font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                          {rcmEmployeesCount} active reps
                        </span>
                      </div>

                      {/* Level 1 Children (Line Managers) */}
                      {isRcmExpanded && (
                        <div className="relative pl-6 border-l border-dashed border-slate-200 ml-4.5 mt-2 space-y-3">
                          {Object.keys(filteredHierarchyTree[rcm]).sort().map((lm) => {
                            const lmEmployeesCount = (Object.values(filteredHierarchyTree[rcm][lm]) as string[][]).reduce(
                              (sum: number, arr) => sum + arr.length,
                              0
                            );
                            const lmKey = `${rcm}-${lm}`;
                            const isLmExpanded = expandedLms.includes(lmKey) || !!treeSearch;

                            return (
                              <div key={lm} className="relative group/lm">
                                {/* Horizontal Branch Line */}
                                <div className="absolute -left-6 top-3.5 w-6 h-px border-t border-dashed border-slate-200" />

                                {/* Level 2: LM Node */}
                                <div
                                  onClick={() => {
                                    if (treeSearch) return;
                                    setExpandedLms(prev =>
                                      prev.includes(lmKey) ? prev.filter(x => x !== lmKey) : [...prev, lmKey]
                                    );
                                  }}
                                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                                    isLmExpanded 
                                      ? 'bg-purple-50/70 border border-purple-100/50' 
                                      : 'hover:bg-slate-100/50 border border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`text-purple-500 transition-transform duration-200 ${isLmExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                    {isLmExpanded ? (
                                      <FolderOpen className="w-3.5 h-3.5 text-purple-500" />
                                    ) : (
                                      <Folder className="w-3.5 h-3.5 text-purple-400" />
                                    )}
                                    <span className="text-xs font-black text-slate-800 tracking-wide font-sans">
                                      Line Manager: {lm}
                                    </span>
                                  </div>
                                  <span className="text-4xs font-mono font-bold text-purple-700 bg-purple-100/60 px-1.5 py-0.5 rounded border border-purple-150">
                                    {lmEmployeesCount} reps
                                  </span>
                                </div>

                                {/* Level 2 Children (Reporting Managers) */}
                                {isLmExpanded && (
                                  <div className="relative pl-6 border-l border-dashed border-slate-200 ml-3.5 mt-2 space-y-3">
                                    {Object.keys(filteredHierarchyTree[rcm][lm]).sort().map((rm) => {
                                      const rmEmployeesCount = filteredHierarchyTree[rcm][lm][rm].length;
                                      const rmKey = `${rcm}-${lm}-${rm}`;
                                      const isRmExpanded = expandedRms.includes(rmKey) || !!treeSearch;

                                      return (
                                        <div key={rm} className="relative group/rm">
                                          {/* Horizontal Branch Line */}
                                          <div className="absolute -left-6 top-3 w-6 h-px border-t border-dashed border-slate-200" />

                                          {/* Level 3: RM Node */}
                                          <div
                                            onClick={() => {
                                              if (treeSearch) return;
                                              setExpandedRms(prev =>
                                                prev.includes(rmKey) ? prev.filter(x => x !== rmKey) : [...prev, rmKey]
                                              );
                                            }}
                                            className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-all ${
                                              isRmExpanded
                                                ? 'bg-indigo-50/50 border border-indigo-100/40'
                                                : 'hover:bg-slate-100/40 border border-transparent'
                                            }`}
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-indigo-500 transition-transform duration-200 ${isRmExpanded ? 'rotate-90' : 'rotate-0'}`}>
                                                <ChevronRight className="w-3 h-3" />
                                              </span>
                                              {isRmExpanded ? (
                                                <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                                              ) : (
                                                <Folder className="w-3.5 h-3.5 text-indigo-400" />
                                              )}
                                              <span className="text-2xs font-extrabold text-indigo-950 uppercase tracking-wide">
                                                RM: {rm}
                                              </span>
                                            </div>
                                            <span className="text-4xs font-mono font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">
                                              {rmEmployeesCount} reps
                                            </span>
                                          </div>

                                          {/* Level 3 Children (Representatives / Leaf Nodes) */}
                                          {isRmExpanded && (
                                            <div className="relative pl-6 border-l border-dashed border-slate-200 ml-3 mt-1.5 space-y-1">
                                              {rmEmployeesCount > 0 ? (
                                                filteredHierarchyTree[rcm][lm][rm].map((pName, index) => {
                                                  // Find designation matching
                                                  const namePart = pName.split(' (')[0];
                                                  const idPart = pName.split('(')[1]?.replace(')', '') || '';
                                                  const matchedEmp = employees.find(e => e.empId === idPart);
                                                  
                                                  return (
                                                    <div key={index} className="relative flex items-center justify-between py-1 px-2.5 rounded hover:bg-emerald-50/50 group/leaf transition-all">
                                                      {/* Horizontal Branch Line */}
                                                      <div className="absolute -left-6 top-3 w-6 h-px border-t border-dashed border-slate-200" />

                                                      <div className="flex items-center gap-1.5 text-2xs text-slate-700 font-semibold">
                                                        <User className="w-3 h-3 text-emerald-500" />
                                                        <span>{pName}</span>
                                                        {matchedEmp && (
                                                          <span className="text-4xs font-mono font-bold text-slate-400 border border-slate-200 px-1 py-0.2 rounded uppercase ml-1.5 bg-white">
                                                            {matchedEmp.designation}
                                                          </span>
                                                        )}
                                                      </div>

                                                      {/* Double Inspect Link */}
                                                      <div className="opacity-0 group-hover/leaf:opacity-100 transition-opacity flex items-center">
                                                        <button
                                                          onClick={() => {
                                                            setNameSearch(namePart);
                                                            setActiveTab('roster');
                                                          }}
                                                          className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-white border border-blue-200 px-2 py-0.5 rounded shadow-3xs cursor-pointer flex items-center gap-0.5 uppercase tracking-wider"
                                                        >
                                                          Inspect <ArrowRight className="w-2.5 h-2.5" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })
                                              ) : (
                                                <div className="relative py-1 pl-2.5">
                                                  <div className="absolute -left-6 top-3 w-6 h-px border-t border-dashed border-slate-200" />
                                                  <span className="text-4xs text-slate-400 block font-mono italic">No representatives assigned</span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <span className="text-xs text-slate-400 font-mono italic">
                    No directory records found matching the search criteria.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen spreadsheet view modal */}
      {fullscreenEmp && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs transition-all duration-200">
          <div className="bg-white w-full max-w-7xl h-[92vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg text-white">
                  <Maximize2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-blue-400">Detailed Attendance Log (Widescreen Mode)</h3>
                  <p className="text-3xs text-slate-300 font-medium mt-0.5">
                    Employee: <span className="text-white font-bold">{fullscreenEmp.name} ({fullscreenEmp.empId})</span> • Designation: <span className="text-white font-bold">{fullscreenEmp.designation}</span> • Shift: <span className="text-white font-bold">{fullscreenEmp.shiftTiming}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFullscreenEmpId(null);
                  setModalMarkingFilter('');
                  setModalDateSearch('');
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs transition-colors border border-slate-700 cursor-pointer"
              >
                ✕ Close (ESC)
              </button>
            </div>

            {/* Modal Content container */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-5">
              
              {/* Rule Card Info */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detailed Attendance Log &amp; Saturday Exemption Analysis</h4>
                  </div>
                  <p className="text-3xs text-slate-500 leading-relaxed max-w-2xl">
                    Rule: Excuse Saturday if weekdays worked exceeds expected by daily 1hr extension or overall +5 hours extra.
                  </p>
                </div>
                
                {/* Scorecard metrics */}
                <div className="flex flex-wrap gap-3 items-center text-xs font-mono w-full lg:w-auto">
                  <div className="px-4 py-2 bg-slate-50 border border-slate-150 rounded-lg min-w-32">
                    <span className="text-4xs text-slate-400 block font-sans font-bold uppercase">Weekday Overtime</span>
                    <span className="font-extrabold text-indigo-600 text-sm">{fullscreenEmp.attendanceMetrics.saturdayStatus?.extraHoursWorked?.toFixed(2) || 0} hrs</span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 border border-slate-150 rounded-lg min-w-32">
                    <span className="text-4xs text-slate-400 block font-sans font-bold uppercase">Daily 1hr Met</span>
                    <span className={`font-extrabold text-sm ${fullscreenEmp.attendanceMetrics.saturdayStatus?.extendedOneHourDaily ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {fullscreenEmp.attendanceMetrics.saturdayStatus?.extendedOneHourDaily ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 border border-slate-150 rounded-lg min-w-32">
                    <span className="text-4xs text-slate-400 block font-sans font-bold uppercase">Overall 5hr Met</span>
                    <span className={`font-extrabold text-sm ${fullscreenEmp.attendanceMetrics.saturdayStatus?.overallExtraFiveHours ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {fullscreenEmp.attendanceMetrics.saturdayStatus?.overallExtraFiveHours ? '✅ Yes' : '❌ No'}
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-50 border border-slate-150 rounded-lg min-w-44">
                    <span className="text-4xs text-slate-400 block font-sans font-bold uppercase">Saturday Off Status</span>
                    {fullscreenEmp.attendanceMetrics.saturdayStatus?.isExcusedFromSaturday ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold font-sans text-3xs uppercase bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-150 mt-1">
                        🎉 Excused Holiday
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-extrabold font-sans text-3xs uppercase bg-amber-50 px-2.5 py-1 rounded-md border border-amber-150 mt-1">
                        ⚠️ Attendance Required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Toolbar filters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      placeholder="Search DATE (e.g., 26-Mar)..."
                      value={modalDateSearch}
                      onChange={(e) => setModalDateSearch(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 p-1.5 pl-8 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <select
                    value={modalMarkingFilter}
                    onChange={(e) => setModalMarkingFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">All Markings</option>
                    <option value="X">P / X (Present)</option>
                    <option value="L">L / CL / SL (Leave)</option>
                    <option value="H">H (Holiday)</option>
                  </select>
                </div>
                <div className="text-3xs text-slate-400 font-semibold font-mono">
                  ACTIVE BILLING CYCLE: {activeCycle.label}
                </div>
              </div>

              {/* Main Spreadsheet Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-200 font-bold uppercase border-b border-slate-300">
                        <th className="py-3 px-4 border-r border-slate-750">DATE</th>
                        <th className="py-3 px-4 border-r border-slate-750">EMP NO</th>
                        <th className="py-3 px-4 border-r border-slate-750">EMPLOYEES NAME</th>
                        <th className="py-3 px-4 border-r border-slate-750">DESIGNATION</th>
                        <th className="py-3 px-4 text-center border-r border-slate-750">MARKINGS</th>
                        <th className="py-3 px-4 border-r border-slate-750">IN TIME</th>
                        <th className="py-3 px-4 text-right border-r border-slate-750">TOTAL WRK HRS</th>
                        <th className="py-3 px-4 text-right border-r border-slate-750">EXACT WRK HRS</th>
                        <th className="py-3 px-4 text-right border-r border-slate-750">BREAK HRS</th>
                        <th className="py-3 px-4 text-right border-r border-slate-750">STIPULATED TIME</th>
                        <th className="py-3 px-4 text-center bg-blue-900 text-blue-100 font-extrabold border-r border-blue-800">EXTRA WORK HRS</th>
                        <th className="py-3 px-4 text-center bg-blue-900 text-blue-100 font-extrabold border-r border-blue-800">ALLOWED BRK</th>
                        <th className="py-3 px-4 text-center bg-blue-900 text-blue-100 font-extrabold border-r border-blue-800">EXCESS BREAK</th>
                        <th className="py-3 px-4 text-center bg-rose-900 text-rose-100 font-extrabold">SHORTFALL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-mono text-slate-600 text-xs">
                      {fullscreenLogs
                        .filter(log => {
                          const markingType = log.markings || (log.onLeave ? 'L' : 'X');
                          if (modalDateSearch && !log.date.toLowerCase().includes(modalDateSearch.toLowerCase())) {
                            return false;
                          }
                          if (modalMarkingFilter) {
                            if (modalMarkingFilter === 'X' && markingType !== 'X' && markingType !== 'P') return false;
                            if (modalMarkingFilter === 'L' && markingType !== 'L' && markingType !== 'CL' && markingType !== 'SL') return false;
                            if (modalMarkingFilter === 'H' && markingType !== 'H') return false;
                          }
                          return true;
                        })
                        .map((log, lidx) => {
                          const markingType = log.markings || (log.onLeave ? 'L' : 'X');
                          const fallbackShortfallStr = (() => {
                            if (log.shortfallStr) return log.shortfallStr;
                            const sf = Math.max(0, (log.expectedHours || 8) - log.hoursWorked);
                            if (sf === 0) return '0:00';
                            const hrs = Math.floor(sf);
                            const mins = Math.round((sf - hrs) * 60);
                            return `${hrs}:${String(mins).padStart(2, '0')}`;
                          })();

                          return (
                            <tr key={log.id || lidx} className="hover:bg-blue-50/40 transition-colors">
                              <td className="py-2.5 px-4 border-r border-slate-200 font-bold text-slate-900">{log.date}</td>
                              <td className="py-2.5 px-4 border-r border-slate-200 text-slate-400 font-medium">{log.empId}</td>
                              <td className="py-2.5 px-4 border-r border-slate-200 font-sans font-semibold text-slate-800">{log.empName || fullscreenEmp.name}</td>
                              <td className="py-2.5 px-4 border-r border-slate-200 font-sans text-slate-500">{log.designation || fullscreenEmp.designation}</td>
                              <td className="py-2.5 px-4 text-center border-r border-slate-200">
                                <span className={`inline-block px-2.5 py-1 rounded-md text-3xs font-extrabold uppercase border ${
                                  markingType === 'X' || markingType === 'P'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                                    : markingType === 'L' || markingType === 'CL' || markingType === 'SL'
                                    ? 'bg-amber-50 text-amber-700 border-amber-150'
                                    : 'bg-rose-50 text-rose-700 border-rose-150'
                                  }`}>
                                  {markingType}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 border-r border-slate-200 text-slate-500">{log.inTime || 'N/A'}</td>
                              <td className="py-2.5 px-4 text-right border-r border-slate-200 text-slate-700">{log.totalWrkHrsStr || '-'}</td>
                              <td className="py-2.5 px-4 text-right border-r border-slate-200 font-bold text-slate-900">{log.exactWrkHrsStr || `${log.hoursWorked}h`}</td>
                              <td className="py-2.5 px-4 text-right border-r border-slate-200 text-slate-500">{log.breakHrsStr || `${log.hoursBreak}h`}</td>
                              <td className="py-2.5 px-4 text-right border-r border-slate-200 text-slate-400 font-medium">{log.stipulatedTimeStr || `${log.expectedHours}h`}</td>
                              <td className="py-2.5 px-4 text-center bg-blue-50/40 text-blue-900 border-r border-slate-200 font-bold">{log.extraWorkHrsStr || '0:00'}</td>
                              <td className="py-2.5 px-4 text-center bg-blue-50/40 text-blue-900 border-r border-slate-200 font-bold">{log.allowedBrkStr || '1:00'}</td>
                              <td className="py-2.5 px-4 text-center bg-blue-50/40 text-blue-900 border-r border-slate-200 font-extrabold">{log.excessBreakStr || '0:00'}</td>
                              <td className="py-2.5 px-4 text-center bg-rose-50/40 text-rose-900 font-extrabold">{fallbackShortfallStr}</td>
                            </tr>
                          );
                        })}
                      {fullscreenLogs.length === 0 && (
                        <tr>
                          <td colSpan={14} className="text-center py-10 text-slate-400 font-sans text-xs">
                            No spreadsheet logs found for this billing month.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-t border-slate-200 shadow-inner">
              <div className="flex gap-4 text-3xs font-mono text-slate-500 font-bold uppercase">
                <span>Expected Days: <strong className="text-slate-800">{fullscreenEmp.attendanceMetrics.expectedDays}d</strong></span>
                <span>Worked Days: <strong className="text-slate-800">{fullscreenEmp.attendanceMetrics.workedDays}d</strong></span>
                <span>Leaves/Absents: <strong className="text-amber-600">{fullscreenEmp.attendanceMetrics.leaves}d</strong></span>
                <span>Shortfalls: <strong className="text-rose-600">{fullscreenEmp.attendanceMetrics.totalShortfall}h</strong></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFullscreenEmpId(null);
                  setModalMarkingFilter('');
                  setModalDateSearch('');
                }}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                Close Fullscreen Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
