// CommonJS cleanup script for deleting temporary Supabase users
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Resolve credential file path using __dirname
const credsPath = path.resolve(__dirname, '..', 'scratch', 'temp_users.json');

// Helper: simple UUID v4 validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Helper: determine if an email looks like a disposable test user
function isDisposable(email) {
  // Basic check: contains "test-" and uses example.com domain
  return /^test-\d{13,}-.*@example\.com$/i.test(email);
}

if (!fs.existsSync(credsPath)) {
  // No credential file – assume cleanup already performed
  console.log('No credential file found – nothing to clean');
  process.exit(0);
}

let rawCreds;
try {
  rawCreds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
} catch (e) {
  console.error('Failed to parse credential file');
  process.exit(1);
}

// Support both array format and { userA, userB } object format
let users = [];
if (Array.isArray(rawCreds)) {
  users = rawCreds;
} else if (typeof rawCreds === 'object') {
  if (Array.isArray(rawCreds.userA)) users = users.concat(rawCreds.userA);
  if (Array.isArray(rawCreds.userB)) users = users.concat(rawCreds.userB);
}

if (users.length === 0) {
  console.error('No temporary users found in credential file');
  process.exit(1);
}

// Initialize Supabase client (service role key required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Tables ordered from child to parent (delete child rows first)
const tables = [
  // Adjust ordering based on actual foreign‑key relationships
  'knowledge_chunks',
  'knowledge_documents',
  'knowledge_processing_jobs',
  'knowledge_query_events',
  'messages',
  'conversations',
  'tasks',
  'goals',
  'internal_action_executions',
  'internal_action_proposals'
];

let failures = [];

(async () => {
  for (const cred of users) {
    const userId = cred.id || cred.user_id;
    const email = cred.email;
    if (!userId || !uuidRegex.test(userId)) {
      failures.push(`Invalid or missing UUID for user ${email || 'unknown'}`);
      continue;
    }
    if (!email || !isDisposable(email)) {
      failures.push(`User ${userId} does not appear to be a disposable test user`);
      continue;
    }

    // Delete rows from child tables first
    for (const tbl of tables) {
      const { error } = await supabase.from(tbl).delete().eq('user_id', userId);
      if (error && !error.message.includes('Could not find the table')) {
        failures.push(`Failed to delete from ${tbl} for ${userId}: ${error.message}`);
      }
    }

    // Delete storage objects owned by the user (recursive)
    const { data: list, error: listErr } = await supabase.storage.from('knowledge-files').list(`${userId}/`);
    if (listErr) {
      failures.push(`Failed to list storage objects for ${userId}: ${listErr.message}`);
    } else if (list && list.length > 0) {
      const paths = list.map(obj => `${userId}/${obj.name}`);
      const { error: rmErr } = await supabase.storage.from('knowledge-files').remove(paths);
      if (rmErr) {
        failures.push(`Failed to remove storage objects for ${userId}: ${rmErr.message}`);
      }
    }

    // Finally delete the Auth user
    const { error: delUserErr } = await supabase.auth.admin.deleteUser(userId);
    if (delUserErr) {
      // Treat "User not found" as already cleaned
      if (delUserErr.message && delUserErr.message.includes('User not found')) {
        // no action needed
      } else {
        failures.push(`Failed to delete Auth user ${userId}: ${delUserErr.message}`);
      }
    }
  }

  // Post‑cleanup verification – ensure no leftover data
  for (const cred of users) {
    const uid = cred.id || cred.user_id;
    for (const tbl of tables) {
      const { data, error: cntErr } = await supabase.from(tbl).select('id', { count: 'exact', head: true }).eq('user_id', uid);
      if (cntErr) {
        failures.push(`Verification error on ${tbl} for ${uid}: ${cntErr.message}`);
      } else if (data && data.length > 0) {
        failures.push(`Residual rows in ${tbl} for ${uid}`);
      }
    }
    // Storage verification
    const { data: sList, error: sErr } = await supabase.storage.from('knowledge-files').list(`${uid}/`);
    if (sErr) {
      failures.push(`Storage verification error for ${uid}: ${sErr.message}`);
    } else if (sList && sList.length > 0) {
      failures.push(`Residual storage objects for ${uid}`);
    }
  }

  // Delete credential file (always attempt)
  try {
    fs.unlinkSync(credsPath);
  } catch (e) {
    // ignore if already removed
  }

  if (failures.length > 0) {
    console.error('Cleanup completed with errors:');
    failures.forEach(msg => console.error('- ', msg));
    process.exit(1);
  } else {
    console.log('Temporary users cleanup successful');
    process.exit(0);
  }
})();
