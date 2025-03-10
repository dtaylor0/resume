import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";

import {
    CloudflareVectorizeStore,
    CloudflareWorkersAI,
    CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import type { VectorizeIndex, Ai } from "@cloudflare/workers-types";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createHistoryAwareRetriever } from "langchain/chains/history_aware_retriever";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { Document } from "langchain/document";

export default async function streamRagChain(
    vectorIndex: VectorizeIndex,
    ai: Ai,
    cfAcctId: string,
    cfApiToken: string,
    msgs: (HumanMessage | AIMessage)[],
): Promise<
    IterableReadableStream<{
        context: Document<Record<string, any>>[];
        answer: string;
    }>
> {
    const llm = new CloudflareWorkersAI({
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", // @cf/meta/llama-3.1-70b-instruct
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

    const systemPrompt = `Your job is to answer questions about Drew's resume. You will only answer the question using the given context from the resume. Respond in a conversational manner. Context: {context}`;
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["user", "{input}"],
    ]);

    const documentChain = await createStuffDocumentsChain({
        llm,
        prompt,
    });

    const retrieverChain = await createHistoryAwareRetriever({
        llm,
        retriever,
        rephrasePrompt: ChatPromptTemplate.fromMessages([
            new MessagesPlaceholder("messages"),
            [
                "user",
                "Given the above conversation, generate a search query to look up in order to provide additional context for the conversation. The most recent question is: {input}",
            ],
            [
                "system",
                "The search query should be very concise and simple. It should exclude any mention of the conversation history.",
            ],
        ]),
    });

    const retrievalChain = await createRetrievalChain({
        combineDocsChain: documentChain,
        retriever: retrieverChain,
    });

    const stream = await retrievalChain.stream({
        input: msgs[msgs.length - 1].content as string,
        messages: msgs,
    });

    return stream;
}
