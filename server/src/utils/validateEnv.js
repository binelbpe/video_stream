import { cleanEnv, str, port } from 'envalid';

export const validateEnv = () => {
  return cleanEnv(process.env, {
    PORT: port({ default: 3000 }),
    MONGODB_URI: str(),
    AWS_ACCESS_KEY_ID: str(),
    AWS_SECRET_ACCESS_KEY: str(),
    AWS_REGION: str(),
    AWS_S3_BUCKET_NAME: str(),
    CORS_ORIGIN: str({ default: 'https://your-frontend-domain.vercel.app' })
  });
}; 