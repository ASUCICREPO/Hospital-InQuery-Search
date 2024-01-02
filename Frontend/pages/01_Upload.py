import streamlit as st
import requests as request 
import json 
from PIL import Image
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import os
import io
import time

load_dotenv()

# S3 credentials
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY")
BUCKET_NAME= os.getenv("BUCKET_NAME")
region_bucket='us-east-1'

st.set_page_config(
    page_title="Upload",
    page_icon="📤"
)

st.sidebar.header("Upload Files 📤")

# Make POST request to API to get presigned S3 URL
presigned_post_data = {
    "name": "QualityManagementSystem.pdf",
    "attribute": "valuedoc",
    "attribute_value": "Regulatory_1"
}

# Upload to s3 function with added metadata
def upload_to_aws(local_file, bucket, s3_file, metadata):
    
    
    s3 = boto3.client('s3', aws_access_key_id=S3_ACCESS_KEY,
                      aws_secret_access_key=S3_SECRET_KEY)
    
    if(metadata == "Insurance"):
        object_id_generated = "typeof" + "-" +"Insurance" + "-" + s3_file 
        print(object_id_generated)
    else:
        object_id_generated = "typeof" + "-" +"Regulatory" + "-" + s3_file
        print(object_id_generated)
    

    try:
        s3.upload_fileobj(
            local_file,
            bucket,
            object_id_generated,
            )
        # upload successful 
        print("Upload Successful")
        return True
    except FileNotFoundError:
        print("The file was not found")
        return False

# select the option for type of documebt to be uploaded 
option = st.selectbox(
    'Document Type',
    ('Regulatory', 'Insurance'))
print(option)
print(type(option))

# calling method to upload files with a type of metadata
pdf_file = st.file_uploader("Choose a file")

if pdf_file:
    name = pdf_file.name
    print(name)
    with st.spinner("loading.."):
        file_uploader = upload_to_aws(pdf_file, BUCKET_NAME, name, option)
        time.sleep(10)