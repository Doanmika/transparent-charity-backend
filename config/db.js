const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transparent_charity', {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });
      console.log(`[MongoDB] Ket noi thanh cong: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`[MongoDB] Loi ket noi (lan ${i + 1}/${retries}): ${error.message}`);
      if (i < retries - 1) {
        console.log(`[MongoDB] Thu lai sau ${delay / 1000} giay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('[MongoDB] Ket noi that bai sau tat ca thu. Server van chay nhung DB khong kha dung.');
};

// Xy ly su kien mat ket noi
mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Mat ket noi. Dang thu ket noi lai...');
  connectDB(3, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Loi ket noi:', err.message);
});

module.exports = connectDB;
