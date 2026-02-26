"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedUrlShortenerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigatewayv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const apigatewayv2Integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
class DistributedUrlShortenerStack extends cdk.Stack {
    constructor(scope, id, props) {
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
exports.DistributedUrlShortenerStack = DistributedUrlShortenerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzdHJpYnV0ZWQtdXJsLXNob3J0ZW5lci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpc3RyaWJ1dGVkLXVybC1zaG9ydGVuZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLDJFQUE2RDtBQUM3RCxvR0FBc0Y7QUFDdEYsdUVBQXlEO0FBQ3pELG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsNEVBQThEO0FBRzlELE1BQWEsNEJBQTZCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDekQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRTtZQUNsRCxTQUFTLEVBQUUsOEJBQThCO1lBQ3pDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3hFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxrQkFBa0IsRUFBRSxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLENBQUM7WUFDakUsbUJBQW1CLEVBQUUsV0FBVztTQUNqQyxDQUFDLENBQUM7UUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2pFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGlCQUFpQjtZQUMxQixJQUFJLEVBQUUsTUFBTSxDQUFD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LENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLFdBQVcsWUFBWSxDQUFDLFVBQVUsU0FBUztZQUNsRCxXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhGRCxvRUFnRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheXYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheXYySW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIERpc3RyaWJ1dGVkVXJsU2hvcnRlbmVyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB0YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXJsc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnRGlzdHJpYnV0ZWRVcmxTaG9ydGVuZXItVXJscycsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Nob3J0Q29kZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHJlcGxpY2F0aW9uUmVnaW9uczogWydhcC1zb3V0aC0xJywgJ2V1LXdlc3QtMScsICdhcC1zb3V0aGVhc3QtMSddLFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgfSk7XG5cbiAgICBjb25zdCBzaG9ydGVuSGFuZGxlciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Nob3J0ZW5IYW5kbGVyJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBoYW5kbGVyOiAnc2hvcnRlbi5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhJyksXG4gICAgICBlbnZpcm9ubWVudDogeyBUQUJMRV9OQU1FOiB0YWJsZS50YWJsZU5hbWUgfSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYUBFZGdlIGNhbm5vdCB1c2UgZW52IHZhcnM7IHJlZGlyZWN0IGhhbmRsZXIga2VlcHMgdGFibGUgbmFtZSBpbiBjb2RlLlxuICAgIGNvbnN0IGVkZ2VSZWRpcmVjdCA9IG5ldyBjbG91ZGZyb250LmV4cGVyaW1lbnRhbC5FZGdlRnVuY3Rpb24odGhpcywgJ0VkZ2VSZWRpcmVjdCcsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgaGFuZGxlcjogJ3JlZGlyZWN0LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEnKSxcbiAgICB9KTtcblxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShzaG9ydGVuSGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkRGF0YShlZGdlUmVkaXJlY3QpO1xuXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXl2Mi5IdHRwQXBpKHRoaXMsICdBcGknLCB7XG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXG4gICAgICAgIGFsbG93TWV0aG9kczogW2FwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULCBhcGlnYXRld2F5djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OU10sXG4gICAgICAgIGFsbG93SGVhZGVyczogWydjb250ZW50LXR5cGUnXSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgYXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL3Nob3J0ZW4nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBhcGlnYXRld2F5djJJbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdTaG9ydGVuSW50Jywgc2hvcnRlbkhhbmRsZXIpLFxuICAgIH0pO1xuXG4gICAgY29uc3QgYXBpT3JpZ2luID0gbmV3IG9yaWdpbnMuSHR0cE9yaWdpbihjZGsuRm4uc2VsZWN0KDIsIGNkay5Gbi5zcGxpdCgnLycsIGFwaS5hcGlFbmRwb2ludCkpKTtcblxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnQ0ZEaXN0Jywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogYXBpT3JpZ2luLFxuICAgICAgICBlZGdlTGFtYmRhczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uVmVyc2lvbjogZWRnZVJlZGlyZWN0LmN1cnJlbnRWZXJzaW9uLFxuICAgICAgICAgICAgZXZlbnRUeXBlOiBjbG91ZGZyb250LkxhbWJkYUVkZ2VFdmVudFR5cGUuVklFV0VSX1JFUVVFU1QsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XG4gICAgICAgICcvc2hvcnRlbic6IHtcbiAgICAgICAgICBvcmlnaW46IGFwaU9yaWdpbixcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19BTEwsXG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuSFRUUFNfT05MWSxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX0RJU0FCTEVELFxuICAgICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5BTExfVklFV0VSX0VYQ0VQVF9IT1NUX0hFQURFUixcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2hvcnRlbkVuZHBvaW50Jywge1xuICAgICAgdmFsdWU6IGBQT1NUICR7YXBpLmFwaUVuZHBvaW50fS9zaG9ydGVuYCxcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0dsb2JhbCBVUkwgc2hvcnRlbmVyIGVudHJ5cG9pbnQnLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdSZWRpcmVjdFRlc3QnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZG9tYWluTmFtZX0vdkQ1QU5IYCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2FtcGxlIHJlZGlyZWN0IHRlc3QgVVJMJyxcbiAgICB9KTtcbiAgfVxufVxuIl19