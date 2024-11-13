const async_handler = require('express-async-handler');
const Document = require('../models/documentModel');
const User = require('../models/userModel');
const SharedDocument = require('../models/sharedDocumentModel')
const mongoose = require('mongoose');


const createDocument = async_handler(async (req, res) => {
    try {
        const { title, user, content } = req.body;

        const document = await Document.create({
            owner: new mongoose.Types.ObjectId(String(user._id)), 
            title: title,
            content: content,
        });

        if (document) {
            res.status(201).json(document);
            // console.log(`Document created successfully by ${user.name} with title ${title}`);
        } else {
            res.status(400).json({ error: 'Failed to create document, please try again' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});


const getDocument = async_handler(async (req, res) => {

    const document = await Document.findById(req.params.id);
    if (document) {
        res.json(document);
    } else {
        res.status(404);
        throw new Error('Document not found');
    }
});

const getUserDocuments = async_handler(async (req, res) => {
    
    const ownerId = req.user._id;
    if (!ownerId) {
      res.status(400);
      throw new Error('User ID not found');
    }

    const documents = await Document.find({ owner: ownerId });
  
    if (!documents.length) {
      res.status(404);
      throw new Error('No documents found for this user');
    }
  
    res.json(documents);
  });
  
  const getSharedDocuments = async_handler(async (req, res) => {
    const userId = req.user._id;
  
    // Find shared documents and populate the documentId field with actual Document data
    const sharedDocuments = await SharedDocument.find({ userID: userId })
      .populate('documentId');
  
    if (!sharedDocuments.length) {
      res.status(404);
      throw new Error('No shared documents found for this user');
    }
  
    // If you want to return only the documents, extract them from sharedDocuments
    const documents = sharedDocuments.map(sharedDoc => sharedDoc.documentId);
  
    res.json(documents); // Return the array of documents
  });
  
  
  
  

const updateDocument = async_handler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (document) {
        document.title = req.body.title || document.title;
        document.content = req.body.content || document.content;
        const updatedDocument = await document.save();
        res.json(updatedDocument);
    } else {
        res.status(404);
        throw new Error('Document not found');
    }
});





const addCollaborator = async_handler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    // console.log(document);

    if (!document) {
        res.status(404);
        throw new Error('Document not found');
    }

    // Find the user by email
    const collaboratorUser = await User.findOne({ email: req.body.collaborator });
    if (!collaboratorUser) {
        res.status(404);
        throw new Error('User not found');
    }

    const collaboratorId = collaboratorUser._id;
    const collaboratorEmail = collaboratorUser.email;

    // Check if the collaborator is already added
    if (document.collaborators.includes(collaboratorId)) {
        res.status(400);
        throw new Error('Collaborator already exists');
    }

    // Add collaborator by ObjectId
    document.collaborators.push({ userId: collaboratorId, email: collaboratorEmail });
    const updatedDocument = await document.save();

    const sharedDocument = new SharedDocument({
        userID: collaboratorId,
        documentId: document._id,
    });
    await sharedDocument.save();

    res.json(updatedDocument);
    console.log('Collaborator added and SharedDocument created:', sharedDocument);
});



module.exports = { createDocument, getDocument, updateDocument, addCollaborator, getUserDocuments, getSharedDocuments };

