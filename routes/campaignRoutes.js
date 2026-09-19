const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');

// Lay danh sach tat ca chien dich
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lay chi tiet chien dich theo blockchainCampaignId
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ blockchainCampaignId: Number(req.params.id) });
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Khong tim thay chien dich' });
    }
    res.json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lay danh sach chien dich theo vi to chuc
router.get('/organization/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const campaigns = await Campaign.find({ organizationWallet: wallet }).sort({ createdAt: -1 });
    res.json({ success: true, data: campaigns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tao hoac dong bo chien dich moi tu blockchain
router.post('/', async (req, res) => {
  try {
    const {
      blockchainCampaignId,
      title,
      description,
      organizationWallet,
      goalAmount,
      startDate,
      endDate,
      transactionHash,
    } = req.body;

    if (!title || !organizationWallet || !goalAmount || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Thieu cac truong bat buoc' });
    }

    let campaign = await Campaign.findOne({ blockchainCampaignId });
    if (campaign) {
      return res.status(400).json({ success: false, message: 'Chien dich da ton tai tren he thong' });
    }

    campaign = new Campaign({
      blockchainCampaignId,
      title,
      description,
      organizationWallet: organizationWallet.toLowerCase(),
      goalAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      transactionHash,
    });

    await campaign.save();
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
