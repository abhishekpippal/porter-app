import mongoose, { Schema, Document } from 'mongoose';

export interface IDriverPerformance extends Document {
  driverId: string;
  weekStartDate: Date;
  weekEndDate: Date;
  weeklyMetrics: {
    totalTrips: number;
    completedTrips: number;
    cancelledTrips: number;
    totalEarnings: number;
    avgEarningsPerTrip: number;
    avgTimePerTrip: number;
    totalWorkingHours: number;
    activeHours: number;
    customerRatings: number[];
    avgRating: number;
  };
  insights: [{
    type: 'EARNINGS' | 'PERFORMANCE' | 'EFFICIENCY' | 'CUSTOMER_SATISFACTION';
    insight: string;
    score: number;
    recommendations: string[];
    timestamp: Date;
  }];
  busyHours: [{
    dayOfWeek: number;
    hour: number;
    averageTrips: number;
    averageEarnings: number;
  }];
  hotspots: [{
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [number, number]
    },
    name: string;
    averageTripsPerDay: number;
    bestTimings: string[];
  }];
}

const DriverPerformanceSchema = new Schema({
  driverId: { type: String, required: true },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  weeklyMetrics: {
    totalTrips: { type: Number, default: 0 },
    completedTrips: { type: Number, default: 0 },
    cancelledTrips: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    avgEarningsPerTrip: { type: Number, default: 0 },
    avgTimePerTrip: { type: Number, default: 0 },
    totalWorkingHours: { type: Number, default: 0 },
    activeHours: { type: Number, default: 0 },
    customerRatings: [{ type: Number }],
    avgRating: { type: Number, default: 0 }
  },
  insights: [{
    type: { type: String, enum: ['EARNINGS', 'PERFORMANCE', 'EFFICIENCY', 'CUSTOMER_SATISFACTION'], required: true },
    insight: { type: String, required: true },
    score: { type: Number, required: true },
    recommendations: [{ type: String }],
    timestamp: { type: Date, default: Date.now }
  }],
  busyHours: [{
    dayOfWeek: { type: Number, required: true }, // 0-6 for Sunday-Saturday
    hour: { type: Number, required: true }, // 0-23
    averageTrips: { type: Number, required: true },
    averageEarnings: { type: Number, required: true }
  }],
  hotspots: [{
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    },
    name: { type: String, required: true },
    averageTripsPerDay: { type: Number, required: true },
    bestTimings: [{ type: String }]
  }]
}, {
  timestamps: true
});

// Add indices for common queries
DriverPerformanceSchema.index({ driverId: 1, weekStartDate: -1 });
DriverPerformanceSchema.index({ 'hotspots.location': '2dsphere' });

export default mongoose.model<IDriverPerformance>('DriverPerformance', DriverPerformanceSchema);
