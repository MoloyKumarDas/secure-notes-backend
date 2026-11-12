const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpError = require('../utils/httpError');
const {
  requireString,
  requireEmail,
  requirePassword,
  normalizeInterests,
} = require('../utils/validators');

const signToken = (user) =>
  jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });


exports.register = async (req, res, next) => {
  try {
    const name = requireString(req.body.name, 'name', { max: 100 });
    const email = requireEmail(req.body.email);
    const password = requirePassword(req.body.password);
    const interests = normalizeInterests(req.body.interests) || [];

    const user = await User.create({ name, email, password, interests, role: 'user' });
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = requireEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    // Uses the unique { email: 1 } index.
    const user = await User.findOne({ email }).select('+password');
    const ok = user && (await user.comparePassword(password));
    if (!ok) throw httpError(401, 'Invalid email or password');

    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
};

exports.me = (req, res) => {
  res.json({ user: req.user });
};
