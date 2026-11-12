require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  try {
    const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }
    await mongoose.connect(MONGO_URI);
    await User.init();

    const email = ADMIN_EMAIL.trim().toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`User ${email} already exists (role: ${existing.role}). Nothing to do.`);
    } else {
      await User.create({
        name: ADMIN_NAME || 'Super Admin',
        email,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`Admin created: ${email}`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
