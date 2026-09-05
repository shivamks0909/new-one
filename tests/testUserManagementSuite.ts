import assert from 'assert';

const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('🧪 Starting Comprehensive User Management & IAM Integration Suite...\n');

  // 1. Admin login with simple credentials
  console.log('1. Testing Admin login (admin / admin)...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin' }),
  });
  assert.strictEqual(loginRes.status, 200, 'Admin login failed');
  const loginJson = await loginRes.json();
  const loginData = loginJson.data || loginJson;
  assert.ok(loginData.token, 'Token not returned');
  assert.strictEqual(loginData.user.role, 'ADMIN', 'Role is not ADMIN');
  const adminToken = loginData.token;
  console.log('   ✅ Admin logged in successfully. Token acquired.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // 2. Summary stats
  console.log('2. Testing GET /admin/users/summary...');
  const summaryRes = await fetch(`${BASE_URL}/admin/users/summary`, { headers: authHeaders });
  assert.strictEqual(summaryRes.status, 200);
  const summary = (await summaryRes.json()).data;
  console.log('   Stats:', summary);
  assert.ok(summary.total_users >= 1, 'Total users should be >= 1');
  assert.ok(summary.active_users >= 1, 'Active users should be >= 1');
  console.log('   ✅ Summary metrics verified.\n');

  // 3. Fetch existing vendors to assign
  console.log('3. Fetching vendor list to test vendor user assignment...');
  const vendorsRes = await fetch(`${BASE_URL}/vendors?limit=5`, { headers: authHeaders });
  const vendorsData = await vendorsRes.json();
  const testVendor = vendorsData.vendors?.[0];
  assert.ok(testVendor, 'At least one vendor must exist in the database');
  console.log(`   Using test vendor: "${testVendor.name}" (${testVendor.id})\n`);

  // 4. Role Behavior: VENDOR requires vendor assignment
  console.log('4. Testing validation: VENDOR without vendor assignment must fail (400)...');
  const failVendorRes = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: `test_novendor_${Date.now()}@vendor.com`,
      full_name: 'Test No Vendor',
      role: 'VENDOR',
      password: 'Password123!',
    }),
  });
  assert.strictEqual(failVendorRes.status, 400, 'Expected 400 Bad Request when vendor is missing');
  console.log('   ✅ Rejected VENDOR without vendor assignment with 400.\n');

  // 5. Create VENDOR user
  console.log('5. Testing creation of valid VENDOR user...');
  const vendorUserEmail = `vendor_rep_${Date.now()}@testing.com`;
  const vendorUserPassword = 'InitialVendorPassword123!';
  const createVendorRes = await fetch(`${BASE_URL}/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email: vendorUserEmail,
      full_name: 'Rahul Sharma',
      role: 'VENDOR',
      vendor_id: testVendor.id,
      password: vendorUserPassword,
      status: 'ACTIVE',
    }),
  });
  assert.strictEqual(createVendorRes.status, 201, 'Failed to create vendor user');
  const createdVendorUser = (await createVendorRes.json()).data;
  assert.strictEqual(createdVendorUser.role, 'VENDOR');
  assert.strictEqual(createdVendorUser.vendor_id, testVendor.id);
  assert.strictEqual(createdVendorUser.status, 'ACTIVE');
  console.log(`   ✅ Created vendor user: ${createdVendorUser.email} (ID: ${createdVendorUser.id})\n`);

  // 6. Test Vendor User Login & Vendor Data Isolation (RBAC)
  console.log('6. Testing Vendor Authentication & RBAC Isolation...');
  const vendorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: vendorUserEmail, password: vendorUserPassword }),
  });
  assert.strictEqual(vendorLoginRes.status, 200, 'Vendor login failed');
  const vendorLoginJson = await vendorLoginRes.json();
  const vendorLoginData = vendorLoginJson.data || vendorLoginJson;
  const vendorToken = vendorLoginData.token;
  assert.strictEqual(vendorLoginData.user.role, 'VENDOR');
  assert.strictEqual(vendorLoginData.user.vendor_id, testVendor.id);
  console.log('   Vendor logged in successfully.');

  // Vendor attempts to access admin endpoint: must return 403
  const vendorAdminAccess = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert.strictEqual(vendorAdminAccess.status, 403, 'Vendor should be forbidden from /admin/users');
  console.log('   ✅ Vendor RBAC isolation verified: 403 Forbidden on admin routes.\n');

  // 7. Password Reset & Force Password Change
  console.log('7. Testing Admin Reset Password for user with force_password_change...');
  const tempPassword = 'NewTempPassword999!';
  const resetPwRes = await fetch(`${BASE_URL}/admin/users/${createdVendorUser.id}/reset-password`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ password: tempPassword, force_password_change: true }),
  });
  assert.strictEqual(resetPwRes.status, 200, 'Reset password failed');
  const resetPwData = await resetPwRes.json();
  assert.strictEqual(resetPwData.data.force_password_change, true);
  console.log('   ✅ Password reset verified with force_password_change = true.\n');

  // Login with new temp password succeeds
  const tempLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: vendorUserEmail, password: tempPassword }),
  });
  assert.strictEqual(tempLoginRes.status, 200, 'Login with reset password should succeed');
  console.log('   ✅ Login with temporary password confirmed.\n');

  // 8. Suspend User & Suspension Lockout Test (Section 9 & 22)
  console.log('8. Testing Suspend User & Suspension Login Enforcement...');
  const suspendRes = await fetch(`${BASE_URL}/admin/users/${createdVendorUser.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'SUSPENDED' }),
  });
  assert.strictEqual(suspendRes.status, 200, 'Failed to suspend user');
  const suspendedUser = (await suspendRes.json()).data;
  assert.strictEqual(suspendedUser.status, 'SUSPENDED');
  console.log('   User status updated to SUSPENDED.');

  // Login attempt while suspended must be rejected with 403 ACCOUNT_SUSPENDED
  const suspendedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: vendorUserEmail, password: tempPassword }),
  });
  assert.strictEqual(suspendedLoginRes.status, 403, 'Suspended user should get 403');
  const suspendedLoginBody = await suspendedLoginRes.json();
  assert.strictEqual(suspendedLoginBody.error?.code, 'ACCOUNT_SUSPENDED');
  assert.strictEqual(suspendedLoginBody.error?.message, 'Account suspended. Contact administrator.');
  console.log(`   ✅ Suspended login rejected with exact blueprint message: "${suspendedLoginBody.error?.message}"\n`);

  // 9. Reactivate User (Section 10)
  console.log('9. Testing Reactivate User...');
  const reactivateRes = await fetch(`${BASE_URL}/admin/users/${createdVendorUser.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  assert.strictEqual(reactivateRes.status, 200);
  const reactivatedUser = (await reactivateRes.json()).data;
  assert.strictEqual(reactivatedUser.status, 'ACTIVE');

  // Verify login now works again
  const activeLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: vendorUserEmail, password: tempPassword }),
  });
  assert.strictEqual(activeLoginRes.status, 200, 'Reactivated user should be able to log in');
  console.log('   ✅ Reactivated user authenticated successfully.\n');

  // 10. Audit Activity Trail (Section 13 & 27)
  console.log('10. Testing User Audit Activity Trail...');
  const activityRes = await fetch(`${BASE_URL}/admin/users/${createdVendorUser.id}/activity`, {
    headers: authHeaders,
  });
  assert.strictEqual(activityRes.status, 200);
  const activities = (await activityRes.json()).data.activity;
  console.log(`   Found ${activities.length} audit activity event(s).`);
  assert.ok(activities.length > 0, 'Should have logged audit events');
  const actions = activities.map((a: any) => a.action);
  console.log('   Audit actions recorded:', actions);
  assert.ok(actions.includes('USER_CREATED') || actions.includes('USER_SUSPENDED') || actions.includes('PASSWORD_RESET'));
  console.log('   ✅ Real audit activity verified.\n');

  // 11. Bulk Operations (Section 18)
  console.log('11. Testing Bulk Status Update...');
  const bulkRes = await fetch(`${BASE_URL}/admin/users/bulk-status`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ ids: [createdVendorUser.id], status: 'ACTIVE' }),
  });
  assert.strictEqual(bulkRes.status, 200);
  const bulkData = await bulkRes.json();
  assert.strictEqual(bulkData.data.updated, 1);
  console.log('   ✅ Bulk operation successful.\n');

  // 12. Excel Export (Section 19)
  console.log('12. Testing Enterprise User Export (.xlsx)...');
  const exportRes = await fetch(`${BASE_URL}/admin/users/export`, { headers: authHeaders });
  assert.strictEqual(exportRes.status, 200);
  assert.strictEqual(
    exportRes.headers.get('content-type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  const buffer = await exportRes.arrayBuffer();
  assert.ok(buffer.byteLength > 1000, 'Excel export should contain data');
  console.log(`   ✅ Excel export downloaded (${buffer.byteLength} bytes).\n`);

  // 13. Soft Delete User (Section 11)
  console.log('13. Testing Soft Delete User...');
  const deleteRes = await fetch(`${BASE_URL}/admin/users/${createdVendorUser.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(deleteRes.status, 200);
  const deletedData = await deleteRes.json();
  assert.strictEqual(deletedData.data.status, 'SUSPENDED');
  console.log('   ✅ User successfully soft-deleted (status set to SUSPENDED).\n');

  console.log('🎉 ALL 13 USER MANAGEMENT & IAM SUITE TESTS PASSED PERFECTLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
