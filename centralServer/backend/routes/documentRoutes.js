const express = require("express");
const {
  createDocument,
  getDocument,
  updateDocument,
  addCollaborator,
  getUserDocuments,
  getSharedDocuments,
} = require("../controllers/documentControllers");


const protect = require("../middleware/authMiddleware");
const router = express.Router();

// console.log("Document routes");

router.route("/").post(protect, createDocument);
router.route('/my-documents').get(protect, getUserDocuments);
router.route('/shared-documents').get(protect, getSharedDocuments);

// my-documents will be kept before because it will be confused with /:id

router.route("/:id").get(protect, getDocument).put(protect, updateDocument);
router.route("/:id/collaborator").put(protect, addCollaborator);

module.exports = router;