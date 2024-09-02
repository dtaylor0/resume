import pickle

from fastapi import FastAPI
from langchain_chroma import Chroma
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI, OpenAIEmbeddings


def format_prompt(p: str) -> str:
    return f"""[System] You are an agent who acts as a recruiter for the person
in the provided resume. Please answer questions from potential hiring managers.
Do not give estimates of years of experience or other timelines.

[User] {p}

[Agent]"""


llm = ChatOpenAI(model="gpt-4o-mini")
vectorstore = Chroma(
    persist_directory="./data/store/chromadb/",
    embedding_function=OpenAIEmbeddings(),
)

retriever = vectorstore.as_retriever(search_type="mmr", search_kwargs={"fetch_k": 7})
with open("./data/objects/prompt.pkl", "rb") as f:
    prompt = pickle.load(f)


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


rag_chain = (
    {
        "context": retriever | format_docs,
        "question": RunnableLambda(format_prompt),
    }
    | prompt
    | llm
    | StrOutputParser()
)


app = FastAPI()


@app.get("/llm")
def prompt_llm(prompt: str):
    res = rag_chain.invoke(prompt)
    return {"response": res}
