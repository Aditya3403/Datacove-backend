import dotenv from "dotenv"; // Load environment variables
import { ENV_VARS } from "./config/envVar.js";
import {
  S3Client,
  CreateBucketCommand,
  GetObjectCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

dotenv.config();

// Configure AWS
// const bucketName = ENV_VARS.BUCKET_NAME;
const bucketRegion = ENV_VARS.BUCKET_REGION;
const accessKey = ENV_VARS.ACCESS_KEY;
const secretKey = ENV_VARS.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  region: bucketRegion, // us-east-2
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

async function getPresignedUrl(bucketName, fileName) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileName,
  });

  // Generate a pre-signed URL valid for 7 days hour (604800, seconds)
  return await getSignedUrl(s3, command, { expiresIn: 604800 });
}

export const createUserBucket = async (userId, name) => {
  const bucketName = `user-${name}-${userId}-documents`;

  try {
    // Step 1: Create the S3 bucket
    const command = new CreateBucketCommand({
      Bucket: bucketName,
      CreateBucketConfiguration: {
        LocationConstraint: bucketRegion,
      },
    });

    await s3.send(command);
    console.log(`Bucket created: ${bucketName}`);

    // Step 2: Disable Block Public Access (Fixes AccessDenied Issue)
    const publicAccessBlockCommand = new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
        RestrictPublicBuckets: false,
      },
    });

    await s3.send(publicAccessBlockCommand);
    console.log(`✅ Block Public Access disabled for: ${bucketName}`);

    // Step 3: Attach a public read policy to allow public access
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };

    const policyCommand = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(bucketPolicy),
    });

    await s3.send(policyCommand);
    console.log(`Public read policy applied to: ${bucketName}`);

    // Step 4: Create "private" and "clients" folders
    const folderNames = ["private/", "clients/"];

    for (const folder of folderNames) {
      const putObjectCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: folder, // S3 treats keys ending in '/' as folders
        Body: "", // Empty body to create the folder
      });

      await s3.send(putObjectCommand);
      console.log(`Folder created: ${folder} in bucket ${bucketName}`);
    }

    return bucketName;
  } catch (error) {
    console.error("Error creating bucket:", error);
    throw error;
  }
};

export const createFolderInBucket = async (bucketName, folderName) => {
  const folderKey = `${folderName}/`; // Folders in S3 are created as empty objects ending with "/"

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: folderKey,
    });

    await s3.send(command);
    console.log(`Folder created in s3 bucket: ${folderKey} in ${bucketName}`);
    return folderKey;
  } catch (error) {
    console.error("Error creating folder in s3 bucket:", error);
    throw error;
  }
};

const uploadEmptyObject = async (inviterBucket, clientFolderName) => {
  try {
    const command = new PutObjectCommand({
      Bucket: inviterBucket,
      Key: `${clientFolderName}/`, // Creates a virtual folder
      Body: "",
    });

    await s3.send(command);
    console.log(
      `✅ Empty object created in: ${inviterBucket}/${clientFolderName}/`
    );
  } catch (error) {
    console.error("Error uploading empty object:", error);
    throw error;
  }
};

export default s3;
export { getPresignedUrl, uploadEmptyObject };
