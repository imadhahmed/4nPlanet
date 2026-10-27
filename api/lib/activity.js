// api/lib/activity.js
// Activity logging helper

import { appendRow, generateId } from './sheets.js';

export async function logActivity(user, action, entity_type, entity_id, details = '') {
  const log_id = await generateId('LOG', 'Activity_Logs', 'log_id');
  await appendRow('Activity_Logs', {
    log_id,
    user_id: user?.user_id || 'system',
    user_name: user?.name || 'System',
    action,
    entity_type,
    entity_id: String(entity_id),
    details,
    ip_address: '',
    created_at: new Date().toISOString(),
  });
}
