import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from '../config/database';
import User from '../models/User';

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

async function createTestUsers() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Check if MongoDB URL is available
    console.log('MongoDB URL:', process.env.MONGODB_URI ? 'Available' : 'Not set');
    
    await connectDB();
    console.log('✅ Database connected successfully!');
    
    console.log('🧹 Clearing existing test users...');
    // Remove existing test users
    await User.deleteMany({ 
      email: { $in: testUsers.map(user => user.email) }
    });

    console.log('👥 Creating test users...');
    
    for (const userData of testUsers) {
      console.log(`Creating user: ${userData.firstName} ${userData.lastName}`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      // Create user
      const user = new User({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        isVerified: true, // Mark as verified for testing
      });
      
      await user.save();
      console.log(`✅ Created: ${userData.firstName} ${userData.lastName} (${userData.email})`);
    }
    
    console.log('\n🎉 Test users created successfully!');
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
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  }
}

// Run the script
createTestUsers();
