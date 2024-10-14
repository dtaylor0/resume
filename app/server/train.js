import { existsSync, rm } from "node:fs";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { OpenAIEmbeddings } from "@langchain/openai";

const VS_PATH = "./data/";
const RESUME_PATH = "./Resume.md";

async function main() {
    if (existsSync(VS_PATH)) {
        rm(VS_PATH, (err) => {
            throw err;
        });
    }
    const loader = new TextLoader(RESUME_PATH);
    const docs = await loader.load();

    const md_splitter = new MarkdownTextSplitter({ chunkSize: 600 });
    const splits = await md_splitter.splitDocuments(docs);

    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await FaissStore.fromDocuments(splits, embeddings);
    vectorStore.save(VS_PATH);
}

main();
