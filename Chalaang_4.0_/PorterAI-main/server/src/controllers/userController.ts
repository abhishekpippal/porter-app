import { Request, Response } from "express";
import User from "../models/User";

export const createUser = async (req: Request, res: Response) => {
  try {
    console.log("📥 Incoming /api/users POST:", req.body); // 🔍 log the payload

    const { name, phone, pan, bankAccount } = req.body;

    if (!name || !phone || !pan || !bankAccount) {
      return res.status(400).json({
        error: "Missing required fields",
        received: { name, phone, pan, bankAccount },
      });
    }

    // This is for the onboarding flow, so we'll create a simpler user record
    // or update existing user if they already have an auth account
    const userEmail = req.body.email; // Optional email from onboarding
    let user;

    if (userEmail) {
      // If email provided, try to find existing user and update
      user = await User.findOne({ email: userEmail });
      if (user) {
        // Update existing user with onboarding data
        user.phone = phone.trim();
        // Note: pan and bankAccount would typically be stored in a separate profile model
        await user.save();
        return res.json({
          message: 'User profile updated successfully',
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
          }
        });
      }
    }

    // For onboarding without prior auth, create a minimal user record
    // This is a simplified version - in production you'd want separate models
    user = new User({
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      email: userEmail || `${phone}@temp.porter.com`, // Temporary email
      phone: phone.trim(),
      password: 'temp-password', // This user would need to complete signup later
      isVerified: false,
    });

    await user.save();
    res.json({
      message: 'Onboarding data saved successfully',
      user: {
        id: user._id,
        name,
        phone,
        pan,
        bankAccount,
      }
    });
  } catch (err: any) {
    console.error("❌ Error creating user:", err);
    res.status(500).json({ error: "Failed to create user", details: err.message });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-password'); // Don't return password
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      }
    });
  } catch (err: any) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user", details: err.message });
  }
};
