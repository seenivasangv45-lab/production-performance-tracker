import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Employee, TargetMap, EmployeeProcess, ProductionRecord, AttendanceRecord, RampUpRule, Ticket, UploadedFileLog, ManualAdditionLog, QualityRollup, QualityAuditRecord } from '../types';
import { seedEmployees, seedTargets, seedEmployeeProcesses, seedRampUpRules, generateProductionAndAttendance, seedQualityRollups, seedQualityAudits } from '../data/seedData';
import { resolveTargetEntry } from '../utils/calculations';

interface AppContextType {
  employees: Employee[];
  targets: TargetMap[];
  employeeProcesses: EmployeeProcess[];
  production: ProductionRecord[];
  attendance: AttendanceRecord[];
  rampUpRules: RampUpRule[];
  qualityRollups: QualityRollup[];
  qualityAudits: QualityAuditRecord[];
  
  // Actions
  addEmployee: (emp: Employee) => void;
  removeEmployee: (empId: string) => void;
  clearEmployees: () => void;
  bulkUploadEmployees: (emps: Employee[]) => void;

  addTarget: (target: TargetMap) => void;
  removeTarget: (pms: string, processName: string, subProcessName: string) => void;
  clearTargets: () => void;
  bulkUploadTargets: (targets: TargetMap[]) => void;

  addEmployeeProcess: (ep: EmployeeProcess) => void;
  removeEmployeeProcess: (empId: string, pms: string, processName: string, subProcessName: string) => void;
  clearEmployeeProcesses: () => void;
  bulkUploadEmployeeProcesses: (eps: EmployeeProcess[]) => void;

  addProductionRecord: (rec: ProductionRecord) => void;
  removeProductionRecord: (id: string) => void;
  clearProduction: () => void;
  bulkUploadProduction: (recs: ProductionRecord[]) => void;

  addAttendanceRecord: (rec: AttendanceRecord) => void;
  removeAttendanceRecord: (id: string) => void;
  clearAttendance: () => void;
  bulkUploadAttendance: (recs: AttendanceRecord[]) => void;

  clearQualityRollups: () => void;
  bulkUploadQualityRollups: (recs: QualityRollup[]) => void;
  clearQualityAudits: () => void;
  bulkUploadQualityAudits: (recs: QualityAuditRecord[]) => void;

  addRampUpRule: (rule: RampUpRule) => void;
  removeRampUpRule: (empId: string) => void;
  clearRampUpRules: () => void;

  tickets: Ticket[];
  addTicket: (tkt: Ticket) => void;
  approveTicket: (id: string) => void;
  rejectTicket: (id: string) => void;
  clearTickets: () => void;

  // Local Database Logs & Backup actions
  uploadedFiles: UploadedFileLog[];
  manualAdditions: ManualAdditionLog[];
  logUploadedFile: (filename: string, type: string, size: number, recordCount: number, status?: 'Success' | 'Warning' | 'Error') => void;
  logManualAddition: (type: string, key: string, details: string) => void;
  clearDatabaseLogs: () => void;
  restoreDatabase: (backupData: any) => Promise<boolean>;

  resetAllData: () => void;
  
  // Alert Actions
  alertModal: { isOpen: boolean; message: string; title: string } | null;
  showAlert: (message: string, title?: string) => void;
  closeAlert: () => void;

  // Auth state & actions
  currentUser: string | null;
  currentUserRole: string | null;
  setCurrentUserRole: (role: string | null) => void;
  loginUser: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  registerUser: (username: string, password: string, role?: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
  logoutUser: () => Promise<void>;

  // LocalStorage migration properties
  hasLocalStorageData: boolean;
  importLocalStorageData: () => Promise<void>;
}

const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read from localStorage for key "${key}":`, error);
    return null;
  }
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to write to localStorage for key "${key}":`, error);
  }
};

const safeRemoveItem = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove from localStorage for key "${key}":`, error);
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targets, setTargets] = useState<TargetMap[]>([]);
  const [employeeProcesses, setEmployeeProcesses] = useState<EmployeeProcess[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [rampUpRules, setRampUpRules] = useState<RampUpRule[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileLog[]>([]);
  const [manualAdditions, setManualAdditions] = useState<ManualAdditionLog[]>([]);
  const [qualityRollups, setQualityRollups] = useState<QualityRollup[]>([]);
  const [qualityAudits, setQualityAudits] = useState<QualityAuditRecord[]>([]);
  
  // Alert modal state
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; title: string } | null>(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [hasLocalStorageData, setHasLocalStorageData] = useState(false);

  // Check backend session and local storage migration status on mount
  useEffect(() => {
    const checkSessionAndMigration = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.loggedIn) {
            setCurrentUser(data.username);
            setCurrentUserRole(data.role);
          }
        }
      } catch (e) {
        console.error('Failed to fetch session from backend:', e);
      }

      // Check if there are tracker keys in localStorage to import
      try {
        const keys = Object.keys(localStorage);
        const hasKeys = keys.some(
          (k) =>
            k.startsWith('tracker_') &&
            k !== 'tracker_current_user' &&
            k !== 'tracker_current_user_role'
        );
        setHasLocalStorageData(hasKeys);
      } catch (e) {
        console.warn('Could not read localStorage for migration:', e);
      }
    };

    checkSessionAndMigration();
  }, []);

  const updateCurrentUserRole = (role: string | null) => {
    setCurrentUserRole(role);
    // Since we are moving entirely to backend storage, we don't save to localStorage anymore.
    // If we wanted to persist role updates, we would create a PUT /api/users/:username endpoint,
    // but the role is already verified from backend-session.
  };

  const loginUser = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.username);
        setCurrentUserRole(data.role);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      return { success: false, message: 'Server connection error. Please try again.' };
    }
  };

  const registerUser = async (username: string, password: string, role = 'User(Production)') => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.username);
        setCurrentUserRole(data.role);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      return { success: false, message: 'Server connection error. Please try again.' };
    }
  };

  const resetPassword = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      return { success: false, message: 'Server connection error. Please try again.' };
    }
  };

  const logoutUser = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed:', e);
    }
    setCurrentUser(null);
    setCurrentUserRole(null);
  };

  const importLocalStorageData = async () => {
    try {
      const updates: Record<string, any> = {};
      const keysToImport = [
        'tracker_employees',
        'tracker_targets',
        'tracker_employee_processes',
        'tracker_production',
        'tracker_attendance',
        'tracker_ramp_rules',
        'tracker_tickets',
        'tracker_uploaded_files',
        'tracker_manual_additions',
        'tracker_users'
      ];

      for (const key of keysToImport) {
        const valStr = localStorage.getItem(key);
        if (valStr) {
          try {
            updates[key] = JSON.parse(valStr);
          } catch (e) {
            console.error(`Error parsing localStorage key ${key}:`, e);
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        showAlert('No local data found to import.', 'Import Cancelled');
        return;
      }

      const res = await fetch('/api/store/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!res.ok) {
        throw new Error('Server returned error on bulk import');
      }

      // Success! Clear the keys so we don't prompt again
      for (const key of keysToImport) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem('tracker_current_user');
      localStorage.removeItem('tracker_current_user_role');
      
      setHasLocalStorageData(false);
      showAlert('All local storage data has been successfully imported to the server database!', 'Import Complete');
      
      // Reload page to re-fetch pristine data from server
      window.location.reload();
    } catch (err: any) {
      console.error('Import from local storage failed:', err);
      showAlert('Failed to import local data: ' + err.message, 'Import Error');
    }
  };

  const showAlert = (message: string, title = 'Operational Rule Warning') => {
    setAlertModal({ isOpen: true, message, title });
  };

  const closeAlert = () => {
    setAlertModal(null);
  };

  // Seed list of representative tickets
  const seedTickets: Ticket[] = [
    {
      id: 'TKT-1001',
      requestor: 'Srinivasan R',
      requestorRole: 'LM',
      ticketType: 'Data Correction',
      empId: 'RMCB 1027',
      empName: 'PRAJEESH R',
      productionDate: '2026-06-15',
      fieldToChange: 'achieved',
      oldValue: 80,
      newValue: 110,
      reason: 'Client audit clearance completed; missing logs updated from PM system.',
      status: 'Pending',
      createdAt: '2026-06-29 09:15',
    },
    {
      id: 'TKT-1002',
      requestor: 'Meenakshi N',
      requestorRole: 'LM',
      ticketType: 'Data Correction',
      empId: 'RMCB 1048',
      empName: 'SNEHA D',
      productionDate: '2026-06-18',
      fieldToChange: 'accuracy',
      oldValue: 88,
      newValue: 98,
      reason: 'Audited sample contains false errors cleared in client rebuttal process.',
      status: 'Approved',
      createdAt: '2026-06-28 14:30',
      reviewedAt: '2026-06-28',
    },
    {
      id: 'TKT-1003',
      requestor: 'Suseela R',
      requestorRole: 'RM',
      ticketType: 'Target Change',
      empId: 'RMCB 1125',
      empName: 'MATHUMITHA S',
      productionDate: '2026-06-20',
      fieldToChange: 'target',
      oldValue: 120,
      newValue: 60,
      reason: 'Mid-shift medical emergency departure approved. Target scaled proportionally.',
      status: 'Rejected',
      createdAt: '2026-06-27 11:20',
      reviewedAt: '2026-06-27',
    }
  ];

  // Load from server database or fall back to LocalStorage/seed on mount
  useEffect(() => {
    const loadServerData = async () => {
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('Failed to fetch data from server');
        const serverData = await res.json();
        
        const hasServerData = serverData && Object.keys(serverData).length > 0;
        
        let localEmps = hasServerData ? serverData['tracker_employees'] : null;
        let localTargets = hasServerData ? serverData['tracker_targets'] : null;
        let localEmpProcs = hasServerData ? serverData['tracker_employee_processes'] : null;
        let localProd = hasServerData ? serverData['tracker_production'] : null;
        let localAtt = hasServerData ? serverData['tracker_attendance'] : null;
        let localRamps = hasServerData ? serverData['tracker_ramp_rules'] : null;
        let localTickets = hasServerData ? serverData['tracker_tickets'] : null;
        let localUsers = hasServerData ? serverData['tracker_users'] : null;
        let localUploadedFiles = hasServerData ? serverData['tracker_uploaded_files'] : null;
        let localManualAdditions = hasServerData ? serverData['tracker_manual_additions'] : null;
        let localQualityRollups = hasServerData ? serverData['tracker_quality_rollups'] : null;
        let localQualityAudits = hasServerData ? serverData['tracker_quality_audits'] : null;

        if (!hasServerData) {
          // Fallback to local storage if present
          const lsEmps = safeGetItem('tracker_employees');
          const lsTargets = safeGetItem('tracker_targets');
          const lsEmpProcs = safeGetItem('tracker_employee_processes');
          const lsProd = safeGetItem('tracker_production');
          const lsAtt = safeGetItem('tracker_attendance');
          const lsRamps = safeGetItem('tracker_ramp_rules');
          const lsTickets = safeGetItem('tracker_tickets');
          const lsUsers = safeGetItem('tracker_users');
          const lsUploadedFiles = safeGetItem('tracker_uploaded_files');
          const lsManualAdditions = safeGetItem('tracker_manual_additions');
          const lsQualityRollups = safeGetItem('tracker_quality_rollups');
          const lsQualityAudits = safeGetItem('tracker_quality_audits');
          
          if (lsEmps && lsTargets && lsEmpProcs && lsProd && lsAtt) {
            localEmps = JSON.parse(lsEmps);
            localTargets = JSON.parse(lsTargets);
            localEmpProcs = JSON.parse(lsEmpProcs);
            localProd = JSON.parse(lsProd);
            localAtt = JSON.parse(lsAtt);
            localRamps = lsRamps ? JSON.parse(lsRamps) : [];
            localTickets = lsTickets ? JSON.parse(lsTickets) : seedTickets;
            localUsers = lsUsers ? JSON.parse(lsUsers) : null;
            localUploadedFiles = lsUploadedFiles ? JSON.parse(lsUploadedFiles) : [];
            localManualAdditions = lsManualAdditions ? JSON.parse(lsManualAdditions) : [];
            localQualityRollups = lsQualityRollups ? JSON.parse(lsQualityRollups) : [];
            localQualityAudits = lsQualityAudits ? JSON.parse(lsQualityAudits) : [];
          }
        }

        if (localEmps && localTargets && localEmpProcs && localProd && localAtt) {
          setEmployees(typeof localEmps === 'string' ? JSON.parse(localEmps) : localEmps);
          setTargets(typeof localTargets === 'string' ? JSON.parse(localTargets) : localTargets);
          setEmployeeProcesses(typeof localEmpProcs === 'string' ? JSON.parse(localEmpProcs) : localEmpProcs);
          
          const parsedProd = typeof localProd === 'string' ? JSON.parse(localProd) : localProd;
          // Standardize date strings for any loaded production records
          const sanitizedProd = parsedProd.map((p: any) => {
            if (!p.date) return p;
            const cleanStr = p.date.trim();
            const isoReg = /^\d{4}-\d{2}-\d{2}$/;
            if (isoReg.test(cleanStr)) {
              return p;
            }
            
            const monthMap: { [key: string]: string } = {
              jan: '01', january: '01',
              feb: '02', february: '02',
              mar: '03', march: '03',
              apr: '04', april: '04',
              may: '05',
              jun: '06', june: '06',
              jul: '07', july: '07',
              aug: '08', august: '08',
              sep: '09', september: '09',
              oct: '10', october: '10',
              nov: '11', november: '11',
              dec: '12', december: '12'
            };
            
            let parts: string[] = [];
            if (cleanStr.includes('-')) parts = cleanStr.split('-');
            else if (cleanStr.includes('/')) parts = cleanStr.split('/');
            else if (cleanStr.includes(' ')) parts = cleanStr.split(' ');
            
            if (parts.length === 3) {
              let year = '';
              let month = '';
              let day = '';
              
              if (parts[0].length === 4 && !isNaN(Number(parts[0]))) {
                year = parts[0];
                month = parts[1];
                day = parts[2];
              } else {
                const p0Lower = parts[0].toLowerCase();
                const p1Lower = parts[1].toLowerCase();
                
                if (monthMap[p1Lower]) {
                  day = parts[0];
                  month = monthMap[p1Lower];
                  year = parts[2];
                } else if (monthMap[p0Lower]) {
                  month = monthMap[p0Lower];
                  day = parts[1];
                  year = parts[2];
                } else {
                  const n0 = parseInt(parts[0], 10);
                  const n1 = parseInt(parts[1], 10);
                  if (n0 > 12) {
                    day = parts[0];
                    month = parts[1];
                  } else if (n1 > 12) {
                    month = parts[0];
                    day = parts[1];
                  } else {
                    month = parts[0];
                    day = parts[1];
                  }
                  year = parts[2];
                }
              }
              
              if (year.length === 2) {
                const yrNum = parseInt(year, 10);
                if (yrNum >= 0 && yrNum <= 99) {
                  year = '20' + year.padStart(2, '0');
                }
              }
              
              month = month.padStart(2, '0');
              day = day.padStart(2, '0');
              
              return { ...p, date: `${year}-${month}-${day}` };
            }
            
            return p;
          });
          
          setProduction(sanitizedProd);
          setAttendance(typeof localAtt === 'string' ? JSON.parse(localAtt) : localAtt);
          setRampUpRules(typeof localRamps === 'string' ? JSON.parse(localRamps) : (localRamps || []));
          setTickets(typeof localTickets === 'string' ? JSON.parse(localTickets) : (localTickets || seedTickets));
          setUploadedFiles(localUploadedFiles ? (typeof localUploadedFiles === 'string' ? JSON.parse(localUploadedFiles) : localUploadedFiles) : []);
          setManualAdditions(localManualAdditions ? (typeof localManualAdditions === 'string' ? JSON.parse(localManualAdditions) : localManualAdditions) : []);
          
          const parsedRollups = localQualityRollups ? (typeof localQualityRollups === 'string' ? JSON.parse(localQualityRollups) : localQualityRollups) : [];
          const parsedAudits = localQualityAudits ? (typeof localQualityAudits === 'string' ? JSON.parse(localQualityAudits) : localQualityAudits) : [];
          
          setQualityRollups(parsedRollups.length > 0 ? parsedRollups : seedQualityRollups);
          setQualityAudits(parsedAudits.length > 0 ? parsedAudits : seedQualityAudits);

          if (localUsers) {
            safeSetItem('tracker_users', typeof localUsers === 'string' ? localUsers : JSON.stringify(localUsers));
          }

          // Back-sync to server if it didn't have data yet
          if (!hasServerData) {
            const bulkPayload = {
              tracker_employees: localEmps,
              tracker_targets: localTargets,
              tracker_employee_processes: localEmpProcs,
              tracker_production: sanitizedProd,
              tracker_attendance: typeof localAtt === 'string' ? JSON.parse(localAtt) : localAtt,
              tracker_ramp_rules: typeof localRamps === 'string' ? JSON.parse(localRamps) : (localRamps || []),
              tracker_tickets: typeof localTickets === 'string' ? JSON.parse(localTickets) : (localTickets || seedTickets),
              tracker_users: localUsers ? (typeof localUsers === 'string' ? JSON.parse(localUsers) : localUsers) : JSON.parse(safeGetItem('tracker_users') || '[]'),
              tracker_uploaded_files: localUploadedFiles ? (typeof localUploadedFiles === 'string' ? JSON.parse(localUploadedFiles) : localUploadedFiles) : [],
              tracker_manual_additions: localManualAdditions ? (typeof localManualAdditions === 'string' ? JSON.parse(localManualAdditions) : localManualAdditions) : [],
              tracker_quality_rollups: parsedRollups.length > 0 ? parsedRollups : seedQualityRollups,
              tracker_quality_audits: parsedAudits.length > 0 ? parsedAudits : seedQualityAudits
            };
            fetch('/api/data/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: bulkPayload })
            }).catch(e => console.error('Bulk fallback synchronization failed:', e));
          }
        } else {
          // Seed initial data
          const initialEmps = [...seedEmployees];
          const initialTargets = [...seedTargets];
          const initialEmpProcs = [...seedEmployeeProcesses];
          const initialRamps = [...seedRampUpRules];
          
          const { production: generatedProd, attendance: generatedAtt } = generateProductionAndAttendance(
            initialEmps,
            initialEmpProcs,
            initialTargets,
            initialRamps
          );

          setEmployees(initialEmps);
          setTargets(initialTargets);
          setEmployeeProcesses(initialEmpProcs);
          setProduction(generatedProd);
          setAttendance(generatedAtt);
          setRampUpRules(initialRamps);
          setTickets(seedTickets);
          setQualityRollups(seedQualityRollups);
          setQualityAudits(seedQualityAudits);

          safeSetItem('tracker_employees', JSON.stringify(initialEmps));
          safeSetItem('tracker_targets', JSON.stringify(initialTargets));
          safeSetItem('tracker_employee_processes', JSON.stringify(initialEmpProcs));
          safeSetItem('tracker_production', JSON.stringify(generatedProd));
          safeSetItem('tracker_attendance', JSON.stringify(generatedAtt));
          safeSetItem('tracker_ramp_rules', JSON.stringify(initialRamps));
          safeSetItem('tracker_tickets', JSON.stringify(seedTickets));
          safeSetItem('tracker_quality_rollups', JSON.stringify(seedQualityRollups));
          safeSetItem('tracker_quality_audits', JSON.stringify(seedQualityAudits));

          const bulkPayload = {
            tracker_employees: initialEmps,
            tracker_targets: initialTargets,
            tracker_employee_processes: initialEmpProcs,
            tracker_production: generatedProd,
            tracker_attendance: generatedAtt,
            tracker_ramp_rules: initialRamps,
            tracker_tickets: seedTickets,
            tracker_users: JSON.parse(safeGetItem('tracker_users') || '[]'),
            tracker_uploaded_files: [],
            tracker_manual_additions: [],
            tracker_quality_rollups: seedQualityRollups,
            tracker_quality_audits: seedQualityAudits
          };
          fetch('/api/data/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: bulkPayload })
          }).catch(e => console.error('Initial bulk database seeding failed:', e));
        }
      } catch (err) {
        console.error('Failed to load server data:', err);
      }
    };

    loadServerData();
  }, [currentUser]);

  // Save changes helper
  const save = (key: string, data: any) => {
    fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: data })
    }).catch(err => {
      console.error(`Failed to synchronize key "${key}" to server:`, err);
    });
  };

  const logUploadedFile = (filename: string, type: string, size: number, recordCount: number, status: 'Success' | 'Warning' | 'Error' = 'Success') => {
    setUploadedFiles((prev) => {
      const newLog: UploadedFileLog = {
        id: 'FL-' + Math.floor(100000 + Math.random() * 900000),
        filename,
        size: Number(size.toFixed(2)),
        type,
        uploadDate: new Date().toISOString(),
        recordCount,
        status
      };
      const next = [newLog, ...prev];
      save('tracker_uploaded_files', next);
      return next;
    });
  };

  const logManualAddition = (type: string, key: string, details: string) => {
    setManualAdditions((prev) => {
      const newLog: ManualAdditionLog = {
        id: 'ADD-' + Math.floor(100000 + Math.random() * 900000),
        type,
        key,
        details,
        timestamp: new Date().toISOString()
      };
      const next = [newLog, ...prev];
      save('tracker_manual_additions', next);
      return next;
    });
  };

  const clearDatabaseLogs = () => {
    setUploadedFiles([]);
    setManualAdditions([]);
    save('tracker_uploaded_files', []);
    save('tracker_manual_additions', []);
  };

  const restoreDatabase = async (backupData: any) => {
    try {
      const updates: Record<string, any> = {};
      if (backupData.tracker_employees) {
        setEmployees(backupData.tracker_employees);
        updates.tracker_employees = backupData.tracker_employees;
        safeSetItem('tracker_employees', JSON.stringify(backupData.tracker_employees));
      }
      if (backupData.tracker_targets) {
        setTargets(backupData.tracker_targets);
        updates.tracker_targets = backupData.tracker_targets;
        safeSetItem('tracker_targets', JSON.stringify(backupData.tracker_targets));
      }
      if (backupData.tracker_employee_processes) {
        setEmployeeProcesses(backupData.tracker_employee_processes);
        updates.tracker_employee_processes = backupData.tracker_employee_processes;
        safeSetItem('tracker_employee_processes', JSON.stringify(backupData.tracker_employee_processes));
      }
      if (backupData.tracker_production) {
        setProduction(backupData.tracker_production);
        updates.tracker_production = backupData.tracker_production;
        safeSetItem('tracker_production', JSON.stringify(backupData.tracker_production));
      }
      if (backupData.tracker_attendance) {
        setAttendance(backupData.tracker_attendance);
        updates.tracker_attendance = backupData.tracker_attendance;
        safeSetItem('tracker_attendance', JSON.stringify(backupData.tracker_attendance));
      }
      if (backupData.tracker_ramp_rules) {
        setRampUpRules(backupData.tracker_ramp_rules);
        updates.tracker_ramp_rules = backupData.tracker_ramp_rules;
        safeSetItem('tracker_ramp_rules', JSON.stringify(backupData.tracker_ramp_rules));
      }
      if (backupData.tracker_tickets) {
        setTickets(backupData.tracker_tickets);
        updates.tracker_tickets = backupData.tracker_tickets;
        safeSetItem('tracker_tickets', JSON.stringify(backupData.tracker_tickets));
      }
      if (backupData.tracker_uploaded_files) {
        setUploadedFiles(backupData.tracker_uploaded_files);
        updates.tracker_uploaded_files = backupData.tracker_uploaded_files;
        safeSetItem('tracker_uploaded_files', JSON.stringify(backupData.tracker_uploaded_files));
      }
      if (backupData.tracker_manual_additions) {
        setManualAdditions(backupData.tracker_manual_additions);
        updates.tracker_manual_additions = backupData.tracker_manual_additions;
        safeSetItem('tracker_manual_additions', JSON.stringify(backupData.tracker_manual_additions));
      }
      
      const res = await fetch('/api/data/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to restore database backup:', err);
      return false;
    }
  };

  // Employee Actions
  const addEmployee = (emp: Employee) => {
    setEmployees((prev) => {
      const next = [emp, ...prev.filter((e) => e.empId !== emp.empId)];
      save('tracker_employees', next);
      return next;
    });
    logManualAddition('Employee', emp.empId, `Added employee ${emp.name} (${emp.designation})`);
  };

  const removeEmployee = (empId: string) => {
    setEmployees((prev) => {
      const next = prev.filter((e) => e.empId !== empId);
      save('tracker_employees', next);
      return next;
    });
    // Cascade delete processes, production and attendance
    setEmployeeProcesses((prev) => {
      const next = prev.filter((ep) => ep.empId !== empId);
      save('tracker_employee_processes', next);
      return next;
    });
  };

  const clearEmployees = () => {
    setEmployees([]);
    save('tracker_employees', []);
  };

  const bulkUploadEmployees = (newEmps: Employee[]) => {
    setEmployees((prev) => {
      const existingIds = new Set(newEmps.map(ne => ne.empId));
      const filteredPrev = prev.filter(e => !existingIds.has(e.empId));
      const next = [...newEmps, ...filteredPrev];
      save('tracker_employees', next);
      return next;
    });
  };

  // Target Actions
  const addTarget = (target: TargetMap) => {
    setTargets((prev) => {
      const next = [target, ...prev.filter((t) => 
        !(t.pms === target.pms && t.processName === target.processName && t.subProcessName === target.subProcessName)
      )];
      save('tracker_targets', next);
      return next;
    });
    logManualAddition('Target', target.pms, `Added baseline target of ${target.target} for ${target.processName} - ${target.subProcessName}`);
  };

  const removeTarget = (pms: string, processName: string, subProcessName: string) => {
    setTargets((prev) => {
      const next = prev.filter((t) => 
        !(t.pms === pms && t.processName === processName && t.subProcessName === subProcessName)
      );
      save('tracker_targets', next);
      return next;
    });
  };

  const clearTargets = () => {
    setTargets([]);
    save('tracker_targets', []);
  };

  const bulkUploadTargets = (newTargets: TargetMap[]) => {
    setTargets((prev) => {
      const uniqueKeys = new Set(newTargets.map(nt => `${nt.pms}_${nt.processName}_${nt.subProcessName}`));
      const filteredPrev = prev.filter(t => !uniqueKeys.has(`${t.pms}_${t.processName}_${t.subProcessName}`));
      const next = [...newTargets, ...filteredPrev];
      save('tracker_targets', next);
      return next;
    });
  };

  // Employee Process Actions
  const addEmployeeProcess = (ep: EmployeeProcess) => {
    setEmployeeProcesses((prev) => {
      const next = [ep, ...prev.filter((item) => 
        !(item.empId === ep.empId && item.pms === ep.pms && item.processName === ep.processName && item.subProcessName === ep.subProcessName)
      )];
      save('tracker_employee_processes', next);
      return next;
    });
    logManualAddition('Process Link', ep.empId, `Linked operator to ${ep.pms} - ${ep.processName}`);
  };

  const removeEmployeeProcess = (empId: string, pms: string, processName: string, subProcessName: string) => {
    setEmployeeProcesses((prev) => {
      const next = prev.filter((item) => 
        !(item.empId === empId && item.pms === pms && item.processName === processName && item.subProcessName === subProcessName)
      );
      save('tracker_employee_processes', next);
      return next;
    });
  };

  const clearEmployeeProcesses = () => {
    setEmployeeProcesses([]);
    save('tracker_employee_processes', []);
  };

  const bulkUploadEmployeeProcesses = (eps: EmployeeProcess[]) => {
    setEmployeeProcesses((prev) => {
      const uniqueKeys = new Set(eps.map(nt => `${nt.empId}_${nt.pms}_${nt.processName}_${nt.subProcessName}`));
      const filteredPrev = prev.filter(t => !uniqueKeys.has(`${t.empId}_${t.pms}_${t.processName}_${t.subProcessName}`));
      const next = [...eps, ...filteredPrev];
      save('tracker_employee_processes', next);
      return next;
    });
  };

  // Production Record Actions
  const addProductionRecord = (rec: ProductionRecord) => {
    setProduction((prev) => {
      const next = [rec, ...prev];
      save('tracker_production', next);
      return next;
    });
    logManualAddition('Production Record', rec.empId, `Added production: achieved ${rec.achieved}/${rec.target} on ${rec.date}`);
  };

  const removeProductionRecord = (id: string) => {
    setProduction((prev) => {
      const next = prev.filter((r) => r.id !== id);
      save('tracker_production', next);
      return next;
    });
  };

  const clearProduction = () => {
    setProduction([]);
    save('tracker_production', []);
  };

  const bulkUploadProduction = (recs: ProductionRecord[]) => {
    setProduction((prev) => {
      const next = [...recs, ...prev];
      save('tracker_production', next);
      return next;
    });
  };

  // Quality Rollups and Audits Actions
  const clearQualityRollups = () => {
    setQualityRollups([]);
    save('tracker_quality_rollups', []);
  };

  const bulkUploadQualityRollups = (recs: QualityRollup[]) => {
    setQualityRollups((prev) => {
      const existingIds = new Set(recs.map(r => r.id));
      const filteredPrev = prev.filter(p => !existingIds.has(p.id));
      const next = [...recs, ...filteredPrev];
      save('tracker_quality_rollups', next);
      return next;
    });
  };

  const clearQualityAudits = () => {
    setQualityAudits([]);
    save('tracker_quality_audits', []);
  };

  const bulkUploadQualityAudits = (recs: QualityAuditRecord[]) => {
    setQualityAudits((prev) => {
      const existingIds = new Set(recs.map(r => r.id));
      const filteredPrev = prev.filter(p => !existingIds.has(p.id));
      const next = [...recs, ...filteredPrev];
      save('tracker_quality_audits', next);
      return next;
    });
  };

  // Attendance Record Actions
  const addAttendanceRecord = (rec: AttendanceRecord) => {
    setAttendance((prev) => {
      const next = [rec, ...prev];
      save('tracker_attendance', next);
      return next;
    });
    logManualAddition('Attendance Record', rec.empId, `Added attendance for ${rec.date}: worked ${rec.hoursWorked} hrs`);
  };

  const removeAttendanceRecord = (id: string) => {
    setAttendance((prev) => {
      const next = prev.filter((a) => a.id !== id);
      save('tracker_attendance', next);
      return next;
    });
  };

  const clearAttendance = () => {
    setAttendance([]);
    save('tracker_attendance', []);
  };

  const bulkUploadAttendance = (recs: AttendanceRecord[]) => {
    setAttendance((prev) => {
      const next = [...recs, ...prev];
      save('tracker_attendance', next);
      return next;
    });
  };

  // Ramp Up Rule Actions
  const addRampUpRule = (rule: RampUpRule) => {
    setRampUpRules((prev) => {
      const next = [rule, ...prev.filter((r) => r.empId !== rule.empId)];
      save('tracker_ramp_rules', next);
      return next;
    });
    logManualAddition('Ramp-Up Rule', rule.empId, `Added ramp-up rule: ${rule.type} starting week ${rule.startWeek}`);
  };

  const removeRampUpRule = (empId: string) => {
    setRampUpRules((prev) => {
      const next = prev.filter((r) => r.empId !== empId);
      save('tracker_ramp_rules', next);
      return next;
    });
  };

  const clearRampUpRules = () => {
    setRampUpRules([]);
    save('tracker_ramp_rules', []);
  };

  // Ticket Actions
  const addTicket = (tkt: Ticket) => {
    setTickets((prev) => {
      const next = [tkt, ...prev];
      save('tracker_tickets', next);
      return next;
    });
  };

  const approveTicket = (id: string) => {
    setTickets((prevTickets) => {
      const ticket = prevTickets.find((t) => t.id === id);
      if (!ticket) return prevTickets;

      const nextTickets = prevTickets.map((t) =>
        t.id === id ? { ...t, status: 'Approved' as const, reviewedAt: new Date().toISOString().split('T')[0] } : t
      );
      save('tracker_tickets', nextTickets);

      const typeLower = (ticket.ticketType || '').toLowerCase();

      // 1. Handle New Joiner / Add Employee approval
      if ((typeLower.includes('joiner') || typeLower.includes('employee') || typeLower.includes('register') || typeLower.includes('join') || typeLower.includes('add')) && ticket.newEmployeeDetails) {
        const newEmp = ticket.newEmployeeDetails;
        setEmployees((prevEmp) => {
          const nextEmp = [newEmp, ...prevEmp.filter((e) => e.empId !== newEmp.empId)];
          save('tracker_employees', nextEmp);
          return nextEmp;
        });

        // Set up default employee process mapping
        setEmployeeProcesses((prevEp) => {
          const processMapping: EmployeeProcess = {
            empId: newEmp.empId,
            empName: newEmp.name,
            pms: 'ECW',
            processName: newEmp.designation.includes('AR') ? 'AR' : 'SB',
            subProcessName: newEmp.designation.includes('AR') ? 'AR Follow Up' : 'Charge Entry',
          };
          const nextEp = [processMapping, ...prevEp.filter((ep) => ep.empId !== newEmp.empId)];
          save('tracker_employee_processes', nextEp);
          return nextEp;
        });
      }

      // 2. Handle Team / Manager Change approval
      else if ((typeLower.includes('team') || typeLower.includes('manager') || typeLower.includes('reporting') || typeLower.includes('remap')) && ticket.teamChangeDetails) {
        const details = ticket.teamChangeDetails;
        setEmployees((prevEmp) => {
          const nextEmp = prevEmp.map((e) =>
            e.empId === details.empId
              ? { ...e, rm: details.newRm, lm: details.newLm, rcm: details.newRcm }
              : e
          );
          save('tracker_employees', nextEmp);
          return nextEmp;
        });
      }

      // 3. Handle Add Process or Add Sub-Process target approval
      else if ((typeLower.includes('process') || typeLower.includes('workflow') || typeLower.includes('sub-process')) && ticket.processDetails) {
        const details = ticket.processDetails;
        setTargets((prevTargets) => {
          const newTarget: TargetMap = {
            pms: details.pms,
            processName: details.processName,
            subProcessName: details.subProcessName,
            target: details.target,
          };
          const nextTargets = [
            newTarget,
            ...prevTargets.filter(
              (t) =>
                !(
                  t.pms === details.pms &&
                  t.processName === details.processName &&
                  t.subProcessName === details.subProcessName
                )
            ),
          ];
          save('tracker_targets', nextTargets);
          return nextTargets;
        });
      }

      // 4. Handle standard daily log production data corrections and target changes
      else {
        if (ticket.empId && ticket.productionDate) {
          setProduction((prevProd) => {
            const recordIdx = prevProd.findIndex(
              (record) =>
                record && record.empId && ticket.empId &&
                record.empId.toString().toUpperCase().trim() === ticket.empId.toString().toUpperCase().trim() &&
                record.date === ticket.productionDate
            );

            let nextProd = [...prevProd];
            if (recordIdx >= 0) {
              nextProd[recordIdx] = {
                ...nextProd[recordIdx],
                [ticket.fieldToChange]: ticket.newValue,
              };
            } else {
              const empProc = employeeProcesses.find((ep) => ep.empId === ticket.empId);
              const newRecord: ProductionRecord = {
                id: `prod_${Date.now()}`,
                empId: ticket.empId,
                pms: empProc?.pms || 'ECW',
                processName: empProc?.processName || 'SB',
                subProcessName: empProc?.subProcessName || 'Charge Entry',
                date: ticket.productionDate,
                target: ticket.fieldToChange === 'target' ? ticket.newValue : 100,
                achieved: ticket.fieldToChange === 'achieved' ? ticket.newValue : 0,
                accuracy: ticket.fieldToChange === 'accuracy' ? ticket.newValue : 95,
              };
              nextProd.unshift(newRecord);
            }
            save('tracker_production', nextProd);
            return nextProd;
          });
        }
      }

      return nextTickets;
    });
  };

  const rejectTicket = (id: string) => {
    setTickets((prev) => {
      const next = prev.map((t) =>
        t.id === id ? { ...t, status: 'Rejected' as const, reviewedAt: new Date().toISOString().split('T')[0] } : t
      );
      save('tracker_tickets', next);
      return next;
    });
  };

  const clearTickets = () => {
    setTickets([]);
    save('tracker_tickets', []);
  };

  // Reset entire application
  const resetAllData = () => {
    safeRemoveItem('tracker_employees');
    safeRemoveItem('tracker_targets');
    safeRemoveItem('tracker_employee_processes');
    safeRemoveItem('tracker_production');
    safeRemoveItem('tracker_attendance');
    safeRemoveItem('tracker_ramp_rules');
    safeRemoveItem('tracker_tickets');
    
    const initialEmps = [...seedEmployees];
    const initialTargets = [...seedTargets];
    const initialEmpProcs = [...seedEmployeeProcesses];
    const initialRamps = [...seedRampUpRules];
    
    const { production: generatedProd, attendance: generatedAtt } = generateProductionAndAttendance(
      initialEmps,
      initialEmpProcs,
      initialTargets,
      initialRamps
    );

    setEmployees(initialEmps);
    setTargets(initialTargets);
    setEmployeeProcesses(initialEmpProcs);
    setProduction(generatedProd);
    setAttendance(generatedAtt);
    setRampUpRules(initialRamps);
    setTickets(seedTickets);

    save('tracker_employees', initialEmps);
    save('tracker_targets', initialTargets);
    save('tracker_employee_processes', initialEmpProcs);
    save('tracker_production', generatedProd);
    save('tracker_attendance', generatedAtt);
    save('tracker_ramp_rules', initialRamps);
    save('tracker_tickets', seedTickets);
  };

  const resolvedProduction = useMemo(() => {
    return production.map((p) => {
      const entry = resolveTargetEntry(p.pms, p.processName, p.subProcessName, targets);
      const target = entry ? entry.target : p.target;
      const dailyWorkHours = entry && entry.dailyWorkHours ? entry.dailyWorkHours : 8;
      const hourlyTarget = entry && entry.hourlyTarget ? entry.hourlyTarget : Number((target / dailyWorkHours).toFixed(4));
      const achievedHourly = hourlyTarget > 0 ? Number((p.achieved / hourlyTarget).toFixed(4)) : 0;
      const percentage = target > 0 ? Number(((p.achieved / target) * 100).toFixed(2)) : 100;
      
      return {
        ...p,
        target,
        dailyWorkHours,
        hourlyTarget,
        achievedHourly,
        percentage
      };
    });
  }, [production, targets]);

  return (
    <AppContext.Provider
      value={{
        employees,
        targets,
        employeeProcesses,
        production: resolvedProduction,
        attendance,
        rampUpRules,
        
        addEmployee,
        removeEmployee,
        clearEmployees,
        bulkUploadEmployees,

        addTarget,
        removeTarget,
        clearTargets,
        bulkUploadTargets,

        addEmployeeProcess,
        removeEmployeeProcess,
        clearEmployeeProcesses,
        bulkUploadEmployeeProcesses,

        addProductionRecord,
        removeProductionRecord,
        clearProduction,
        bulkUploadProduction,

        addAttendanceRecord,
        removeAttendanceRecord,
        clearAttendance,
        bulkUploadAttendance,

        addRampUpRule,
        removeRampUpRule,
        clearRampUpRules,

        qualityRollups,
        qualityAudits,
        clearQualityRollups,
        bulkUploadQualityRollups,
        clearQualityAudits,
        bulkUploadQualityAudits,

        tickets,
        addTicket,
        approveTicket,
        rejectTicket,
        clearTickets,

        resetAllData,
        uploadedFiles,
        manualAdditions,
        logUploadedFile,
        logManualAddition,
        clearDatabaseLogs,
        restoreDatabase,
        alertModal,
        showAlert,
        closeAlert,
        currentUser,
        currentUserRole,
        setCurrentUserRole: updateCurrentUserRole,
        loginUser,
        registerUser,
        resetPassword,
        logoutUser,
        hasLocalStorageData,
        importLocalStorageData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
