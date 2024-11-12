const mongoose = require('mongoose');

const sharedDocumentSchema = new mongoose.Schema(
    {
        userID:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, trim: true, unique: false },
        documentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, trim: true, unique: false },
        
    },
    {
        timestamps: true
    }
);


const SharedDocument = mongoose.model('SharedDocument', sharedDocumentSchema);
module.exports = SharedDocument;
