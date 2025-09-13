import mongoose, { Schema, Document } from 'mongoose';

export interface IDriverEarnings extends Document {
  driverId: string;
  date: Date;
  totalEarnings: number;
  netEarnings: number;
  tripEarnings: [{
    tripId: string;
    amount: number;
    distance: number;
    timeTaken: number;
    customerRating?: number;
  }];
  expenses: [{
    type: 'FUEL' | 'TOLL' | 'MAINTENANCE' | 'PENALTY';
    amount: number;
    description?: string;
    timestamp: Date;
  }];
  penalties: [{
    type: string;
    amount: number;
    reason: string;
    timestamp: Date;
  }];
  performanceMetrics: {
    totalTrips: number;
    completionRate: number;
    avgRating: number;
    totalDistance: number;
  };
}

const DriverEarningsSchema = new Schema({
  driverId: { type: String, required: true },
  date: { type: Date, required: true },
  totalEarnings: { type: Number, required: true },
  netEarnings: { type: Number, required: true },
  tripEarnings: [{
    tripId: { type: String, required: true },
    amount: { type: Number, required: true },
    distance: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    customerRating: { type: Number }
  }],
  expenses: [{
    type: { type: String, enum: ['FUEL', 'TOLL', 'MAINTENANCE', 'PENALTY'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    timestamp: { type: Date, required: true }
  }],
  penalties: [{
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    timestamp: { type: Date, required: true }
  }],
  performanceMetrics: {
    totalTrips: { type: Number, required: true },
    completionRate: { type: Number, required: true },
    avgRating: { type: Number, required: true },
    totalDistance: { type: Number, required: true }
  }
}, {
  timestamps: true
});

// Add indices for common queries
DriverEarningsSchema.index({ driverId: 1, date: -1 });

export default mongoose.model<IDriverEarnings>('DriverEarnings', DriverEarningsSchema);
