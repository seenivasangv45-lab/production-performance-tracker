import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import {
  seedEmployees,
  seedTargets,
  seedEmployeeProcesses,
  seedRampUpRules,
  generateProductionAndAttendance,
} from '../src/data/seedData';

// Re-define seedTickets here since it is local to AppContext in frontend
const seedTickets = [
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

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, 'app.db'));
db.pragma('journal_mode = WAL');

// Create relational tables that mirror our data shapes with IDs, timestamps and constraints
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    empId TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    doj TEXT NOT NULL,
    designation TEXT NOT NULL,
    rm TEXT NOT NULL,
    lm TEXT NOT NULL,
    rcm TEXT NOT NULL,
    shiftTiming TEXT,
    dob TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pms TEXT NOT NULL,
    processName TEXT NOT NULL,
    subProcessName TEXT NOT NULL,
    target INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employee_processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empId TEXT NOT NULL,
    empName TEXT NOT NULL,
    pms TEXT NOT NULL,
    processName TEXT NOT NULL,
    subProcessName TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    empId TEXT NOT NULL,
    pms TEXT NOT NULL,
    processName TEXT NOT NULL,
    subProcessName TEXT NOT NULL,
    date TEXT NOT NULL,
    target INTEGER NOT NULL,
    achieved INTEGER NOT NULL,
    accuracy REAL NOT NULL,
    auditedCount INTEGER,
    errorCategory TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    empId TEXT NOT NULL,
    date TEXT NOT NULL,
    expectedHours REAL NOT NULL,
    hoursWorked REAL NOT NULL,
    hoursBreak REAL NOT NULL,
    hoursOT REAL NOT NULL,
    onLeave INTEGER NOT NULL,
    markings TEXT,
    inTime TEXT,
    totalWrkHrsStr TEXT,
    exactWrkHrsStr TEXT,
    breakHrsStr TEXT,
    stipulatedTimeStr TEXT,
    designation TEXT,
    empName TEXT,
    extraWorkHrsStr TEXT,
    allowedBrkStr TEXT,
    excessBreakStr TEXT,
    shortfallStr TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ramp_up_rules (
    empId TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    startWeek INTEGER NOT NULL,
    weeklyTargets TEXT NOT NULL, -- JSON string array
    standardTarget INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    requestor TEXT NOT NULL,
    requestorRole TEXT,
    ticketType TEXT,
    empId TEXT NOT NULL,
    empName TEXT NOT NULL,
    productionDate TEXT NOT NULL,
    fieldToChange TEXT NOT NULL,
    oldValue INTEGER NOT NULL,
    newValue INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    reviewedAt TEXT,
    newEmployeeDetails TEXT, -- JSON string
    teamChangeDetails TEXT, -- JSON string
    processDetails TEXT, -- JSON string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS uploaded_file_logs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    size REAL NOT NULL,
    type TEXT NOT NULL,
    uploadDate TEXT NOT NULL,
    recordCount INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS manual_addition_logs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    key TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

export const STORE_KEYS = [
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
] as const;

export type StoreKey = (typeof STORE_KEYS)[number];

export const getFullStore = (): Record<string, any[]> => {
  const employees = db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all();
  const targets = db.prepare('SELECT * FROM targets').all();
  const employee_processes = db.prepare('SELECT * FROM employee_processes').all();
  const production = db.prepare('SELECT * FROM production').all();
  const attendance = db.prepare('SELECT * FROM attendance').all().map((a: any) => ({
    ...a,
    onLeave: !!a.onLeave
  }));
  const ramp_rules = db.prepare('SELECT * FROM ramp_up_rules').all().map((r: any) => ({
    ...r,
    weeklyTargets: JSON.parse(r.weeklyTargets)
  }));
  const tickets = db.prepare('SELECT * FROM tickets').all().map((t: any) => ({
    ...t,
    newEmployeeDetails: t.newEmployeeDetails ? JSON.parse(t.newEmployeeDetails) : undefined,
    teamChangeDetails: t.teamChangeDetails ? JSON.parse(t.teamChangeDetails) : undefined,
    processDetails: t.processDetails ? JSON.parse(t.processDetails) : undefined
  }));
  const uploaded_files = db.prepare('SELECT * FROM uploaded_file_logs ORDER BY created_at DESC').all();
  const manual_additions = db.prepare('SELECT * FROM manual_addition_logs ORDER BY created_at DESC').all();
  const users = db.prepare('SELECT * FROM users').all();

  return {
    tracker_employees: employees,
    tracker_targets: targets,
    tracker_employee_processes: employee_processes,
    tracker_production: production,
    tracker_attendance: attendance,
    tracker_ramp_rules: ramp_rules,
    tracker_tickets: tickets,
    tracker_uploaded_files: uploaded_files,
    tracker_manual_additions: manual_additions,
    tracker_users: users
  };
};

export const saveStoreValue = db.transaction((key: string, value: any[]) => {
  if (key === 'tracker_employees') {
    db.prepare('DELETE FROM employees').run();
    const insert = db.prepare(`
      INSERT INTO employees (empId, name, status, doj, designation, rm, lm, rcm, shiftTiming, dob)
      VALUES (@empId, @name, @status, @doj, @designation, @rm, @lm, @rcm, @shiftTiming, @dob)
    `);
    for (const item of value) {
      insert.run({
        empId: item.empId,
        name: item.name,
        status: item.status,
        doj: item.doj,
        designation: item.designation,
        rm: item.rm,
        lm: item.lm || '',
        rcm: item.rcm || '',
        shiftTiming: item.shiftTiming || null,
        dob: item.dob || null
      });
    }
  } else if (key === 'tracker_targets') {
    db.prepare('DELETE FROM targets').run();
    const insert = db.prepare(`
      INSERT INTO targets (pms, processName, subProcessName, target)
      VALUES (@pms, @processName, @subProcessName, @target)
    `);
    for (const item of value) {
      insert.run({
        pms: item.pms,
        processName: item.processName,
        subProcessName: item.subProcessName,
        target: item.target
      });
    }
  } else if (key === 'tracker_employee_processes') {
    db.prepare('DELETE FROM employee_processes').run();
    const insert = db.prepare(`
      INSERT INTO employee_processes (empId, empName, pms, processName, subProcessName)
      VALUES (@empId, @empName, @pms, @processName, @subProcessName)
    `);
    for (const item of value) {
      insert.run({
        empId: item.empId,
        empName: item.empName,
        pms: item.pms,
        processName: item.processName,
        subProcessName: item.subProcessName
      });
    }
  } else if (key === 'tracker_production') {
    db.prepare('DELETE FROM production').run();
    const insert = db.prepare(`
      INSERT INTO production (id, empId, pms, processName, subProcessName, date, target, achieved, accuracy, auditedCount, errorCategory)
      VALUES (@id, @empId, @pms, @processName, @subProcessName, @date, @target, @achieved, @accuracy, @auditedCount, @errorCategory)
    `);
    for (const item of value) {
      insert.run({
        id: item.id || `prod_${Math.random().toString(36).substr(2, 9)}`,
        empId: item.empId,
        pms: item.pms,
        processName: item.processName,
        subProcessName: item.subProcessName,
        date: item.date,
        target: item.target,
        achieved: item.achieved,
        accuracy: item.accuracy,
        auditedCount: item.auditedCount !== undefined ? item.auditedCount : null,
        errorCategory: item.errorCategory || null
      });
    }
  } else if (key === 'tracker_attendance') {
    db.prepare('DELETE FROM attendance').run();
    const insert = db.prepare(`
      INSERT INTO attendance (id, empId, date, expectedHours, hoursWorked, hoursBreak, hoursOT, onLeave, markings, inTime, totalWrkHrsStr, exactWrkHrsStr, breakHrsStr, stipulatedTimeStr, designation, empName, extraWorkHrsStr, allowedBrkStr, excessBreakStr, shortfallStr)
      VALUES (@id, @empId, @date, @expectedHours, @hoursWorked, @hoursBreak, @hoursOT, @onLeave, @markings, @inTime, @totalWrkHrsStr, @exactWrkHrsStr, @breakHrsStr, @stipulatedTimeStr, @designation, @empName, @extraWorkHrsStr, @allowedBrkStr, @excessBreakStr, @shortfallStr)
    `);
    for (const item of value) {
      insert.run({
        id: item.id || `att_${Math.random().toString(36).substr(2, 9)}`,
        empId: item.empId,
        date: item.date,
        expectedHours: item.expectedHours,
        hoursWorked: item.hoursWorked,
        hoursBreak: item.hoursBreak,
        hoursOT: item.hoursOT,
        onLeave: item.onLeave ? 1 : 0,
        markings: item.markings || null,
        inTime: item.inTime || null,
        totalWrkHrsStr: item.totalWrkHrsStr || null,
        exactWrkHrsStr: item.exactWrkHrsStr || null,
        breakHrsStr: item.breakHrsStr || null,
        stipulatedTimeStr: item.stipulatedTimeStr || null,
        designation: item.designation || null,
        empName: item.empName || null,
        extraWorkHrsStr: item.extraWorkHrsStr || null,
        allowedBrkStr: item.allowedBrkStr || null,
        excessBreakStr: item.excessBreakStr || null,
        shortfallStr: item.shortfallStr || null
      });
    }
  } else if (key === 'tracker_ramp_rules') {
    db.prepare('DELETE FROM ramp_up_rules').run();
    const insert = db.prepare(`
      INSERT INTO ramp_up_rules (empId, type, startWeek, weeklyTargets, standardTarget, createdAt)
      VALUES (@empId, @type, @startWeek, @weeklyTargets, @standardTarget, @createdAt)
    `);
    for (const item of value) {
      insert.run({
        empId: item.empId,
        type: item.type,
        startWeek: item.startWeek,
        weeklyTargets: JSON.stringify(item.weeklyTargets),
        standardTarget: item.standardTarget,
        createdAt: item.createdAt
      });
    }
  } else if (key === 'tracker_tickets') {
    db.prepare('DELETE FROM tickets').run();
    const insert = db.prepare(`
      INSERT INTO tickets (id, requestor, requestorRole, ticketType, empId, empName, productionDate, fieldToChange, oldValue, newValue, reason, status, createdAt, reviewedAt, newEmployeeDetails, teamChangeDetails, processDetails)
      VALUES (@id, @requestor, @requestorRole, @ticketType, @empId, @empName, @productionDate, @fieldToChange, @oldValue, @newValue, @reason, @status, @createdAt, @reviewedAt, @newEmployeeDetails, @teamChangeDetails, @processDetails)
    `);
    for (const item of value) {
      insert.run({
        id: item.id || `tkt_${Math.random().toString(36).substr(2, 9)}`,
        requestor: item.requestor,
        requestorRole: item.requestorRole || null,
        ticketType: item.ticketType || null,
        empId: item.empId,
        empName: item.empName,
        productionDate: item.productionDate,
        fieldToChange: item.fieldToChange,
        oldValue: item.oldValue,
        newValue: item.newValue,
        reason: item.reason,
        status: item.status,
        createdAt: item.createdAt,
        reviewedAt: item.reviewedAt || null,
        newEmployeeDetails: item.newEmployeeDetails ? JSON.stringify(item.newEmployeeDetails) : null,
        teamChangeDetails: item.teamChangeDetails ? JSON.stringify(item.teamChangeDetails) : null,
        processDetails: item.processDetails ? JSON.stringify(item.processDetails) : null
      });
    }
  } else if (key === 'tracker_uploaded_files') {
    db.prepare('DELETE FROM uploaded_file_logs').run();
    const insert = db.prepare(`
      INSERT INTO uploaded_file_logs (id, filename, size, type, uploadDate, recordCount, status)
      VALUES (@id, @filename, @size, @type, @uploadDate, @recordCount, @status)
    `);
    for (const item of value) {
      insert.run({
        id: item.id || `file_${Math.random().toString(36).substr(2, 9)}`,
        filename: item.filename,
        size: item.size,
        type: item.type,
        uploadDate: item.uploadDate,
        recordCount: item.recordCount,
        status: item.status
      });
    }
  } else if (key === 'tracker_manual_additions') {
    db.prepare('DELETE FROM manual_addition_logs').run();
    const insert = db.prepare(`
      INSERT INTO manual_addition_logs (id, type, key, details, timestamp)
      VALUES (@id, @type, @key, @details, @timestamp)
    `);
    for (const item of value) {
      insert.run({
        id: item.id || `add_${Math.random().toString(36).substr(2, 9)}`,
        type: item.type,
        key: item.key,
        details: item.details,
        timestamp: item.timestamp
      });
    }
  } else if (key === 'tracker_users') {
    db.prepare('DELETE FROM users').run();
    const insert = db.prepare(`
      INSERT INTO users (username, password, role)
      VALUES (@username, @password, @role)
    `);
    for (const item of value) {
      insert.run({
        username: item.username,
        password: item.password,
        role: item.role
      });
    }
  }
});

export const seedDataIfEmpty = () => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM employees').get() as { count: number };
  if (count > 0) return;

  console.log('Database is empty. Initializing with system seeds...');

  const initialEmps = [...seedEmployees];
  const initialTargets = [...seedTargets];
  const initialEmpProcs = [...seedEmployeeProcesses];
  const initialRamps = [...seedRampUpRules];

  const { production, attendance } = generateProductionAndAttendance(
    initialEmps,
    initialEmpProcs,
    initialTargets,
    initialRamps
  );

  saveStoreValue('tracker_employees', initialEmps);
  saveStoreValue('tracker_targets', initialTargets);
  saveStoreValue('tracker_employee_processes', initialEmpProcs);
  saveStoreValue('tracker_production', production);
  saveStoreValue('tracker_attendance', attendance);
  saveStoreValue('tracker_ramp_rules', initialRamps);
  saveStoreValue('tracker_tickets', seedTickets);
  saveStoreValue('tracker_uploaded_files', []);
  saveStoreValue('tracker_manual_additions', []);
};

const DEFAULT_USERS = [
  { username: 'admin', password: 'password', role: 'Admin' },
  { username: 'manager', password: 'password', role: 'General Manager' },
  { username: 'rcm_mgr', password: 'password', role: 'RCM Manager' },
  { username: 'supervisor', password: 'password', role: 'RM' },
  { username: 'lead', password: 'password', role: 'LM' },
  { username: 'agent', password: 'password', role: 'User(Production)' },
  { username: 'hr_user', password: 'password', role: 'HR' },
];

export const seedUsersIfEmpty = () => {
  const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count > 0) return;

  console.log('Seeding default portal roles...');
  const insert = db.prepare('INSERT INTO users (username, password, role) VALUES (@username, @password, @role)');
  const insertMany = db.transaction((rows: typeof DEFAULT_USERS) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(DEFAULT_USERS);
};

export interface UserRow {
  username: string;
  password: string;
  role: string;
}

export const findUser = (username: string): UserRow | undefined => {
  return db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username) as UserRow | undefined;
};

export const insertUser = (username: string, password: string, role: string) => {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
};

export const updateUserPassword = (username: string, password: string) => {
  db.prepare('UPDATE users SET password = ? WHERE lower(username) = lower(?)').run(password, username);
};

export const resetAllStoreData = (): Record<string, any[]> => {
  db.prepare('DELETE FROM employees').run();
  db.prepare('DELETE FROM targets').run();
  db.prepare('DELETE FROM employee_processes').run();
  db.prepare('DELETE FROM production').run();
  db.prepare('DELETE FROM attendance').run();
  db.prepare('DELETE FROM ramp_up_rules').run();
  db.prepare('DELETE FROM tickets').run();
  db.prepare('DELETE FROM uploaded_file_logs').run();
  db.prepare('DELETE FROM manual_addition_logs').run();
  
  seedDataIfEmpty();
  return getFullStore();
};
