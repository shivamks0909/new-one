import assert from 'assert';

const BASE_URL = 'http://localhost:3001/api';

async function runAuthTests() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🔐 RUNNING PRODUCTION AUTHENTICATION & RBAC SECURITY TEST');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // 1. Test Admin login with identifier 'admin' and password 'admin'
  console.log('👉 [STEP 1] Testing Admin login with identifier "admin"...');
  const adminRes1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin' }),
  });
  assert.strictEqual(adminRes1.status, 200, 'Admin login with identifier "admin" must succeed');
  const adminData1 = await adminRes1.json();
  assert(adminData1.success, 'Login response must have success=true');
  assert.strictEqual(adminData1.data.user.role, 'ADMIN', 'Admin role must be ADMIN');
  assert.strictEqual(adminData1.data.user.email, 'admin@cawi.io', 'Admin email must be admin@cawi.io');
  assert(!adminData1.data.user.password_hash, 'Password hash must NEVER be exposed in login response');
  console.log('   ✓ Admin login with "admin" successful. Role: ADMIN, Token issued.');

  // 2. Test Admin login with full email 'admin@cawi.io'
  console.log('👉 [STEP 2] Testing Admin login with "admin@cawi.io"...');
  const adminRes2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cawi.io', password: 'admin' }),
  });
  assert.strictEqual(adminRes2.status, 200, 'Admin login with "admin@cawi.io" must succeed');
  const adminToken = (await adminRes2.json()).data.token;
  console.log('   ✓ Admin login with full email successful.');

  // 3. Test Vendor login with identifier 'vendor' and password 'vendor123'
  console.log('👉 [STEP 3] Testing Vendor login with identifier "vendor"...');
  const vendorRes1 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vendor', password: 'vendor123' }),
  });
  assert.strictEqual(vendorRes1.status, 200, 'Vendor login with identifier "vendor" must succeed');
  const vendorData1 = await vendorRes1.json();
  assert.strictEqual(vendorData1.data.user.role, 'VENDOR', 'Vendor role must be VENDOR');
  assert.strictEqual(vendorData1.data.user.email, 'vendor@test.com', 'Vendor email must be vendor@test.com');
  assert(vendorData1.data.user.vendor_id, 'Vendor user must have non-null vendor_id');
  console.log(`   ✓ Vendor login with "vendor" successful. Vendor ID: ${vendorData1.data.user.vendor_id}`);

  // 4. Test Vendor login with full email 'vendor@test.com'
  console.log('👉 [STEP 4] Testing Vendor login with "vendor@test.com"...');
  const vendorRes2 = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vendor@test.com', password: 'vendor123' }),
  });
  assert.strictEqual(vendorRes2.status, 200, 'Vendor login with "vendor@test.com" must succeed');
  const vendorToken = (await vendorRes2.json()).data.token;
  console.log('   ✓ Vendor login with full email successful.');

  // 5. Test RBAC: Admin can access Admin endpoints
  console.log('👉 [STEP 5] Testing RBAC: Admin accessing protected admin endpoint (/finance/summary)...');
  const adminAccessRes = await fetch(`${BASE_URL}/finance/summary`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(adminAccessRes.status, 200, 'Admin must be authorized for /finance/summary');
  console.log('   ✓ Admin authorized to access finance summary.');

  // 6. Test RBAC: Vendor CANNOT access Admin endpoints
  console.log('👉 [STEP 6] Testing RBAC: Vendor attempting to access Admin endpoint (/finance/invoices/preview)...');
  const vendorAccessRes = await fetch(`${BASE_URL}/finance/invoices/preview?project_id=11111111-1111-1111-1111-111111111111`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  assert.strictEqual(vendorAccessRes.status, 403, 'Vendor must be forbidden (403) from /finance/invoices/preview');
  const errData = await vendorAccessRes.json();
  assert.strictEqual(errData.error.code, 'FORBIDDEN', 'Error code must be FORBIDDEN');
  console.log('   ✓ Vendor access blocked with 403 FORBIDDEN as expected.');

  // 7. Test invalid token rejection
  console.log('👉 [STEP 7] Testing invalid token rejection...');
  const invalidRes = await fetch(`${BASE_URL}/finance/summary`, {
    headers: { Authorization: 'Bearer invalid.tampered.token' },
  });
  assert.strictEqual(invalidRes.status, 401, 'Tampered token must return 401');
  console.log('   ✓ Tampered token rejected with 401 UNAUTHORIZED.');

  // 8. Test wrong password handling
  console.log('👉 [STEP 8] Testing wrong password rejection...');
  const wrongRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cawi.io', password: 'WrongPassword999!' }),
  });
  assert.strictEqual(wrongRes.status, 401, 'Wrong password must return 401');
  const wrongData = await wrongRes.json();
  assert.strictEqual(wrongData.error.code, 'INVALID_CREDENTIALS');
  console.log('   ✓ Wrong password rejected with 401 INVALID_CREDENTIALS.');

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('🎉 ALL AUTHENTICATION & RBAC SECURITY TESTS PASSED (100%)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runAuthTests().catch((err) => {
  console.error('\n❌ AUTH TEST FAILED:', err);
  process.exit(1);
});
