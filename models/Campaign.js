const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    blockchainCampaignId: {
      type: Number,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    organizationWallet: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    goalAmount: {
      type: String, // Tinh bang Wei hoac ETH
      required: true,
    },
    totalDonated: {
      type: String,
      default: '0',
    },
    totalDistributed: {
      type: String,
      default: '0',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function(value) {
          return this.startDate && value > this.startDate;
        },
        message: 'endDate phai lon hon startDate',
      },
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'closed'],
      default: 'active',
    },
    transactionHash: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
