import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let doc: DynamoDBDocumentClient | null = null;

export function getTableName(): string {
  const name = process.env.DYNAMODB_TABLE_NAME?.trim() || "csrd-data";
  return name;
}

export function getDocClient(): DynamoDBDocumentClient {
  if (doc) return doc;
  const client = new DynamoDBClient({
    region:
      process.env.DYNAMODB_REGION ||
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      "ap-south-1",
    ...(process.env.DYNAMODB_ENDPOINT
      ? {
          endpoint: process.env.DYNAMODB_ENDPOINT,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "local",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "local",
          },
        }
      : {}),
  });
  doc = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
  return doc;
}
