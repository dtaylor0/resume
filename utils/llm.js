import { RunnableSequence, RunnablePassthrough, } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { CloudflareVectorizeStore, CloudflareWorkersAI, CloudflareWorkersAIEmbeddings, } from "@langchain/cloudflare";
import { formatDocumentsAsString } from "langchain/util/document";
export default async function createRagChain(vectorIndex, ai) {
    const llm = new CloudflareWorkersAI();
    const embeddings = new CloudflareWorkersAIEmbeddings({
        binding: ai,
        model: "@cf/baai/bge-small-en-v1.5",
    });
    const vectorStore = new CloudflareVectorizeStore(embeddings, {
        index: vectorIndex,
    });
    const retriever = vectorStore.asRetriever({
        searchKwargs: { fetchK: 20 },
    });
    const prompt = PromptTemplate.fromTemplate(`Your job is to answer questions about Drew's
    resume for potential employers. Understand the context and then provide
    the relevant answer to the question. You will not answer questions which
    are unrelated to the resume, and you will not give specific estimates on
    time, age, or any similar topic. You will also reformat all your
    responses into well-formatted plaintext and no markdown. Additionally,
    you will not quote anything directly from the resume.

{context}

Question: {question}

Answer:`);
    return RunnableSequence.from([
        {
            context: retriever.pipe(formatDocumentsAsString),
            question: new RunnablePassthrough(),
        },
        prompt,
        llm,
        new StringOutputParser(),
    ]);
}
