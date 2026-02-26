import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME!;
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
};

// Inline base62 – no layers, no bundling problems ever again
function generateShortCode(): string {
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const bytes = require('crypto').randomBytes(10);
  let num = 0n;
  for (const b of bytes) num = (num << 8n) + BigInt(b);
  let n = Number(num % 56800235584n);
  let s = '';
  while (n > 0) {
    s = CHARS[n % 62] + s;
    n = Math.floor(n / 62);
  }
  return s || '0';
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!TABLE_NAME) {
      throw new Error('TABLE_NAME is not configured');
    }

    const body = JSON.parse(event.body || '{}');
    const { url, custom, expiresInDays } = body;

    if (!url || !/^https?:\/\//i.test(url)) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Valid url required' }) };
    }

    const shortCode = custom?.trim() || generateShortCode();
    const expiresAt = expiresInDays ? Math.floor(Date.now() / 1000) + expiresInDays * 86400 : undefined;

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: { shortCode, longUrl: url, createdAt: new Date().toISOString(), expiresAt, clicks: 0 },
      ConditionExpression: 'attribute_not_exists(shortCode)',
    }));

    const shortUrl = `https://${event.headers.Host || event.headers.host}/${shortCode}`;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ shortUrl, shortCode }),
    };
  } catch (error: any) {
    console.error('shorten_handler_error', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });

    if (error.name === 'ConditionalCheckFailedException') {
      return { statusCode: 409, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Custom code already taken' }) };
    }
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error?.message || 'Failed' }),
    };
  }
};
