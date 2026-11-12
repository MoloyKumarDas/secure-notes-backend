const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true, maxlength: 10000 },
  },
  { timestamps: true }
);

postSchema.index({ author: 1, _id: -1 });

module.exports = mongoose.model('Post', postSchema);
