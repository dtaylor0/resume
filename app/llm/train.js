import { existsSync, mkdir, rm } from "node:fs";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

const CHROMA_PATH = "./data/store/chromadb";
const RESUME_PATH = "./Resume.md";

async function main() {
  if (existsSync(CHROMA_PATH)) {
    rm(CHROMA_PATH, { recursive: true });
  }
  mkdir(CHROMA_PATH, { recursive: true }, (error) => {
    throw error;
  });

  const loader = new TextLoader(RESUME_PATH);
  const docs = await loader.load();

  const md_splitter = new MarkdownTextSplitter({ chunkSize: 900 });
  const splits = await md_splitter.splitDocuments(docs);

  const embeddings = new OpenAIEmbeddings();
  const chromadoc = await Chroma.fromDocuments(splits, embeddings);
}
