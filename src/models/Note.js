const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 10000 },
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, _id: -1 });

module.exports = mongoose.model('Note', noteSchema);
