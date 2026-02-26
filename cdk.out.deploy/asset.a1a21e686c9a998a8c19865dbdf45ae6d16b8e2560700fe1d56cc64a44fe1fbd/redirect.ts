import { CloudFrontRequestHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Hard-coded table name – required for Lambda@Edge
const TABLE_NAME = 'DistributedUrlShortener-Urls';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler: CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request;
  const shortCode = request.uri.slice(1); // remove leading '/'

  if (!shortCode) {
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Missing short code',
    };
  }

  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { shortCode },
      })
    );

    const item = result.Item;

    if (!item || (item.expiresAt && item.expiresAt < Date.now() / 1000)) {
      return {
        status: '404',
        statusDescription: 'Not Found',
        body: 'Link not found or expired',
      };
    }

    // Optional click counter
    ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { shortCode },
        UpdateExpression: 'SET clicks = if_not_exists(clicks, :zero) + :one',
        ExpressionAttributeValues: { ':one': 1, ':zero': 0 },
      })
    ).catch(() => {});

    // 301 redirect
    return {
      status: '301',
      statusDescription: 'Moved Permanently',
      headers: {
        location: [{ key: 'Location', value: item.longUrl }],
        'cache-control': [{ key: 'Cache-Control', value: 'max-age=3600' }],
      },
    };
  } catch (error) {
    return {
      status: '502',
      statusDescription: 'Bad Gateway',
      body: 'Internal error',
    };
  }
};