import {
    BaseMessagePromptTemplateLike,
    ChatPromptTemplate,
} from "@langchain/core/prompts";

import { CloudflareWorkersAI } from "@langchain/cloudflare";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { context } from "../resumeContent.js";

export default async function streamChain(
    cfAcctId: string,
    cfApiToken: string,
    msgs: BaseMessagePromptTemplateLike[],
): Promise<IterableReadableStream<string>> {
    const llm = new CloudflareWorkersAI({
        model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", // @cf/meta/llama-3.1-70b-instruct
        cloudflareAccountId: cfAcctId,
        cloudflareApiToken: cfApiToken,
    });

    const systemPrompt = `Your job is to answer questions about Drew's resume. You will only answer the question using the given context from the resume. Respond in a conversational manner. Context: ${context}`;
    const sysMsg: BaseMessagePromptTemplateLike = ["system", systemPrompt];
    const messages = [sysMsg, ...msgs];
    const prompt = ChatPromptTemplate.fromMessages(messages);

    const chain = RunnableSequence.from([
        prompt,
        llm,
        new StringOutputParser(),
    ]);

    const stream = await chain.stream({});

    return stream;
}
