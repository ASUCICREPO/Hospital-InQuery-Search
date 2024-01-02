import streamlit as st
import requests as request 
import json 
from PIL import Image
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import os

# Endpoint to query
LLM_api = "https:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

st.set_page_config(
    page_title="Query",
    page_icon="🤖"
)

st.sidebar.header("Query 🤖")

# image being displayed for the app
image = Image.open('PCH_logo.png')
st.image(image)
    
st.title('The Phoenix Children\'s Hospital AI assistant')
    
# select the option for type of documebt to be query
option = st.sidebar.selectbox(
    'Document type to Query:',
    ('Regulatory', 'Insurance',))
    
# Entering the prompt for query
prompt = st.text_input('Ask PDF!') 

query_button = st.button(":blue[Query]", use_container_width=True)

headers_val = {
  'Content-Type': 'application/json'
}

if query_button:
    with st.spinner("loading.."):
        request_ = request.post( 
            LLM_api,
            json= {
            "prompt": prompt,
            "attribute": "typeof",
            "attribute_value": option
            },
            headers=headers_val
        )
        
        if(request_.status_code != 200):
            st.write("""
                     Error:\n
                     -> The PDF is not accessible in this document type, you may want to change the type of document to query and run query again\n
                            OR\n
                     -> The PDF is not present in the source and you may want to upload the PDF you want to Query
                     """)
        else:
            # formatting the response form api
            formatted_response = json.loads(request_.text)
            print(formatted_response)
                    
            # extracting answer from the api response 
            answer = formatted_response['answer']
                    
    # using streamlit expander to display source link and the aws kendra excerpt
    # extracting source link and the excerpt from aws Kendra
    if ((len(formatted_response['sources']) <= 0) or (request_.status_code != 200)):
        st.write(
            """
                Error:\n
                -> The PDF is not accessible in this document type, you may want to change the type of document to query and run query again\n
                        OR\n
                -> The PDF is not present in the source and you may want to upload the PDF you want to Query\n 
                        OR\n
                -> Try again to query request timed out
            """
        )
    else: 
        st.write(answer)
        st.write("Sources")
        for src in formatted_response['sources']: 
            source_link =  src['source']
            source_excerpt = src['excerpt']
            # using streamlit expander to display source link and the aws kendra excerpt
            with st.expander("Source Link: " + source_link):
                st.write("\n"+
                 source_excerpt+
            "\n")

    
                        