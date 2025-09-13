import fetch from 'node-fetch';

const testUsers = [
  {
    firstName: 'Rahul',
    lastName: 'Sharma',
    email: 'rahul.sharma@test.com',
    phone: '+91-9876543210',
    password: 'password123',
  },
  {
    firstName: 'Priya',
    lastName: 'Patel',
    email: 'priya.patel@test.com',
    phone: '+91-8765432109',
    password: 'password123',
  },
  {
    firstName: 'Amit',
    lastName: 'Kumar',
    email: 'amit.kumar@test.com',
    phone: '+91-7654321098',
    password: 'password123',
  },
  {
    firstName: 'Sneha',
    lastName: 'Singh',
    email: 'sneha.singh@test.com',
    phone: '+91-6543210987',
    password: 'password123',
  },
];

async function createTestUsersViaAPI() {
  console.log('🚀 Creating test users via API calls...\n');
  
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    console.log(`Creating user ${i + 1}/4: ${user.firstName} ${user.lastName}`);
    
    try {
      const response = await fetch('http://localhost:5001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(user),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Created: ${user.firstName} ${user.lastName}`);
      } else {
        console.log(`❌ Failed to create ${user.firstName}: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ Network error creating ${user.firstName}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Test user creation process completed!');
  console.log('\n📋 Test User Credentials:');
  console.log('========================================');
  
  testUsers.forEach((user, index) => {
    console.log(`\n👤 User ${index + 1}:`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Password: ${user.password}`);
  });
  
  console.log('\n========================================');
  console.log('💡 You can now use these credentials to login to the application!');
  console.log('🌐 Frontend URL: http://localhost:5176');
  console.log('🔐 Go to the Login page and use any of the above credentials');
}

// Run the script
createTestUsersViaAPI().catch(console.error);
