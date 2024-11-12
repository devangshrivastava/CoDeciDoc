const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
    {
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true, unique: false },
      title: { type: String, required: true, trim: true },
      content: { type: String, trim: true },
      collaborators: [
        {
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          email: { type: String, required: true }
        }
      ]
    },
    {
      timestamps: true
    }
  );



const Document = mongoose.model('Document', documentSchema);
module.exports = Document;
