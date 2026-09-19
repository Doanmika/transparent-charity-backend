const mongoose = require('mongoose');

const distributionSchema = new mongoose.Schema(
  {
    blockchainRequestId: {
      type: Number,
      required: true,
      unique: true,
    },
    blockchainCampaignId: {
      type: Number,
      required: true,
    },
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
    },
    organizationWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    amount: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'executed', 'rejected'],
      default: 'requested',
    },
    transactionHash: {
      type: String,
      default: '',
      lowercase: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common queries
distributionSchema.index({ blockchainCampaignId: 1, status: 1 });
distributionSchema.index({ organizationWallet: 1, timestamp: -1 });
distributionSchema.index({ recipient: 1, timestamp: -1 });

module.exports = mongoose.model('Distribution', distributionSchema);
