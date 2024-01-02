#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../lib/backend-stack';
import * as dotenv from "dotenv";

require('dotenv').config()

const envDev = {account: process.env.AWS_ACCOUNT, region: process.env.AWS_REGION }


const app = new cdk.App();
new BackendStack(app, 'BackendStack', {
  
  env: envDev,
  description: "Development Environment Stack for generative AI solution"


});