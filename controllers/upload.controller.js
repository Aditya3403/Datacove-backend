import express from "express";
import s3, { getPresignedUrl } from "../s3.js";
import { ENV_VARS } from "../config/envVar.js";
import multer from "multer";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Org } from "../model/org.model.js";
import { User } from "../model/user.model.js";
import shortenUrl from "../utils/shortenUrl.js";
import formatDate from "../utils/formatDate.js";
import { Client } from "../model/client.model.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export async function uploadFile(req, res) {
  console.log("Request Body:", req.body);
  console.log("Request Files:", req.files);

  const { userId, forClient, folderId } = req.body;
  let descriptions = {};
  
  try {
    // Parse the descriptions JSON if it exists
    if (req.body.descriptions) {
      descriptions = JSON.parse(req.body.descriptions);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Find user or organization
    const user = await User.findById(userId);
    const org = await Org.findById(userId);

    if (!user && !org) {
      return res.status(404).json({ message: "User or organization not found" });
    }

    const acc = user || org;
    const userBucketName = acc.s3Bucket;

    // Handle the uploaded files
    const fileUrls = [];
    for (const file of req.files) {
      const fileName = `private/${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: userBucketName,
        Key: fileName,
        Body: file.buffer,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const fileUrl = `https://${userBucketName}.s3.amazonaws.com/${fileName}`;
      fileUrls.push(fileUrl);
    }

    if (!acc.docs) {
      acc.docs = [];
    }

    // Add uploaded files to the docs array (existing functionality)
    req.files.forEach((file, index) => {
      const docNumber = acc.docs.length + 1;
      const docName = `doc${docNumber}`;

      acc.docs.push({
        date: formatDate(new Date()),
        SrNo: docName,
        Name: file.originalname,
        fileUrl: fileUrls[index],
        forClient: forClient || false,
      });
    });

    // Save uploaded files in the folders array (new functionality)
    if (folderId) {
      const folder = acc.folders.id(folderId); // Find the folder by folderId
      if (folder) {
        req.files.forEach((file, index) => {
          folder.files.push({
            title: file.originalname, // Use the original file name as the title
            s3_path: fileUrls[index], // S3 path of the uploaded file
            uploadedAt: new Date(), // Timestamp of upload
            description: descriptions[file.originalname] || "No description provided" // Add the description
          });
        });
      } else {
        console.warn("Folder not found with ID:", folderId);
      }
    }

    // Save the updated user/organization document
    await acc.save();

    res.status(200).json({
      success: true,
      message: "Docs uploaded successfully",
      user: {
        ...acc._doc,
        password: "",
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Upload failed" });
  }
}

export async function deleteFile(req, res) {
  const { userId, folderId, fileId, s3Key } = req.body;
  
  try {
    // Find user or organization
    const user = await User.findById(userId);
    const org = await Org.findById(userId);

    if (!user && !org) {
      return res.status(404).json({ message: "User or organization not found" });
    }

    const acc = user || org;
    const userBucketName = acc.s3Bucket;

    // 1. Delete file from S3
    const params = {
      Bucket: userBucketName,
      Key: s3Key
    };

    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    // 2. Delete file from the docs array if it exists there
    if (acc.docs) {
      // Find the file URL that matches the S3 path
      const fileUrl = `https://${userBucketName}.s3.amazonaws.com/${s3Key}`;
      acc.docs = acc.docs.filter(doc => doc.fileUrl !== fileUrl);
    }

    // 3. Delete file from the folder's files array
    if (folderId) {
      const folder = acc.folders.id(folderId);
      if (folder) {
        folder.files = folder.files.filter(file => file._id.toString() !== fileId);
      } else {
        return res.status(404).json({ message: "Folder not found" });
      }
    }

    // Save the updated user/organization document
    await acc.save();

    res.status(200).json({
      success: true,
      message: "File deleted successfully",
      user: {
        ...acc._doc,
        password: "",
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message || "Delete failed" });
  }
}

export async function uploadClientFile(req, res) {
  try {
    const { userId } = req.body;
    // console.log("client id", userId);
    // const clientFound = req.user;
    // console.log("Client using middleware:", clientFound);

    const client = await Client.findById(userId);

    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files uploaded" });
    }

    const clientFolder = client.folder; // Client's folder inside inviter’s bucket
    const bucketName = client.userS3Bucket; // Inviter’s bucket
    const uploadedFiles = [];

    // Upload each file to S3 inside client's folder
    for (const file of req.files) {
      const fileName = `${clientFolder}/${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
      uploadedFiles.push(fileUrl);
    }

    // Save uploaded files in the client's database
    if (!client.docs) {
      client.docs = [];
    }

    req.files.forEach((file, index) => {
      client.docs.push({
        date: formatDate(new Date()),
        SrNo: `doc${client.docs.length + 1}`,
        Name: file.originalname,
        fileUrl: uploadedFiles[index],
      });
    });

    await client.save();

    res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      uploadedFiles,
    });
  } catch (error) {
    console.error("Client Upload Error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
}

export async function shareFile(req, res) {
  const { docId, clientEmail, fileName, fileUrl } = req.body;
  console.log("doc id : ", docId);
  console.log("Client email: ", clientEmail);
  const user = req.user;

  console.log("user from share", user);
  try {
    

    if (!user) return res.status(404).json({ message: "User not found" });

    // Find the client by email
    const client = await Client.findOne({ email: clientEmail });
    if (!client) return res.status(404).json({ message: "Client not found" });

    // Update the user's sharedDocs
    user.sharedDocs.push({
      docId,
      clientId: clientEmail,
      docUrl: fileUrl,
      docName: fileName,
    });
    await user.save();

    // Update the client's sharedDocs
    client.sharedDocs.push({
      docId,
      sharedBy: user.email,
      sharedByName: user.displayName,
      fileUrl: fileUrl,
      fileName: fileName,
    });
    await client.save();

    res.status(200).json({ message: "Document shared successfully" });
  } catch (error) {
    console.error("Error in file share:", error);
    res.status(500).json({ success: false, message: "Cannot share" });
  }
}

export const getSharedDocs = async (req, res) => {
  try {
    const user = req.user; // User is attached by the auth middleware

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Find the user and populate the sharedDocs array
    const userWithSharedDocs = await User.findById(user._id)
      .select('sharedDocs')
      .lean();

    console.log("User with shared docs:", userWithSharedDocs);

    if (!userWithSharedDocs) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Return all documents in the sharedDocs array
    return res.status(200).json({
      success: true,
      sharedDocs: userWithSharedDocs.sharedDocs || [] // Return empty array if sharedDocs is undefined
    });

  } catch (error) {
    console.error("Error fetching shared documents:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const deleteSharedDoc = async (req, res) => {
  try {
    const { docId } = req.params;
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Remove the document from sharedDocs array
    await User.findByIdAndUpdate(
      user._id,
      { $pull: { sharedDocs: { docId } }}
    );

    return res.status(200).json({
      success: true,
      message: "Document removed from shared documents"
    });
  } catch (error) {
    console.error("Error deleting shared document:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export async function legalWorkflow(req, res) {
  try {
    // Extract data from request
    const { workflow_name, prompt, analysisOptions } = req.body;
    console.log("workflow_name", workflow_name);
    console.log("prompt", prompt);
    console.log("option", analysisOptions);

    // Parse the JSON string of descriptions back to an array
    let descriptions = [];
    try {
      descriptions = JSON.parse(req.body.descriptions);
    } catch (error) {
      console.error("Error parsing descriptions:", error);
      descriptions = [];
    }

    // Parse analysis options if they exist
    let parsedAnalysisOptions = [];
    if (analysisOptions) {
      try {
        parsedAnalysisOptions = JSON.parse(analysisOptions);
      } catch (error) {
        console.error("Error parsing analysis options:", error);
      }
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const user = req.user; // Get user from middleware
    // console.log("user from legal workflow", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userBucketName = user.s3Bucket;
    if (!userBucketName) {
      return res.status(400).json({ error: "User does not have an S3 bucket" });
    }

    const uploadedDocuments = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const description = descriptions[i] || "No description provided"; // Default description if missing

      const fileName = `private/${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: userBucketName,
        Key: fileName,
        Body: file.buffer,
      };

      const command = new PutObjectCommand(params);
      await s3.send(command);

      const fileUrl = `https://${userBucketName}.s3.amazonaws.com/${fileName}`;

      uploadedDocuments.push({
        title: file.originalname,
        description, // Save description from request
        s3_path: fileUrl,
      });
    }

    // Create a new workflow
    const newWorkflow = {
      workflow_name,
      prompt,
      documents: uploadedDocuments,
      analysisOptions: parsedAnalysisOptions, // Add analysis options to workflow
    };

    user.workflows.push(newWorkflow);
    await user.save();

    res.status(200).json({
      success: true,
      message: " documents uploaded successfully",
      latestWorkFlow: newWorkflow,
      user: {
        ...user._doc, // Spread the user document to include all user fields
        password: "",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
}

export async function deleteWorkflowDocuments(req, res) {
  try {
    const { workflowId, documentTitles } = req.body; // Expecting an array of document titles
    console.log("Workflow ID:", workflowId);
    console.log("Document Titles:", documentTitles);
    console.log(req.body);

    const user = req.user; // Get user from middleware
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userBucketName = user.s3Bucket;
    if (!userBucketName) {
      return res.status(400).json({ error: "User does not have an S3 bucket" });
    }

    const workflowIndex = user.workflows.findIndex(
      (w) => w._id.toString() === workflowId
    );

    if (workflowIndex === -1) {
      return res.status(404).json({ message: "Workflow not found" });
    }

    const workflow = user.workflows[workflowIndex];

    // Delete documents from S3
    for (const document of workflow.documents) {
      const fileKey = document.s3_path.split(".s3.amazonaws.com/")[1];

      const params = {
        Bucket: userBucketName,
        Key: fileKey,
      };

      const command = new DeleteObjectCommand(params);
      await s3.send(command);
    }

    // Remove the entire workflow object
    user.workflows.splice(workflowIndex, 1);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Workflow deleted successfully",
      user: {
        ...user._doc, // Spread the user document to include all user fields
        password: "",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete workflow" });
  }
}
