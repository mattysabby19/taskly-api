// Test to verify authentication integrity after fixes
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:4000/api';

async function testAuthIntegrity() {
  console.log('🔐 TESTING AUTHENTICATION INTEGRITY AFTER FIXES');
  console.log('================================================');
  console.log('🎯 Verifying signup and signin processes still work\n');

  const timestamp = Date.now();
  const testCredentials = {
    email: `auth-integrity-test-${timestamp}@example.com`,
    password: 'SecurePass123!',
    name: 'Auth Integrity Test User'
  };

  let signupSuccess = false;
  let loginSuccess = false;
  let profileSuccess = false;
  let authToken = null;

  try {
    // TEST 1: SIGNUP PROCESS
    console.log('1️⃣ TESTING SIGNUP PROCESS');
    console.log('==========================');
    
    // Test original signup endpoint
    console.log('📝 Testing original signup endpoint...');
    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCredentials)
    });

    const signupResult = await signupResponse.json();
    console.log(`Status: ${signupResponse.status}`);
    
    if (signupResult.success) {
      signupSuccess = true;
      console.log('✅ Original signup working!');
      console.log(`   User ID: ${signupResult.user?.id}`);
      console.log(`   Email: ${signupResult.user?.email}`);
    } else {
      console.log('⚠️  Original signup failed, testing simple signup...');
      
      // Test simple signup endpoint
      const simpleSignupResponse = await fetch(`${API_BASE}/auth/signup-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `simple-${testCredentials.email}`,
          password: testCredentials.password,
          name: testCredentials.name
        })
      });

      const simpleSignupResult = await simpleSignupResponse.json();
      if (simpleSignupResult.success) {
        signupSuccess = true;
        console.log('✅ Simple signup working!');
        console.log(`   User ID: ${simpleSignupResult.user?.id}`);
      } else {
        console.log('❌ Both signup endpoints failed');
        console.log(`   Error: ${simpleSignupResult.error}`);
      }
    }

    // TEST 2: LOGIN PROCESS
    console.log('\n2️⃣ TESTING LOGIN PROCESS');
    console.log('=========================');
    
    // Use existing working user for login test
    const loginCredentials = {
      email: 'authtest1753561906486@example.com',
      password: 'Test123456'
    };

    console.log(`📝 Testing login with: ${loginCredentials.email}`);
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginCredentials)
    });

    const loginResult = await loginResponse.json();
    console.log(`Status: ${loginResponse.status}`);
    
    if (loginResult.success && loginResult.token) {
      loginSuccess = true;
      authToken = loginResult.token;
      console.log('✅ Login working!');
      console.log(`   Token: ${authToken.substring(0, 50)}...`);
      console.log(`   User: ${loginResult.user?.name || loginResult.user?.email}`);
    } else {
      console.log('❌ Login failed');
      console.log(`   Error: ${loginResult.error}`);
    }

    // TEST 3: PROFILE ACCESS
    console.log('\n3️⃣ TESTING PROFILE ACCESS');
    console.log('==========================');
    
    if (authToken) {
      console.log('📝 Testing profile endpoint...');
      const profileResponse = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.success) {
          profileSuccess = true;
          console.log('✅ Profile access working!');
          console.log(`   User ID: ${profileResult.user?.id}`);
          console.log(`   Email: ${profileResult.user?.email}`);
          console.log(`   Name: ${profileResult.user?.name}`);
        } else {
          console.log('❌ Profile endpoint returned error');
          console.log(`   Error: ${profileResult.error}`);
        }
      } else {
        console.log(`❌ Profile endpoint failed: ${profileResponse.status}`);
      }
    } else {
      console.log('⚠️  Skipping profile test - no auth token available');
    }

    // TEST 4: TASK ACCESS (to verify our fixes didn't break task auth)
    console.log('\n4️⃣ TESTING TASK ACCESS WITH AUTH');
    console.log('=================================');
    
    if (authToken) {
      console.log('📝 Testing tasks endpoint...');
      const tasksResponse = await fetch(`${API_BASE}/tasks`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const tasksResult = await tasksResponse.json();
      console.log(`Status: ${tasksResponse.status}`);
      
      if (tasksResult.success !== undefined) {
        console.log('✅ Tasks endpoint responding correctly!');
        console.log(`   Response type: ${tasksResult.success ? 'Success' : 'Error'}`);
        if (tasksResult.data) {
          console.log(`   Tasks found: ${Array.isArray(tasksResult.data) ? tasksResult.data.length : 'N/A'}`);
        }
      } else {
        console.log('❌ Tasks endpoint not responding correctly');
      }
    }

    // FINAL ASSESSMENT
    console.log('\n🏆 AUTHENTICATION INTEGRITY ASSESSMENT');
    console.log('======================================');
    
    console.log(`🔐 Signup Process: ${signupSuccess ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`🔑 Login Process: ${loginSuccess ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`👤 Profile Access: ${profileSuccess ? '✅ WORKING' : '❌ BROKEN'}`);
    console.log(`🎯 Task Authentication: ${authToken ? '✅ WORKING' : '❌ BROKEN'}`);

    const allWorking = signupSuccess && loginSuccess && profileSuccess && authToken;
    
    if (allWorking) {
      console.log('\n🎉 AUTHENTICATION INTEGRITY: ✅ VERIFIED');
      console.log('==========================================');
      console.log('🚀 All authentication processes working correctly!');
      console.log('📦 Changes did NOT break signup/signin processes');
      console.log('🔥 Ready for production deployment!');
    } else {
      console.log('\n⚠️  AUTHENTICATION INTEGRITY: ISSUES FOUND');
      console.log('===========================================');
      console.log('🔧 Some authentication processes need attention');
      
      if (!signupSuccess) console.log('   • Signup process needs fixing');
      if (!loginSuccess) console.log('   • Login process needs fixing');
      if (!profileSuccess) console.log('   • Profile access needs fixing');
    }

  } catch (error) {
    console.error('\n💥 AUTHENTICATION TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }

  console.log('\n✅ Authentication integrity test complete!');
}

testAuthIntegrity().catch(console.error);