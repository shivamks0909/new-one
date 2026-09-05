require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const email = process.env.ADMIN_EMAIL || 'admin@cawi.io';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const secret = process.env.AUTH_SECRET || 'oi-platform-auth-secret-prod-secure-32chars';
const passwordHash = crypto.createHmac('sha256', secret).update(password).digest('hex');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser() {
  try {
    // Try using Supabase Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Admin User' }
    });
    
    if (error) {
      console.log('Auth error:', error.message);
      // Try getting user
      const { data: users } = await supabase.auth.admin.listUsers();
      console.log('Existing users:', users.users.map(u => u.email));
    } else {
      console.log('User created in Supabase Auth:', data.user.email);
      
      // Also create in public.users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: data.user.id,
          full_name: 'Admin User',
          email: email,
          role: 'ADMIN',
          status: 'ACTIVE',
          password_hash: passwordHash
        })
        .select()
        .single();
        
      if (profileError) console.log('Profile error:', profileError.message);
      else console.log('Profile created:', profile.email);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createUser();
