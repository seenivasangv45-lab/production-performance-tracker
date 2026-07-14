import { Router } from 'express';
import {
  STORE_KEYS,
  StoreKey,
  getFullStore,
  saveStoreValue,
  findUser,
  insertUser,
  updateUserPassword,
  resetAllStoreData,
} from './db';

export const apiRouter = Router();

const isStoreKey = (key: string): key is StoreKey => (STORE_KEYS as readonly string[]).includes(key);

// Input validation helper
const validateStoreItem = (key: StoreKey, item: any): string | null => {
  if (typeof item !== 'object' || item === null) {
    return 'Item must be a valid JSON object.';
  }

  switch (key) {
    case 'tracker_employees':
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.name || typeof item.name !== 'string') return 'Missing or invalid name.';
      if (!item.status || typeof item.status !== 'string') return 'Missing or invalid status.';
      if (!item.doj || typeof item.doj !== 'string') return 'Missing or invalid doj.';
      if (!item.designation || typeof item.designation !== 'string') return 'Missing or invalid designation.';
      if (!item.rm || typeof item.rm !== 'string') return 'Missing or invalid rm.';
      break;

    case 'tracker_targets':
      if (!item.pms || typeof item.pms !== 'string') return 'Missing or invalid pms.';
      if (!item.processName || typeof item.processName !== 'string') return 'Missing or invalid processName.';
      if (!item.subProcessName || typeof item.subProcessName !== 'string') return 'Missing or invalid subProcessName.';
      if (typeof item.target !== 'number') return 'Missing or invalid target value.';
      break;

    case 'tracker_employee_processes':
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.empName || typeof item.empName !== 'string') return 'Missing or invalid empName.';
      if (!item.pms || typeof item.pms !== 'string') return 'Missing or invalid pms.';
      if (!item.processName || typeof item.processName !== 'string') return 'Missing or invalid processName.';
      if (!item.subProcessName || typeof item.subProcessName !== 'string') return 'Missing or invalid subProcessName.';
      break;

    case 'tracker_production':
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.pms || typeof item.pms !== 'string') return 'Missing or invalid pms.';
      if (!item.processName || typeof item.processName !== 'string') return 'Missing or invalid processName.';
      if (!item.subProcessName || typeof item.subProcessName !== 'string') return 'Missing or invalid subProcessName.';
      if (!item.date || typeof item.date !== 'string') return 'Missing or invalid date.';
      if (typeof item.target !== 'number') return 'Missing or invalid target.';
      if (typeof item.achieved !== 'number') return 'Missing or invalid achieved.';
      if (typeof item.accuracy !== 'number') return 'Missing or invalid accuracy.';
      break;

    case 'tracker_attendance':
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.date || typeof item.date !== 'string') return 'Missing or invalid date.';
      if (typeof item.expectedHours !== 'number') return 'Missing or invalid expectedHours.';
      if (typeof item.hoursWorked !== 'number') return 'Missing or invalid hoursWorked.';
      if (typeof item.hoursBreak !== 'number') return 'Missing or invalid hoursBreak.';
      if (typeof item.hoursOT !== 'number') return 'Missing or invalid hoursOT.';
      if (typeof item.onLeave !== 'boolean' && typeof item.onLeave !== 'number') return 'Missing or invalid onLeave state.';
      break;

    case 'tracker_ramp_rules':
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.type || typeof item.type !== 'string') return 'Missing or invalid rule type.';
      if (typeof item.startWeek !== 'number') return 'Missing or invalid startWeek.';
      if (!Array.isArray(item.weeklyTargets)) return 'Missing or invalid weeklyTargets array.';
      if (typeof item.standardTarget !== 'number') return 'Missing or invalid standardTarget.';
      break;

    case 'tracker_tickets':
      if (!item.id || typeof item.id !== 'string') return 'Missing or invalid ticket id.';
      if (!item.requestor || typeof item.requestor !== 'string') return 'Missing or invalid requestor.';
      if (!item.empId || typeof item.empId !== 'string') return 'Missing or invalid empId.';
      if (!item.empName || typeof item.empName !== 'string') return 'Missing or invalid empName.';
      if (!item.productionDate || typeof item.productionDate !== 'string') return 'Missing or invalid productionDate.';
      if (!item.fieldToChange || typeof item.fieldToChange !== 'string') return 'Missing or invalid fieldToChange.';
      if (typeof item.oldValue !== 'number') return 'Missing or invalid oldValue.';
      if (typeof item.newValue !== 'number') return 'Missing or invalid newValue.';
      if (!item.reason || typeof item.reason !== 'string') return 'Missing or invalid reason.';
      if (!item.status || typeof item.status !== 'string') return 'Missing or invalid status.';
      break;

    case 'tracker_users':
      if (!item.username || typeof item.username !== 'string') return 'Missing or invalid username.';
      if (!item.password || typeof item.password !== 'string') return 'Missing or invalid password.';
      if (!item.role || typeof item.role !== 'string') return 'Missing or invalid role.';
      break;
  }
  return null;
};

// GET whole centralized synchronized state
apiRouter.get('/store', (_req, res) => {
  res.json(getFullStore());
});

// Update specific store key (array) with list validation
apiRouter.put('/store/:key', (req, res) => {
  const { key } = req.params;
  if (!isStoreKey(key)) {
    return res.status(400).json({ success: false, message: `Unknown store key "${key}".` });
  }
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ success: false, message: 'Expected a JSON array body.' });
  }

  // Validate every entry in the payload array
  for (let i = 0; i < req.body.length; i++) {
    const err = validateStoreItem(key, req.body[i]);
    if (err) {
      return res.status(400).json({
        success: false,
        message: `Validation failed at item index ${i} for key "${key}": ${err}`
      });
    }
  }

  try {
    saveStoreValue(key, req.body);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`Database write failed for key "${key}":`, err);
    res.status(500).json({ success: false, message: 'Internal Database Write Error' });
  }
});

// Bulk update multiple tables (e.g. for backup restore or initial setup)
apiRouter.post('/store/bulk', (req, res) => {
  const { updates } = req.body || {};
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid or missing updates payload.' });
  }

  try {
    for (const [key, value] of Object.entries(updates)) {
      if (isStoreKey(key)) {
        if (!Array.isArray(value)) {
          return res.status(400).json({ success: false, message: `Expected a JSON array for key "${key}".` });
        }
        for (let i = 0; i < value.length; i++) {
          const err = validateStoreItem(key, value[i]);
          if (err) {
            return res.status(400).json({
              success: false,
              message: `Validation failed at item index ${i} in bulk payload for key "${key}": ${err}`
            });
          }
        }
      }
    }

    // Save validated lists
    for (const [key, value] of Object.entries(updates)) {
      if (isStoreKey(key)) {
        saveStoreValue(key, value as any[]);
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Bulk database update failed:', err);
    res.status(500).json({ success: false, message: 'Internal Database Bulk Write Error' });
  }
});

// Reset all store tables to system defaults
apiRouter.post('/reset', (_req, res) => {
  try {
    const store = resetAllStoreData();
    res.json(store);
  } catch (err: any) {
    console.error('Database reset failed:', err);
    res.status(500).json({ success: false, message: 'Failed to reset store' });
  }
});

// --- Auth Endpoints with Cookie Session Persistence ---

apiRouter.get('/auth/me', (req, res) => {
  const cookies = req.headers.cookie || '';
  const usernameMatch = cookies.match(/(?:^|;)\s*username=([^;]+)/);
  const roleMatch = cookies.match(/(?:^|;)\s*role=([^;]+)/);

  if (usernameMatch && roleMatch) {
    res.json({
      loggedIn: true,
      username: decodeURIComponent(usernameMatch[1]),
      role: decodeURIComponent(roleMatch[1])
    });
  } else {
    res.json({ loggedIn: false });
  }
});

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const found = findUser(username);
  if (!found) {
    return res.json({ success: false, message: 'Invalid username. Please check and try again, or create an account.' });
  }
  if (found.password !== password) {
    return res.json({ success: false, message: 'Incorrect password. Please verify your credentials or use the reset option.' });
  }

  res.setHeader('Set-Cookie', [
    `username=${encodeURIComponent(found.username)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
    `role=${encodeURIComponent(found.role)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`
  ]);

  res.json({ success: true, message: 'Login successful!', username: found.username, role: found.role });
});

apiRouter.post('/auth/register', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (findUser(username)) {
    return res.json({ success: false, message: 'Username already exists. Please choose a different name or log in.' });
  }

  const finalRole = role || 'User(Production)';
  try {
    insertUser(username, password, finalRole);
    
    res.setHeader('Set-Cookie', [
      `username=${encodeURIComponent(username)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      `role=${encodeURIComponent(finalRole)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`
    ]);

    res.json({ success: true, message: 'Account created successfully and logged in!', username, role: finalRole });
  } catch (err: any) {
    console.error('Registration failed:', err);
    res.status(500).json({ success: false, message: 'Database Registration Failed' });
  }
});

apiRouter.post('/auth/reset-password', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  if (!findUser(username)) {
    return res.json({ success: false, message: 'Username not found. Please register as a new user instead.' });
  }

  try {
    updateUserPassword(username, password);
    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
  } catch (err: any) {
    console.error('Password reset failed:', err);
    res.status(500).json({ success: false, message: 'Database Password Reset Failed' });
  }
});

apiRouter.post('/auth/logout', (_req, res) => {
  res.setHeader('Set-Cookie', [
    'username=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
    'role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
  ]);
  res.json({ success: true });
});
