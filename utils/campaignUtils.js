const Campaign = require('../models/Campaign');

/**
 * Cap nhat tong tien cua Campaign bang MongoDB Transaction de tranh race condition
 * @param {Number} campaignId - blockchainCampaignId
 * @param {String} field - 'totalDonated' hoac 'totalDistributed'
 * @param {String} amount - So tien can cong (wei string)
 * @returns {Promise<Boolean>} - true neu thanh cong
 */
const updateCampaignTotal = async (campaignId, field, amount) => {
  if (!['totalDonated', 'totalDistributed'].includes(field)) {
    throw new Error('Field khong hop le: chi cho phep totalDonated hoac totalDistributed');
  }

  const session = await Campaign.startSession();
  session.startTransaction();

  try {
    const campaign = await Campaign.findOne({ blockchainCampaignId: campaignId }).session(session);
    if (!campaign) {
      await session.abortTransaction();
      return false;
    }

    const currentTotal = BigInt(campaign[field] || '0');
    const addAmount = BigInt(amount);
    campaign[field] = (currentTotal + addAmount).toString();

    await campaign.save({ session });
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    console.error(`Loi cap nhat ${field} cho Campaign ${campaignId}:`, error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cap nhat ca totalDonated va totalDistributed trong mot transaction
 * @param {Number} campaignId - blockchainCampaignId
 * @param {Object} updates - { totalDonated?: String, totalDistributed?: String }
 * @returns {Promise<Boolean>}
 */
const updateCampaignTotals = async (campaignId, updates) => {
  const session = await Campaign.startSession();
  session.startTransaction();

  try {
    const campaign = await Campaign.findOne({ blockchainCampaignId: campaignId }).session(session);
    if (!campaign) {
      await session.abortTransaction();
      return false;
    }

    if (updates.totalDonated !== undefined) {
      const currentDonated = BigInt(campaign.totalDonated || '0');
      const addDonated = BigInt(updates.totalDonated);
      campaign.totalDonated = (currentDonated + addDonated).toString();
    }

    if (updates.totalDistributed !== undefined) {
      const currentDistributed = BigInt(campaign.totalDistributed || '0');
      const addDistributed = BigInt(updates.totalDistributed);
      campaign.totalDistributed = (currentDistributed + addDistributed).toString();
    }

    await campaign.save({ session });
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    console.error(`Loi cap nhat totals cho Campaign ${campaignId}:`, error.message);
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  updateCampaignTotal,
  updateCampaignTotals,
};