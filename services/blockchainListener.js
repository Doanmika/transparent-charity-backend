const { ethers } = require('ethers');
const Campaign = require('../models/Campaign');
const Donation = require('../models/Donation');
const Distribution = require('../models/Distribution');
const contractABI = require('../blockchain/CharityDonation.json');
const { updateCampaignTotal } = require('../utils/campaignUtils');

const initBlockchainListener = () => {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const contractAddress = process.env.CONTRACT_ADDRESS;

  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    console.log('[Blockchain Listener] Chua cau hinh CONTRACT_ADDRESS hop le trong .env. Tam dung lang nghe su kien.');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    console.log(`[Blockchain Listener] Dang lang nghe Smart Contract tai dia chi: ${contractAddress}`);

    // 1. Lang nghe su kien CampaignCreated
    contract.on('CampaignCreated', async (campaignId, title, organization, goalAmount, startDate, endDate, event) => {
      try {
        console.log(`[Event: CampaignCreated] Campaign ID: ${campaignId.toString()}`);
        const cId = Number(campaignId);
        let campaign = await Campaign.findOne({ blockchainCampaignId: cId });
        if (!campaign) {
          campaign = new Campaign({
            blockchainCampaignId: cId,
            title,
            organizationWallet: organization.toLowerCase(),
            goalAmount: goalAmount.toString(),
            startDate: new Date(Number(startDate) * 1000),
            endDate: new Date(Number(endDate) * 1000),
            transactionHash: event.log ? event.log.transactionHash : '',
          });
          await campaign.save();
          console.log(`[DB] Da luu Campaign ${cId} vao Database`);
        }
      } catch (err) {
        console.error('[Event: CampaignCreated] Loi:', err.message);
      }
    });

// 2. Lang nghe su kien DonationReceived
    contract.on('DonationReceived', async (campaignId, donor, amount, timestamp, event) => {
      try {
        console.log(`[Event: DonationReceived] Campaign: ${campaignId.toString()}, Donor: ${donor}, Amount: ${amount.toString()}`);
        const txHash = event.log ? event.log.transactionHash.toLowerCase() : '';
        const blockNumber = event.log ? event.log.blockNumber : 0;

        if (!txHash) {
          console.warn('[Event: DonationReceived] Bo qua - khong co transactionHash');
          return;
        }

        // Kiem tra da ton tai donation voi txHash nay chua
        const existing = await Donation.findOne({ transactionHash: txHash });
        if (existing) {
          console.log(`[Event: DonationReceived] Donation da ton tai voi txHash: ${txHash}`);
          return;
        }

        const cId = Number(campaignId);
        const campaign = await Campaign.findOne({ blockchainCampaignId: cId });

        const donation = new Donation({
          blockchainCampaignId: cId,
          campaign: campaign ? campaign._id : null,
          donorWallet: donor.toLowerCase(),
          amount: amount.toString(),
          transactionHash: txHash,
          blockNumber,
          timestamp: new Date(Number(timestamp) * 1000),
          status: 'confirmed',
        });
        await donation.save();

        // Cap nhat totalDonated cho Campaign bang transaction
        try {
          await updateCampaignTotal(cId, 'totalDonated', amount.toString());
        } catch (e) {
          console.error('Loi cap nhat totalDonated:', e.message);
        }
        console.log(`[DB] Da ghi nhan Donation vao Database tu Transaction: ${txHash}`);
      } catch (err) {
        console.error('[Event: DonationReceived] Loi:', err.message);
      }
    });

    // 3. Lang nghe su kien FundDistributionApproved
    contract.on('FundDistributionApproved', async (requestId, campaignId, admin, event) => {
      try {
        console.log(`[Event: FundDistributionApproved] Request ID: ${requestId.toString()}`);
        const reqId = Number(requestId);
        const dist = await Distribution.findOne({ blockchainRequestId: reqId });
        if (dist) {
          dist.status = 'approved';
          await dist.save();
          console.log(`[DB] Da cap nhat status = approved cho Request ${reqId}`);
        }
      } catch (err) {
        console.error('[Event: FundDistributionApproved] Loi:', err.message);
      }
    });

    // 4. Lang nghe su kien FundDistributed
    contract.on('FundDistributed', async (requestId, campaignId, recipient, amount, timestamp, event) => {
      try {
        console.log(`[Event: FundDistributed] Request ID: ${requestId.toString()}, Recipient: ${recipient}, Amount: ${amount.toString()}`);
        const reqId = Number(requestId);
        const txHash = event.log ? event.log.transactionHash.toLowerCase() : '';

let dist = await Distribution.findOne({ blockchainRequestId: reqId });
        if (dist) {
          dist.status = 'executed';
          if (txHash) dist.transactionHash = txHash;
          await dist.save();

          // Cap nhat totalDistributed cho Campaign bang transaction
          try {
            await updateCampaignTotal(cId, 'totalDistributed', amount.toString());
          } catch (e) {
            console.error('Loi cap nhat totalDistributed:', e.message);
          }
          console.log(`[DB] Da cap nhat status = executed cho Request ${reqId}`);
        }
      } catch (err) {
        console.error('[Event: FundDistributed] Loi:', err.message);
      }
    });

  } catch (err) {
    console.error('[Blockchain Listener] Khoi tao that bai:', err.message);
  }
};

module.exports = initBlockchainListener;
