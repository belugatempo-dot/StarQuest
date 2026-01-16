#!/usr/bin/env node

/**
 * Quick Supabase Connection Test
 *
 * Usage: node test-supabase-connection.js
 *
 * This script tests your Supabase connection and validates the setup.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read environment variables
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env.local file not found!');
  console.log('📝 Please create .env.local with your Supabase credentials');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');

// Validate credentials
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing credentials in .env.local');
  console.log('Required variables:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Validate URL format
if (!SUPABASE_URL.startsWith('https://') || !SUPABASE_URL.includes('.supabase.co')) {
  console.error('❌ Error: Invalid SUPABASE_URL format');
  console.log(`Current: ${SUPABASE_URL}`);
  console.log('Expected format: https://xxxxx.supabase.co');
  process.exit(1);
}

// Validate anon key format
if (!SUPABASE_ANON_KEY.startsWith('eyJ')) {
  console.error('❌ Error: Invalid SUPABASE_ANON_KEY format');
  console.log('The key should start with "eyJ" and be a long JWT token');
  console.log(`Current length: ${SUPABASE_ANON_KEY.length} characters`);
  console.log('Expected length: 200+ characters');
  process.exit(1);
}

console.log('✅ Credentials format valid\n');
console.log('📋 Configuration:');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${SUPABASE_ANON_KEY.substring(0, 20)}... (${SUPABASE_ANON_KEY.length} chars)\n`);

// Test 1: Test basic connectivity
console.log('Test 1: Testing basic connectivity...');
const url = new URL('/rest/v1/', SUPABASE_URL);

https.get(url.toString(), {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
}, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Basic connectivity: OK\n');

    // Test 2: Check if tables exist
    console.log('Test 2: Checking database tables...');
    const tablesUrl = new URL('/rest/v1/families?limit=0', SUPABASE_URL);

    https.get(tablesUrl.toString(), {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }, (res2) => {
      let data = '';
      res2.on('data', chunk => data += chunk);
      res2.on('end', () => {
        if (res2.statusCode === 200) {
          console.log('✅ Database tables: OK');
          console.log('✅ families table exists\n');

          // Test 3: Check database functions
          console.log('Test 3: Checking database functions...');
          const rpcUrl = new URL('/rest/v1/rpc/validate_invite_code', SUPABASE_URL);

          const postData = JSON.stringify({ p_invite_code: 'TEST1234' });
          const options = {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Content-Length': postData.length
            }
          };

          const req = https.request(rpcUrl.toString(), options, (res3) => {
            let data3 = '';
            res3.on('data', chunk => data3 += chunk);
            res3.on('end', () => {
              if (res3.statusCode === 200) {
                console.log('✅ Database functions: OK');
                console.log('✅ validate_invite_code function exists\n');

                console.log('═══════════════════════════════════════');
                console.log('🎉 SUCCESS! Supabase is properly configured!');
                console.log('═══════════════════════════════════════\n');
                console.log('Next steps:');
                console.log('1. Restart your dev server: npm run dev');
                console.log('2. Navigate to: http://localhost:3000/en/register');
                console.log('3. Create a test account\n');
              } else {
                console.log('⚠️  Database functions: Missing or not configured');
                console.log(`Status: ${res3.statusCode}`);
                console.log('\n📝 Action needed:');
                console.log('Run the complete schema in Supabase SQL Editor:');
                console.log('File: supabase/migrations/COMPLETE_SCHEMA.sql\n');
              }
            });
          });

          req.on('error', (err) => {
            console.error('❌ Error testing database functions:', err.message);
          });

          req.write(postData);
          req.end();

        } else {
          console.log('❌ Database tables: Not found');
          console.log(`Status: ${res2.statusCode}`);
          console.log('\n📝 Action needed:');
          console.log('1. Go to Supabase dashboard → SQL Editor');
          console.log('2. Run: supabase/migrations/COMPLETE_SCHEMA.sql');
          console.log('3. Run this test again\n');
        }
      });
    }).on('error', (err) => {
      console.error('❌ Error checking tables:', err.message);
    });

  } else {
    console.log(`❌ Connection failed with status: ${res.statusCode}`);
    console.log('\n📝 Possible issues:');
    console.log('1. Invalid credentials - check your .env.local');
    console.log('2. Supabase project not ready yet - wait 2-3 minutes');
    console.log('3. Network connectivity issues\n');
  }
}).on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  console.log('\n📝 Possible issues:');
  console.log('1. Invalid SUPABASE_URL');
  console.log('2. Network connectivity issues');
  console.log('3. Firewall blocking connection\n');
});
