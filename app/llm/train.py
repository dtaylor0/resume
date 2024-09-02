import os
import pathlib
import pickle
import shutil

import dotenv
from langchain import hub
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import MarkdownTextSplitter

dotenv.load_dotenv()


def main():
    if os.path.isdir("./data/store/chromadb/"):
        shutil.rmtree("./data/store/chromadb/")
    pathlib.Path("./data/store").mkdir(parents=True, exist_ok=True)
    pathlib.Path("./data/objects").mkdir(parents=True, exist_ok=True)
    loader = TextLoader("./Resume.md")
    docs = loader.load()

    md_splitter = MarkdownTextSplitter(chunk_size=900)
    splits = md_splitter.split_documents(docs)
    _ = Chroma.from_documents(
        documents=splits,
        embedding=OpenAIEmbeddings(),
        persist_directory="./data/store/chromadb",
    )

    prompt = hub.pull("rlm/rag-prompt")
    with open("./data/objects/prompt.pkl", "wb") as f:
        pickle.dump(prompt, f)


if __name__ == "__main__":
    main()
