const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Distribution = require('../models/Distribution');

// Thong ke tong quan cho Dashboard minh bach
router.get('/stats', async (req, res) => {
  try {
    const totalCampaigns = await Campaign.countDocuments();
    const totalDonations = await Donation.countDocuments();
    const totalDistributions = await Distribution.countDocuments({ status: 'executed' });

    const campaigns = await Campaign.find({}, 'totalDonated totalDistributed');

    const sumDonated = campaigns.reduce((acc, c) => {
      try { return c.totalDonated ? acc + BigInt(c.totalDonated) : acc; } catch { return acc; }
    }, BigInt(0));
    const sumDistributed = campaigns.reduce((acc, c) => {
      try { return c.totalDistributed ? acc + BigInt(c.totalDistributed) : acc; } catch { return acc; }
    }, BigInt(0));

    // 10 giao dich quyen gop moi nhat
    const recentDonations = await Donation.find()
      .sort({ timestamp: -1 })
      .limit(10);

    // 10 giao dich phan phoi moi nhat
    const recentDistributions = await Distribution.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        totalCampaigns,
        totalDonations,
        totalDistributions,
        totalDonatedWei: sumDonated.toString(),
        totalDistributedWei: sumDistributed.toString(),
        recentDonations,
        recentDistributions,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
