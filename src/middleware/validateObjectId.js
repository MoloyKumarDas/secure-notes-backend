const mongoose = require('mongoose');

const validateObjectId = (param) => (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return res.status(400).json({ message: `Invalid ${param}` });
  }
  return next();
};

module.exports = validateObjectId;
