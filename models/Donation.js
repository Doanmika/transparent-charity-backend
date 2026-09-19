const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    blockchainCampaignId: {
      type: Number,
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    donorWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    amount: {
      type: String, // Tinh bang Wei hoac ETH
      required: true,
    },
    transactionHash: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    blockNumber: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'confirmed',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common queries
donationSchema.index({ blockchainCampaignId: 1, timestamp: -1 });
donationSchema.index({ donorWallet: 1, timestamp: -1 });

module.exports = mongoose.model('Donation', donationSchema);
