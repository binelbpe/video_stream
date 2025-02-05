import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const s3Config = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
};

export const s3Client = new S3Client(s3Config);
export const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Bucket policy should be applied through AWS Console
const bucketPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "AllowFullAccess",
      Effect: "Allow",
      Principal: "*",
      Action: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      Resource: [
        "arn:aws:s3:::videostream",
        "arn:aws:s3:::videostream/*"
      ]
    }
  ]
};

export { s3Config, bucketPolicy }; 