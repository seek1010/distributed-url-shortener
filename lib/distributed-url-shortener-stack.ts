import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class DistributedUrlShortenerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'UrlsTable', {
      tableName: 'DistributedUrlShortener-Urls',
      partitionKey: { name: 'shortCode', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      replicationRegions: ['ap-south-1', 'eu-west-1', 'ap-southeast-1'],
      timeToLiveAttribute: 'expiresAt',
    });

    const shortenHandler = new lambda.Function(this, 'ShortenHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'shorten.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: { TABLE_NAME: table.tableName },
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
    });

    // Lambda@Edge cannot use env vars; redirect handler keeps table name in code.
    const edgeRedirect = new cloudfront.experimental.EdgeFunction(this, 'EdgeRedirect', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'redirect.handler',
      code: lambda.Code.fromAsset('lambda'),
    });

    table.grantReadWriteData(shortenHandler);
    table.grantReadData(edgeRedirect);

    const api = new apigatewayv2.HttpApi(this, 'Api', {
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.POST, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type'],
      },
    });
    api.addRoutes({
      path: '/shorten',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new apigatewayv2Integrations.HttpLambdaIntegration('ShortenInt', shortenHandler),
    });

    const apiOrigin = new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split('/', api.apiEndpoint)));

    const distribution = new cloudfront.Distribution(this, 'CFDist', {
      defaultBehavior: {
        origin: apiOrigin,
        edgeLambdas: [
          {
            functionVersion: edgeRedirect.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/shorten': {
          origin: apiOrigin,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    });

    new cdk.CfnOutput(this, 'ShortenEndpoint', {
      value: `POST ${api.apiEndpoint}/shorten`,
    });
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.domainName}`,
      description: 'Global URL shortener entrypoint',
    });
    new cdk.CfnOutput(this, 'RedirectTest', {
      value: `https://${distribution.domainName}/vD5ANH`,
      description: 'Sample redirect test URL',
    });
  }
}
