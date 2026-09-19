const express = require('express');
const router = express.Router();
const Distribution = require('../models/Distribution');
const Campaign = require('../models/Campaign');
const { updateCampaignTotal } = require('../utils/campaignUtils');

// Lay tat ca yeu cau phan phoi (cho Admin hoac Dashboard)
router.get('/', async (req, res) => {
  try {
    const distributions = await Distribution.find().sort({ timestamp: -1 });
    res.json({ success: true, data: distributions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lay yeu cau phan phoi theo chien dich
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const distributions = await Distribution.find({
      blockchainCampaignId: Number(req.params.campaignId),
    }).sort({ timestamp: -1 });
    res.json({ success: true, data: distributions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ghi nhan yeu cau phan phoi moi
router.post('/', async (req, res) => {
  try {
    const {
      blockchainRequestId,
      blockchainCampaignId,
      organizationWallet,
      recipient,
      amount,
      purpose,
      transactionHash,
    } = req.body;

    if (!blockchainRequestId || !blockchainCampaignId || !organizationWallet || !recipient || !amount || !purpose) {
      return res.status(400).json({ success: false, message: 'Thong tin phan phoi bi thieu' });
    }

    let existing = await Distribution.findOne({ blockchainRequestId: Number(blockchainRequestId) });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Yeu cau da duoc ghi nhan', data: existing });
    }

    const campaign = await Campaign.findOne({ blockchainCampaignId: Number(blockchainCampaignId) });

    if (!campaign) {
      return res.status(400).json({ success: false, message: 'Chien dich khong ton tai' });
    }

    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      return res.status(400).json({ success: false, message: 'Dia chi nguoi nhan khong hop le' });
    }

    if (!amount || isNaN(Number(amount))) {
      return res.status(400).json({ success: false, message: 'So tien phan phoi khong hop le' });
    }
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return res.status(400).json({ success: false, message: 'So tien phan phoi phai lon hon 0' });
    }

    const dist = new Distribution({
      blockchainRequestId: Number(blockchainRequestId),
      blockchainCampaignId: Number(blockchainCampaignId),
      campaign: campaign ? campaign._id : null,
      organizationWallet: organizationWallet.toLowerCase(),
      recipient: recipient.toLowerCase(),
      amount,
      purpose,
      status: 'requested',
      transactionHash: transactionHash ? transactionHash.toLowerCase() : '',
      timestamp: new Date(),
    });

    await dist.save();
    res.status(201).json({ success: true, data: dist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cap nhat trang thai (approved, executed, rejected)
router.put('/:requestId/status', async (req, res) => {
  try {
    // Simple authorization: check if caller is admin via header
    // Frontend should send wallet address in header
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS?.toLowerCase();
    const callerWallet = req.headers['x-wallet-address']?.toLowerCase();

    // Neu chua cau hinh ADMIN_WALLET_ADDRESS, mac dinh tu choi tat ca
    if (!adminWallet) {
      return res.status(500).json({ success: false, message: 'Server chua cau hinh ADMIN_WALLET_ADDRESS' });
    }

    if (callerWallet !== adminWallet) {
      return res.status(403).json({ success: false, message: 'Chi Administrator moi co quyen thuc hien' });
    }

    const { status, transactionHash } = req.body;
    const dist = await Distribution.findOne({ blockchainRequestId: Number(req.params.requestId) });

    if (!dist) {
      return res.status(404).json({ success: false, message: 'Khong tim thay yeu cau phan phoi' });
    }

    dist.status = status;
    if (transactionHash) {
      dist.transactionHash = transactionHash.toLowerCase();
    }
    await dist.save();

    // Neu da executed thi cong don vao totalDistributed cua Campaign
    if (status === 'executed') {
      try {
        await updateCampaignTotal(dist.blockchainCampaignId, 'totalDistributed', dist.amount);
      } catch (e) {
        console.error('Loi cap nhat totalDistributed:', e.message);
      }
    }

    res.json({ success: true, data: dist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
