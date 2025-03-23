import { createFolderInBucket } from "../../s3.js";
import { User } from "../../model/user.model.js";
export async function createFolder(req, res) {
  try {
    const { folderName, accessType } = req.body;
    const userId = req.user._id;

    // console.log("User id from create folder : ", userId);

    const formattedName = folderName.toLowerCase().replace(/\s+/g, "");

    if (!folderName) {
      return res
        .status(400)
        .json({ success: false, message: "Folder name is required." });
    }

    // No need to fetch user/org/client again
    const acc = req.user;

    if (!acc) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Assuming acc has s3Bucket (check before using)
    if (!acc.s3Bucket) {
      return res
        .status(400)
        .json({ success: false, message: "S3 Bucket not found" });
    }

    // Assuming createFolderInBucket function exists
    const folderKey = await createFolderInBucket(acc.s3Bucket, folderName);
    console.log("Folder Key", folderKey);

    // Save folder details in MongoDB
    acc.folders.push({
      name: formattedName,
      displayName: folderName,
      accessType: accessType || "private",
    });
    await acc.save();

    res.status(201).json({
      success: true,
      folder: { name: folderName, accessType },
      message: "Folder created successfully",
    });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function deleteFolder(req, res) {
  try {
    const { folderId } = req.params;
    const userId = req.user._id;

    // Find the user and update their folders array
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Find the folder to delete
    const folderIndex = user.folders.findIndex(
      (folder) => folder._id.toString() === folderId
    );

    if (folderIndex === -1) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // Remove the folder from the array
    user.folders.splice(folderIndex, 1);
    await user.save();

    res.status(200).json({ success: true, message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function renameFolder(req, res) {
  try {
    const { folderId } = req.params;
    const { newFolderName } = req.body;
    const userId = req.user._id;

    // Find the user and update the folder name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Find the folder to rename
    const folder = user.folders.find(
      (folder) => folder._id.toString() === folderId
    );

    if (!folder) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    // Update the folder name
    folder.name = newFolderName;
    await user.save();

    res.status(200).json({ success: true, message: "Folder renamed successfully" });
  } catch (error) {
    console.error("Error renaming folder:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getFolders(req, res) {
  try {
    const acc = req.user; // Already populated by protectRoute middleware
    // console.log("account from get folder", acc);

    if (!acc || !acc.folders) {
      return res
        .status(404)
        .json({ success: false, message: "Folders not found." });
    }

    res.status(200).json({ success: true, folders: acc.folders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
