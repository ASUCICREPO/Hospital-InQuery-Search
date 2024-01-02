import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import {Runtime}from "aws-cdk-lib/aws-lambda";
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib'
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as api_gateway from 'aws-cdk-lib/aws-apigateway';
import * as logs from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Kendra } from './kendra';
import { EditionType } from './kendra'
import { Period } from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

require('dotenv').config()

 // The kay pair needs to exist before hand and we can reference it here
 // If we don't pass the key pair, it will give an error
const ec2_key_value = process.env.KEY_NAME_VALUE

// Random string generation for the nucket name
let randomString = (Math.random() + 1).toString(36).substring(7);
// name assigned to the input s3 bucket You can change it here
const input_bucket = "dev-kendra-source"

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The bucket bucket name generated using the random string
    const inputBucketgenerated = input_bucket + randomString;

    // S3 bucket for kendra source
    const dev_s3_kendra_source = new s3.Bucket(this, inputBucketgenerated)

    // Kendra
    const Kendra_Index = new Kendra(this, "kendra-index", {
      s3_Source_Bucket: dev_s3_kendra_source, // Source s3 bucket
      Index_name: "dev-kendra-construct",
      edition: EditionType.DEVELOPER_EDITION,
      Data_Source_name: "dev-construct-source",
      Data_Source_desciption: "Test development of construct source bucket",
      attribute_metadata: "type"
    })

    // Lambda function for Kendra Sync
    const kendra_sync_func = new lambda.Function(this, "dev_kendra_sync", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"),
      handler: "kendraSync.handler",
      environment: {
        "AWS_KENDRA": Kendra_Index.Kendra_Index.attrId,
        "KENDRA_DATA_SOURCE": Kendra_Index.Kendra_DataSource.attrId
      }
    });

    // policy for lambda function
    kendra_sync_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*",
          "kendra:*"
        ],
        resources: ["*"],
      })
    )

    // Lambda function to create attribute to kendra index
    const create_attribute_func = new lambda.Function(this, "dev_create_attribute", {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset("lambda"),
      handler: "createAttribute.handler",
      timeout: Duration.minutes(10),
      environment: {
        "AWS_KENDRA": Kendra_Index.Kendra_Index.attrId,
        "KENDRA_DATA_SOURCE": Kendra_Index.Kendra_DataSource.attrId
      }
    });

    create_attribute_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*",
          "kendra:*"
        ],
        resources: ["*"],
      })
    )

    // API for create_attribute
    const create_attribute_API = new api_gateway.RestApi(this, 'dev_create_attribute_API', {
      cloudWatchRole: true,
      deployOptions:{
        accessLogDestination: new api_gateway.LogGroupLogDestination(new logs.LogGroup(this, "dev_create_attribute_api_log_group", {
          logGroupName: "dev_create_attribute_api_log_group",
          retention: RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        })),
      }
    })

    // get_presigned_URL integration
    const create_attribute_integration = new api_gateway.LambdaIntegration(create_attribute_func);

    // declaring the resource and then adding method 
    const create_attribute_api_path = create_attribute_API.root.addResource('create')

    // adding post method
    create_attribute_api_path.addMethod("POST", create_attribute_integration)


    // Lambda fucntion to get signed URL for a partiula folder in s3
    const get_presigned_URL = new lambda.Function(this, "dev_get_presignedURL", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda"),
      handler: "getSignedURL.handler",
      environment: {
        "BUCKET_NAME": dev_s3_kendra_source.bucketName
      }
      }
    )

    get_presigned_URL.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*"
        ],
        resources: ["*"],
      })
    )

    // Lambda function to create Metadata.Json file for the uploadd file
    const list_s3_object_func = new lambda.Function(this, "dev_list_s3_object_func", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda"),
      handler: "s3List.handler",
      environment: {
        "BUCKET_NAME": dev_s3_kendra_source.bucketName
      }
    })

    list_s3_object_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*"
        ],
        resources: ["*"],
      })
    )

    // Lambda function to create Metadata.Json file for the uploadd file
    const delete_s3_object_func = new lambda.Function(this, "dev_delete_s3_object_func", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda"),
      handler: "deletes3object.handler",
      environment: {
        "BUCKET_NAME": dev_s3_kendra_source.bucketName
      }
    })

    delete_s3_object_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*"
        ],
        resources: ["*"],
      })
    )

    // API for generating S3 presigned URL
    const get_preSignedURL_API = new api_gateway.RestApi(this, 'dev_get_preSignedURL_API', {
      cloudWatchRole: true,
      deployOptions:{
        accessLogDestination: new api_gateway.LogGroupLogDestination(new logs.LogGroup(this, "dev_get_preSignedURL_api_log_group", {
          logGroupName: "dev_get_preSignedURL_api_log_group",
          retention: RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        })),
      }
    })

    // get_presigned_URL integration
    const get_preSignedURL_integration = new api_gateway.LambdaIntegration(get_presigned_URL);

    // declaring the resource and then adding method 
    const get_preSignedURL_api_path = get_preSignedURL_API.root.addResource('url')

    // adding post method
    get_preSignedURL_api_path.addMethod("POST", get_preSignedURL_integration)


    //  Get Objects List
    // get Objects List integration
    const get_s3_list_integration = new api_gateway.LambdaIntegration(list_s3_object_func);

    // declaring the resource and then adding method 
    const get_s3_list_api_path = get_preSignedURL_API.root.addResource('list')

    // adding GET method
    get_s3_list_api_path.addMethod("GET", get_s3_list_integration)

    // POST Delete Objects
    // post Delete Objects List integration
    const delete_s3_integration = new api_gateway.LambdaIntegration(delete_s3_object_func);

    // declaring the resource and then adding method 
    const delete_s3_api_path = get_preSignedURL_API.root.addResource('remove')

    // adding POST method
    delete_s3_api_path.addMethod("POST", delete_s3_integration)


    // Lambda function to create Metadata.Json file for the uploadd file
    const create_metadata_func = new lambda.Function(this, "dev_create_metadata_func", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda"),
      handler: "createMetadataJson.handler",
      environment: {
        "BUCKET_NAME": dev_s3_kendra_source.bucketName
      }
    })

    create_metadata_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:*",
          "apigateway:*",
          "s3:*"
        ],
        resources: ["*"],
      })
    )

    // S3 notification to trigger Kendra sync on JSON object create 
    dev_s3_kendra_source.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(kendra_sync_func),{
        suffix: '.json'
      }
    )

    // S3 notification to trigger Kendra sync on object removed
    dev_s3_kendra_source.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(kendra_sync_func)
    )

    // S3 notification to trigger Kendra sync on .pdf object create 
    dev_s3_kendra_source.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(create_metadata_func),{
        suffix: '.pdf'
      }
    )

    // creating the layer for all the dependencies for the "Langchain" framework
    const langchain_2_layer = new lambda.LayerVersion(this, "dev_langchain2_layer", {
      compatibleRuntimes: [
        lambda.Runtime.PYTHON_3_10,
        lambda.Runtime.PYTHON_3_9,
        lambda.Runtime.PYTHON_3_8
      ],
      code: lambda.Code.fromAsset("layers/langchain"),
      description: 'The langchainlayer with all dependencies',
    })

    // Lambda function created for the AWS Kendra retrieval and then chaining with the LLM to generate a response using the langchain layer
    const kendralangchain_attribute_func = new lambda.Function(this, "dev_kendralangchain_attribute_ ", {
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset("lambda"),
      handler: "kendralangchainattribute.handler",
      timeout: Duration.minutes(15),
      environment: {
        "AWS_KENDRA": Kendra_Index.Kendra_Index.attrId
      },
      layers: [langchain_2_layer]
    });

    // providing IAM policy for the function
    kendralangchain_attribute_func.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["*","kendra:*", "bedrock:*"],
        resources: ["*"],
      })
    )
    
    // API for generating response using Kendralangchain_func
    const LLM_Generate_attribute__API = new api_gateway.RestApi(this, 'dev_llm_generate_attribute_api', {
      cloudWatchRole: true,
      deployOptions:{
        accessLogDestination: new api_gateway.LogGroupLogDestination(new logs.LogGroup(this, "dev_llm_generate_attribute_api_log_group", {
          logGroupName: "dev_llm_generate_attribute_api_log_group",
          retention: RetentionDays.ONE_MONTH,
          removalPolicy: RemovalPolicy.DESTROY,
        })),
      }
    })

    // llm generator integration
    const llm_generator_attribute_integration = new api_gateway.LambdaIntegration(kendralangchain_attribute_func);

    // declaring the resource and then adding method 
    const llm_generation_attribute_api_path = LLM_Generate_attribute__API.root.addResource('generate')

    // adding post method
    llm_generation_attribute_api_path.addMethod("POST", llm_generator_attribute_integration)



    // launching an EC2 instance 
    // Create VPC in which we'll launch the Instance
    const vpc = new ec2.Vpc(this, '-vpc', {
      cidr: '10.0.0.0/16',
      natGateways: 0,
      subnetConfiguration: [
        {name: 'public', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC},
      ],
    });

    // Create Security Group for the Instance
    const webserverSG = new ec2.SecurityGroup(this, 'webserver-sg', {
      vpc,
      allowAllOutbound: true,
    });

    // Adding inbound rules
    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH access from anywhere',
    );

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    webserverSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    // The kay pair needs to exist before hand and we can reference it here
    // If we don't pass the key pair, it will give an error
    // Create the EC2 Instance
    const ec2Instance = new ec2.Instance(this, 'cic_genAI_demo_v2', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: webserverSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      keyName: ec2_key_value,
    });

  }
}