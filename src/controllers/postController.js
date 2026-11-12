const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const httpError = require('../utils/httpError');
const { requireString } = require('../utils/validators');
const { getPagination, buildMeta } = require('../utils/pagination');


exports.create = async (req, res, next) => {
  try {
    const post = await Post.create({
      author: req.user._id,
      title: requireString(req.body.title, 'title', { max: 200 }),
      content: requireString(req.body.content, 'content', { max: 10000 }),
    });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const [posts, total] = await Promise.all([
      Post.find().sort({ _id: -1 }).skip(skip).limit(limit).populate('author', 'name').lean(),
      Post.estimatedDocumentCount(),
    ]);
    res.json({ data: posts, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
};

exports.byUser = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const postsColl = Post.collection.name;

    const [result] = await User.aggregate([
      { $match: { _id: userId } }, // _id index
      {
        $lookup: {
          from: postsColl,
          let: { uid: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$author', '$$uid'] } } },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { title: 1, content: 1, createdAt: 1, updatedAt: 1 } },
          ],
          as: 'posts',
        },
      },
      {
        $lookup: {
          from: postsColl,
          let: { uid: '$_id' },
          pipeline: [{ $match: { $expr: { $eq: ['$author', '$$uid'] } } }, { $count: 'n' }],
          as: 'postCount',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          posts: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$postCount.n', 0] }, 0] },
        },
      },
    ]);

    if (!result) throw httpError(404, 'User not found');

    res.json({
      user: { _id: result._id, name: result.name },
      data: result.posts,
      meta: buildMeta(result.total, page, limit),
    });
  } catch (err) {
    next(err);
  }
};
