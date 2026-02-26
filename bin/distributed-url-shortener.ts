#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DistributedUrlShortenerStack } from '../lib/distributed-url-shortener-stack';

const app = new cdk.App();

// EXPLICIT us-east-1 FOR LAMBDA@EDGE
new DistributedUrlShortenerStack(app, 'DistributedUrlShortenerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',  // ← THIS LINE FIXES THE ERROR
  },
});
