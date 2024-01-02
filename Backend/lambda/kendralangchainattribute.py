import json 
import os
from langchain.retrievers import AmazonKendraRetriever
# from lib.kendra_index_retriever import KendraIndexRetriever
# from langchain.llms import AI21
from langchain.llms.bedrock import Bedrock
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA
import array as arr
import boto3

kendra_index = os.environ['AWS_KENDRA']

# Enter the value of your aws_access_key_id and aws_secret_access_key
bedrock_runtime = boto3.client(
        service_name="bedrock-runtime",
        region_name="us-east-1",
        aws_access_key_id="XXXXXXXXXXXXX",
        aws_secret_access_key="XXXXXXXXXXXXXXXX"
    )

# function to create AWS Kendra retriever 
def aws_retriever(Index_id: str, attribute: str, attribute_value: str):
    return AmazonKendraRetriever(
        index_id=Index_id,
        attribute_filter={
            'EqualsTo': {
                'Key': attribute,
                'Value': {
                    'StringValue': attribute_value
                }
            }
        })

# The function for creating a Retrieval documents chain using the RetrievalQA function from langchain framework
def create_chain(retriever_: AmazonKendraRetriever):
    
    # Using Bedrock to declare the LLM to be used
    Claude2 = Bedrock(
        model_id='anthropic.claude-v2',
        client=bedrock_runtime,
    )

    #  Using the imported AWS Kendra Retreiver in the run chain function to use as a retreiver in the RetrievalQA function
    retriever = retriever_
    
    print("************")
    print("THIS IS ONE FILTERED")
    print(retriever)
    print("************")
    print("************")

    # Defining the prompt template with variables of "Context" & "Question"
    prompt_template = """
    The following is a friendly conversation between a human and an AI. 
    The AI is talkative and provides lots of specific details from its context.
    If the AI does not know the answer to a question, it truthfully says it 
    does not know.
    {context}
    Instruction: Based on the above documents, provide a detailed answer for, {question} Answer "don't know" if not present in the document. Solution:
    """
    # referencing the prompt tempelate
    PROMPT = PromptTemplate(
        template=prompt_template, input_variables=["context", "question"]
    )
    # passing the prompt as a variable in the RetrievalQA function
    chain_type_kwargs = {"prompt": PROMPT}
    
    # returning the RetrievalQA chain with all the parameters
    return RetrievalQA.from_chain_type(
        Claude2, 
        chain_type="stuff", 
        retriever=retriever, 
        chain_type_kwargs=chain_type_kwargs, 
        return_source_documents=True
    )

# function for starting the chain 
def start_chain(chain, prompt: str):
    result = chain(prompt)
    # To make it compatible with samples
    return {
        "answer": result['result'],
        "source_documents": result['source_documents']
    }


def handler(event, context):
    
    print(json.dumps(event))
    
    # loading body 
    body_ = json.loads(event['body'])
    
    print(body_)
    
    # extracting prompt from body
    prompt_ = body_['prompt']
    
    # extracting attribute from body
    attribute_ = body_['attribute']
    
    # extracting attribute_value from body
    attribute_value = body_['attribute_value']
    
    # passing values to the AWS Retriever
    Aws_Retriever = aws_retriever(kendra_index, attribute_, attribute_value)
    
    # Passing thre AWS Retriever in the chain
    chain = create_chain(Aws_Retriever)
    
    # starting the chain
    result = start_chain(chain, prompt_)
    
    print(result)
    
    print(json.dumps(result['answer']))
    
    response = result['answer']
    
    sources_list = []
    
    # filtering Sourcs documents
    if 'source_documents' in result:
        print('Sources:')
        for d in result['source_documents']:
            sources_list.append(d.metadata)
            print(d.metadata)

    result  = buildResponse(response, sources_list)
    
    return result


def buildResponse(body, body_2):
    
    return {
        "statusCode" : 200,
        "headers" : {
            'Access-Control-Allow-Origin' : '*',
            'Content-Type' : 'application/json'
        },
        "body" : json.dumps({
            "answer": body,
            "sources": body_2
        })
    }