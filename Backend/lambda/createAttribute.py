import json
import boto3
import os
import time

kendra_client = boto3.client('kendra')

kendra_index = os.environ['AWS_KENDRA']
Data_Source_Id = os.environ['KENDRA_DATA_SOURCE']

def handler(event, context):
    
    # extracting values from the request body
    body_ = event['body']
    print(body_)
    print(type(body_))
    
    body_1 = json.loads(body_)
    print(body_1)
    print(type(body_1))
    
    object_attribute = body_1["attribute"]
    print(type(object_attribute))
    print(object_attribute)
    
    # calling the update index method to add a new attribute of String value
    add_attribute_kendra = kendra_client.update_index(
        Id=kendra_index,
        DocumentMetadataConfigurationUpdates=[{
            'Name': object_attribute,
            'Type': 'STRING_VALUE',
            #properties for the facet 
            'Search': {
                'Facetable': True,
                'Searchable': True,
                'Displayable': True,
                'Sortable': False
            },
        }]
    )
    print(add_attribute_kendra)
    
    # waiting for the Kendra Index to implement the update Index
    time.sleep(20)
    
    # Sync the data source
    sync_kendra = kendra_client.start_data_source_sync_job(
        Id=Data_Source_Id,
        IndexId=kendra_index
    )
    print(sync_kendra)
    
    response = buildResponse("Success")
    
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