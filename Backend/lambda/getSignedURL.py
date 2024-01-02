import json
import boto3
import os

s3_client = boto3.client('s3')

bucket_name = os.environ['BUCKET_NAME']

def handler(event, context):
    
    
    
    body_ = event['body']
    print(body_)
    print(type(body_))
    
    body_1 = json.loads(body_)
    print(body_1)
    print(type(body_1))
    
    # name as provided by the post request
    object_Id = body_1.get("name")
    print(object_Id)
    # name of the attributed created that the document belongs to
    object_attribute = body_1.get("attribute")
    print(object_attribute)
    # The value of the attribute that needs to be attached to the document
    object_attribute_value = body_1.get("attribute_value")
    print(object_attribute_value)
    
    # naming the document in a specified way to use object key to do pre processing
    object_id_generated =  object_attribute + "-" + object_attribute_value+ "-" + object_Id 
    print(object_id_generated)
    
    object_Id = object_id_generated
    
    # generating a pre signed URL
    pre_response = s3_client.generate_presigned_post(
        Bucket = bucket_name,
        Key = object_Id,
        ExpiresIn = 600 
    )
    
    response = buildResponse(pre_response)
    # response = event
    print(json.dumps(response))
    
    return response

def buildResponse(body):
    return {
        "statusCode" : 200,
        "headers" : {
            'Access-Control-Allow-Origin' : '*',
            'Content-Type' : 'application/json'
        },
        "body" : json.dumps(body)
    }
    