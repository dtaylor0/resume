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

export default async function createRagChain(
    vectorIndex: VectorizeIndex,
    ai: Ai,
    cfAcctId: string,
    cfApiToken: string,
): Promise<RunnableSequence<any, string>> {
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

    const retriever = vectorStore.asRetriever({
        searchKwargs: { fetchK: 20 },
    });

    const prompt =
        PromptTemplate.fromTemplate(`Please answer questions about Drew's
resume. You will not give specific estimates on time, age, or any similar
topic. Respond directly to the final unanswered question in natural language.

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
