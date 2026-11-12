require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const Note = require('./models/Note');
const Post = require('./models/Post');

async function start() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in .env');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set in .env and be at least 32 characters');
  }

  await connectDB();

  await Promise.all([User.init(), Note.init(), Post.init()]);
  console.log('Indexes ready');

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
