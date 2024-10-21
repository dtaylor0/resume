import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

import { CloudflareVectorizeStore, CloudflareWorkersAI, CloudflareWorkersAIEmbeddings } from '@langchain/cloudflare';
import type { VectorizeIndex, Ai } from '@cloudflare/workers-types';
import { formatDocumentsAsString } from 'langchain/util/document';

export default async function createRagChain(
    vectorIndex: VectorizeIndex,
    ai: Ai,
    cfAcctId: string,
    cfApiToken: string,
): Promise<RunnableSequence<any, string>> {
    const llm = new CloudflareWorkersAI({
        model: '@cf/meta/llama-3.1-8b-instruct-fast',
        cloudflareAccountId: cfAcctId,
        cloudflareApiToken: cfApiToken,
    });
    const embeddings = new CloudflareWorkersAIEmbeddings({
        binding: ai,
        model: '@cf/baai/bge-small-en-v1.5',
    });
    const vectorStore = new CloudflareVectorizeStore(embeddings, {
        index: vectorIndex,
    });

    const retriever = vectorStore.asRetriever({
        searchKwargs: { fetchK: 10 },
    });

    const prompt = PromptTemplate.fromTemplate(`Your job is to answer questions about Drew's
    resume for potential employers. Understand the context and then provide
    the relevant answer to the question. You will not answer questions which
    are unrelated to the resume, and you will not give specific estimates on
    time, age, or any similar topic. You will not give answers that are not
    directly pulled from the resume. You will also reformat all your
    responses into well-formatted plaintext and no markdown.

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
