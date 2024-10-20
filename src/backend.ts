import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/cloudflare-workers';
import { CloudflareVectorizeStore, CloudflareWorkersAIEmbeddings } from '@langchain/cloudflare';
import { MarkdownTextSplitter } from 'langchain/text_splitter';
import createRagChain from './llm.js';
import { Document } from '@langchain/core/documents';
import { RunnableSequence } from '@langchain/core/runnables';

type Bindings = {
    AI: any;
    VECTORIZE: VectorizeIndex;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/apiv1/hello', (c) => {
    return c.json({ response: 'hello from api' });
});

app.get(
    '/apiv1/ws',
    upgradeWebSocket((c) => {
        c.header('Access-Control-Allow-Origin', '*');
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type');
        return {
            onMessage(event, ws) {
                console.log(`Message from client: ${event.data}`);
                try {
                    const wsReq = JSON.parse(event.data as string);
                    if (!wsReq || !wsReq.prompt) {
                        console.log('No prompt found.');
                        ws.send(JSON.stringify({ response: 'No prompt provided' }));
                    } else {
                        // ws.send(JSON.stringify({ response: 'Hello' }));
                        createRagChain(c.env.VECTORIZE, c.env.AI, c.env.CF_ACCOUNT_ID, c.env.CF_ACCOUNT_TOKEN)
                            .then((r: RunnableSequence) => {
                                r.invoke(wsReq.prompt)
                                    .then((llmRes) => ws.send(JSON.stringify({ response: llmRes })))
                                    .catch((e) => {
                                        const msg = JSON.stringify({ response: `invoke failure: ${e.message || 'unknown error'}` });
                                        console.log(msg);
                                        ws.send(msg);
                                    });
                            })
                            .catch((err: Error) => {
                                const msg = JSON.stringify({ response: err.message });
                                console.error(msg);
                                ws.send(msg);
                            });
                    }
                } catch (error) {
                    console.error('Error in WebSocket handler:', error);
                    ws.send(JSON.stringify({ response: 'Internal server error' }));
                }
            },
            onClose: () => {
                console.log('Connection closed');
            },
        };
    }),
);

app.post('/apiv1/resume', async (c) => {
    const resume = await c.req.json();
    const ok = refreshVectorize(resume.contents, c.env.VECTORIZE, c.env.AI);
    return c.json({ ok });
});

function createDocuments(text: string, chunkSize: number) {
    if (text.length < chunkSize) {
        throw new Error('Chunks cannot be larger than the input');
    }

    let documents = [];
    let lastLoaded = 0;
    while (lastLoaded < text.length - 1) {
        const start = lastLoaded + 1;
        let end = start + chunkSize;

        while (end > start && text[end] != ' ') {
            end--;
        }

        const doc = new Document({ pageContent: text.slice(start, end) });
        documents.push(doc);

        lastLoaded = end;
    }
    return documents;
}

async function refreshVectorize(contents: string, vect: VectorizeIndex, ai: Bindings['AI']) {
    const docs = createDocuments(contents, 600);
    const md_splitter = new MarkdownTextSplitter({ chunkSize: 600 });
    const splits = await md_splitter.splitDocuments(docs);

    const embeddings = new CloudflareWorkersAIEmbeddings({
        binding: ai,
        model: '@cf/baai/bge-small-en-v1.5',
    });
    const store = new CloudflareVectorizeStore(embeddings, {
        index: vect,
    });

    await store.addDocuments(splits);
}

export default app;
