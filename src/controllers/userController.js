const User = require('../models/User');
const Note = require('../models/Note');
const Post = require('../models/Post');
const httpError = require('../utils/httpError');
const {
  requireString,
  requireEmail,
  requirePassword,
  normalizeInterests,
  normalizeRole,
} = require('../utils/validators');
const { getPagination, buildMeta } = require('../utils/pagination');


exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [users, total] = await Promise.all([
      User.find().sort({ _id: -1 }).skip(skip).limit(limit),
      User.estimatedDocumentCount(),
    ]);
    res.json({ data: users, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
};


exports.getOne = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, 'User not found');
    res.json({ user });
  } catch (err) {
    next(err);
  }
};


exports.create = async (req, res, next) => {
  try {
    const user = await User.create({
      name: requireString(req.body.name, 'name', { max: 100 }),
      email: requireEmail(req.body.email),
      password: requirePassword(req.body.password),
      role: normalizeRole(req.body.role) || 'user',
      interests: normalizeInterests(req.body.interests) || [],
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};


exports.update = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw httpError(404, 'User not found');

    const { name, email, password, role, interests } = req.body;
    if (name !== undefined) user.name = requireString(name, 'name', { max: 100 });
    if (email !== undefined) user.email = requireEmail(email);
    if (password !== undefined) user.password = requirePassword(password); // re-hashed by pre-save hook
    if (interests !== undefined) user.interests = normalizeInterests(interests);
    if (role !== undefined) {
      const newRole = normalizeRole(role);
      if (user._id.equals(req.user._id) && newRole !== user.role) {
        throw httpError(400, 'You cannot change your own role');
      }
      user.role = newRole;
    }

    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};


exports.remove = async (req, res, next) => {
  try {
    if (req.user._id.equals(req.params.id)) {
      throw httpError(400, 'You cannot delete your own account');
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw httpError(404, 'User not found');

    await Promise.all([
      Note.deleteMany({ user: user._id }), // uses { user, _id } index
      Post.deleteMany({ author: user._id }), // uses { author, _id } index
    ]);
    res.json({ message: 'User and their notes/posts deleted' });
  } catch (err) {
    next(err);
  }
};


exports.groupedByInterests = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    let interest;
    if (req.query.interest !== undefined) {
      if (typeof req.query.interest !== 'string') throw httpError(400, 'Invalid interest');
      interest = req.query.interest.trim().toLowerCase();
    }

    const pipeline = [];
    if (interest) pipeline.push({ $match: { interests: interest } }); // index-backed
    pipeline.push({ $unwind: '$interests' });
    if (interest) pipeline.push({ $match: { interests: interest } }); // keep only that group
    pipeline.push(
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: { $push: { _id: '$_id', name: '$name', email: '$email' } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } },
          ],
          total: [{ $count: 'n' }],
        },
      }
    );

    const [result] = await User.aggregate(pipeline);
    const total = result.total[0] ? result.total[0].n : 0;
    res.json({ data: result.data, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
};
