const mongoose = require('mongoose');

const connectDB = async (DATABASE_URL) => {
    try {
        const conn = {
            dbName : "CoDeciDoc",
        };
        await mongoose.connect(DATABASE_URL, conn);
        console.log(`connected successfully to MongoDB : ${conn.dbName}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;