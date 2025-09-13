import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../config/database';
import DriverEarnings from '../models/DriverEarnings';
import DriverPerformance from '../models/DriverPerformance';

dotenv.config();

const sampleDriverId = 'DRIVER-001';

const sampleEarnings = {
  driverId: sampleDriverId,
  date: new Date(),
  totalEarnings: 1850,
  netEarnings: 1500,
  tripEarnings: [
    {
      tripId: 'TRIP-001',
      amount: 450,
      distance: 8.5,
      timeTaken: 45,
      customerRating: 4.5
    },
    {
      tripId: 'TRIP-002',
      amount: 380,
      distance: 6.2,
      timeTaken: 35,
      customerRating: 5
    },
    {
      tripId: 'TRIP-003',
      amount: 520,
      distance: 12.0,
      timeTaken: 55,
      customerRating: 4.8
    }
  ],
  expenses: [
    {
      type: 'FUEL',
      amount: 200,
      description: 'Morning fuel refill',
      timestamp: new Date()
    },
    {
      type: 'TOLL',
      amount: 100,
      description: 'Highway toll',
      timestamp: new Date()
    },
    {
      type: 'MAINTENANCE',
      amount: 50,
      description: 'Vehicle cleaning',
      timestamp: new Date()
    }
  ],
  penalties: [],
  performanceMetrics: {
    totalTrips: 3,
    completionRate: 100,
    avgRating: 4.77,
    totalDistance: 26.7
  }
};

const samplePerformance = {
  driverId: sampleDriverId,
  weekStartDate: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())),
  weekEndDate: new Date(new Date().setDate(new Date().getDate() + (6 - new Date().getDay()))),
  weeklyMetrics: {
    totalTrips: 18,
    completedTrips: 17,
    cancelledTrips: 1,
    totalEarnings: 8500,
    avgEarningsPerTrip: 472,
    avgTimePerTrip: 42,
    totalWorkingHours: 45,
    activeHours: 38,
    customerRatings: [5, 4.5, 4.8, 5, 4.7],
    avgRating: 4.8
  },
  insights: [
    {
      type: 'EARNINGS',
      insight: 'Your earnings are 15% above average in your area',
      score: 85,
      recommendations: ['Keep maintaining high completion rate', 'Continue focusing on customer service'],
      timestamp: new Date()
    },
    {
      type: 'PERFORMANCE',
      insight: 'Your customer ratings are consistently high',
      score: 90,
      recommendations: ['Share your best practices with other drivers'],
      timestamp: new Date()
    },
    {
      type: 'EFFICIENCY',
      insight: 'Your average delivery time is better than 80% of drivers',
      score: 80,
      recommendations: ['Try to maintain this excellent delivery speed'],
      timestamp: new Date()
    }
  ],
  busyHours: [
    {
      dayOfWeek: 1,
      hour: 9,
      averageTrips: 2.5,
      averageEarnings: 1200
    },
    {
      dayOfWeek: 1,
      hour: 18,
      averageTrips: 3.0,
      averageEarnings: 1500
    },
    {
      dayOfWeek: 5,
      hour: 19,
      averageTrips: 3.2,
      averageEarnings: 1600
    }
  ],
  hotspots: [
    {
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      },
      name: 'Central Business District',
      averageTripsPerDay: 4,
      bestTimings: ['9:00-11:00', '18:00-20:00']
    }
  ]
};

async function seedDatabase() {
  try {
    await connectDB();

    // Clear existing data
    await DriverEarnings.deleteMany({});
    await DriverPerformance.deleteMany({});

    // Insert sample data
    await DriverEarnings.create(sampleEarnings);
    await DriverPerformance.create(samplePerformance);

    console.log('Sample data inserted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
