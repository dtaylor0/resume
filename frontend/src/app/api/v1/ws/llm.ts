import {
    RunnableSequence,
    RunnablePassthrough,
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

import {
    CloudflareVectorizeStore,
    CloudflareWorkersAI,
    CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import type { VectorizeIndex, Ai } from "@cloudflare/workers-types";
import { formatDocumentsAsString } from "langchain/util/document";

export async function createRagChain(
    vectorIndex: VectorizeIndex,
    ai: Ai,
    cfAcctId: string,
    cfApiToken: string,
): Promise<RunnableSequence<string, string>> {
    const llm = new CloudflareWorkersAI({
        //model: '@cf/meta/llama-3.1-70b-instruct',
        cloudflareAccountId: cfAcctId,
        cloudflareApiToken: cfApiToken,
    });
    const embeddings = new CloudflareWorkersAIEmbeddings({
        binding: ai,
        model: "@cf/baai/bge-small-en-v1.5",
    });
    const vectorStore = new CloudflareVectorizeStore(embeddings, {
        index: vectorIndex,
    });

    const retriever = vectorStore.asRetriever();

    const prompt =
        PromptTemplate.fromTemplate(`Your job is to answer questions about Drew's
resume. You will only answer the question using the given context from the resume.
(Respond in a conversational manner.)


Question: {question}


Context: {context}
`);

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
