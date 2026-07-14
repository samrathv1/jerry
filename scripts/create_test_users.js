const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function createUser() {
  const email = `test-${Date.now()}-${Math.random().toString(36).substring(2,8)}@example.com`;
  const password = crypto.randomBytes(12).toString('base64');
  const { data: user, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
  if (loginErr) throw loginErr;
  return {
    email,
    password,
    access_token: login.session.access_token,
    refresh_token: login.session.refresh_token,
    user_id: user.user.id,
  };
}

(async () => {
  const users = [await createUser(), await createUser()];
  console.log(JSON.stringify(users));
})();
