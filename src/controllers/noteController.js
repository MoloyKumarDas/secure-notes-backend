const Note = require('../models/Note');
const httpError = require('../utils/httpError');
const { requireString } = require('../utils/validators');
const { getPagination, buildMeta } = require('../utils/pagination');

const isAdmin = (user) => user.role === 'admin';


exports.list = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter = {};
    if (!isAdmin(req.user)) {
      filter.user = req.user._id;
    } else if (req.query.user) {
      if (typeof req.query.user !== 'string') throw httpError(400, 'Invalid user filter');
      filter.user = req.query.user;
    }

    const hasFilter = Object.keys(filter).length > 0;
    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .lean(),
      hasFilter ? Note.countDocuments(filter) : Note.estimatedDocumentCount(),
    ]);

    res.json({ data: notes, meta: buildMeta(total, page, limit) });
  } catch (err) {
    next(err);
  }
};


exports.getOne = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id).populate('user', 'name email');
    if (!note) throw httpError(404, 'Note not found');

    const ownerId = (note.user._id || note.user).toString();
    if (!isAdmin(req.user) && ownerId !== req.user._id.toString()) {
      throw httpError(404, 'Note not found'); // don't leak that it exists
    }
    res.json({ note });
  } catch (err) {
    next(err);
  }
};


exports.create = async (req, res, next) => {
  try {
    const title = requireString(req.body.title, 'title', { max: 200 });
    const content =
      req.body.content === undefined ? '' : requireString(req.body.content, 'content', { min: 0, max: 10000 });

    const note = await Note.create({ user: req.user._id, title, content });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const update = {};
    if (req.body.title !== undefined) update.title = requireString(req.body.title, 'title', { max: 200 });
    if (req.body.content !== undefined) {
      update.content = requireString(req.body.content, 'content', { min: 0, max: 10000 });
    }
    if (!Object.keys(update).length) throw httpError(400, 'Nothing to update');

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      update,
      { new: true, runValidators: true }
    );
    if (!note) throw httpError(404, 'Note not found');
    res.json({ note });
  } catch (err) {
    next(err);
  }
};


exports.remove = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!note) throw httpError(404, 'Note not found');
    res.json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
};
