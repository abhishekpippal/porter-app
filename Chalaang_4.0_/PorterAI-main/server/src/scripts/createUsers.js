// Simple Node.js script to create test users
const https = require('https');
const http = require('http');

const testUsers = [
  {
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@example.com',
    phone: '+91 9876543210',
    password: 'password123',
  },
  {
    firstName: 'Priya', 
    lastName: 'Patel',
    email: 'priya.patel@example.com',
    phone: '+91 8765432109',
    password: 'password123',
  },
  {
    firstName: 'Amit',
    lastName: 'Kumar', 
    email: 'amit.kumar@example.com',
    phone: '+91 7654321098',
    password: 'password123',
  },
  {
    firstName: 'Sneha',
    lastName: 'Singh',
    email: 'sneha.singh@example.com',
    phone: '+91 6543210987',
    password: 'password123',
  },
];

function makeRequest(userData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(userData);
    
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Invalid JSON response' } });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function createTestUsers() {
  console.log('🚀 Creating test users via API calls...\n');
  
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`Creating user ${i + 1}/4: ${user.firstName} ${user.lastName}`);
    
    try {
      const result = await makeRequest(user);
      
      if (result.status === 201) {
        console.log(`✅ Successfully created: ${user.firstName} ${user.lastName}`);
      } else if (result.status === 409) {
        console.log(`⚠️ User already exists: ${user.firstName} ${user.lastName} (${result.data.error})`);
      } else {
        console.log(`❌ Failed to create ${user.firstName}: ${result.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Network error creating ${user.firstName}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Test user creation process completed!');
  console.log('\n📋 TEST USER CREDENTIALS:');
  console.log('==========================================');
  
  testUsers.forEach((user, index) => {
    console.log(`\n👤 User ${index + 1}:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Password: ${user.password}`);
  });
  
  console.log('\n==========================================');
  console.log('💡 LOGIN INSTRUCTIONS:');
  console.log('🌐 Frontend URL: http://localhost:5176');  
  console.log('🔐 Go to Login page and use any of the above credentials');
  console.log('📧 Use the EMAIL and PASSWORD to login');
}

// Run the script
createTestUsers().catch(console.error);
