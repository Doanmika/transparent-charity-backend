const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const { updateCampaignTotal } = require('../utils/campaignUtils');

// Lay tat ca quyen gop
router.get('/', async (req, res) => {
  try {
    const donations = await Donation.find().sort({ timestamp: -1 });
    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lay quyen gop theo chien dich
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const donations = await Donation.find({
      blockchainCampaignId: Number(req.params.campaignId),
    }).sort({ timestamp: -1 });
    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lay lich su quyen gop cua mot vi Donor
router.get('/donor/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet.toLowerCase();
    const donations = await Donation.find({ donorWallet: wallet }).sort({ timestamp: -1 });
    res.json({ success: true, data: donations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ghi nhan quyen gop moi (thuong duoc goi tu frontend hoac event listener)
router.post('/', async (req, res) => {
  try {
    const {
      blockchainCampaignId,
      donorWallet,
      amount,
      transactionHash,
      blockNumber,
      timestamp,
    } = req.body;

    if (!blockchainCampaignId || !donorWallet || !amount || !transactionHash) {
      return res.status(400).json({ success: false, message: 'Thong tin quy ong bi thieu' });
    }

    // Kiem tra neu da ton tai hash
    let existing = await Donation.findOne({ transactionHash: transactionHash.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Giao dich da duoc ghi nhan truoc do', data: existing });
    }

    const campaign = await Campaign.findOne({ blockchainCampaignId: Number(blockchainCampaignId) });

    if (!campaign) {
      return res.status(400).json({ success: false, message: 'Chien dich khong ton tai' });
    }

    if (!donorWallet || !/^0x[a-fA-F0-9]{40}$/.test(donorWallet)) {
      return res.status(400).json({ success: false, message: 'Dia chi vi nguoi quyen gop khong hop le' });
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: 'So tien quyen gop khong hop le' });
    }
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return res.status(400).json({ success: false, message: 'So tien quyen gop phai lon hon 0' });
    }

    const donation = new Donation({
      blockchainCampaignId: Number(blockchainCampaignId),
      campaign: campaign ? campaign._id : null,
      donorWallet: donorWallet.toLowerCase(),
      amount,
      transactionHash: transactionHash.toLowerCase(),
      blockNumber: blockNumber || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      status: 'confirmed',
    });

await donation.save();

    // Cap nhat tong quyen gop trong Campaign bang transaction de tranh race condition
    try {
      await updateCampaignTotal(Number(blockchainCampaignId), 'totalDonated', amount);
    } catch (e) {
      console.error('Loi cap nhat totalDonated trong Campaign:', e.message);
    }

    // Tra 409 Conflict neu da ton tai (duplicate)
    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
