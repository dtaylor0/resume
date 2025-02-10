import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import {
    CloudflareVectorizeStore,
    CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import createRagChain from "./llm.js";
import { Document } from "@langchain/core/documents";
import { RunnableSequence } from "@langchain/core/runnables";
import { randomUUID } from "crypto";

type Bindings = {
    AI: any;
    VECTORIZE: VectorizeIndex;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/v1/hello", (c) => {
    return c.json({ text: "hello there from api" });
});

app.get(
    "/api/v1/ws",
    upgradeWebSocket((c) => {
        return {
            onMessage(event, ws) {
                console.log(`Message from client: ${event.data}`);
                try {
                    const wsReq = JSON.parse(event.data as string);
                    if (!wsReq || !wsReq.prompt) {
                        console.log("No prompt found.");
                        ws.send(JSON.stringify({ text: "No prompt provided" }));
                    } else {
                        const id = randomUUID();
                        createRagChain(
                            c.env.VECTORIZE,
                            c.env.AI,
                            c.env.CF_ACCOUNT_ID,
                            c.env.CF_API_TOKEN,
                        )
                            .then((r: RunnableSequence) =>
                                r.stream(JSON.stringify(wsReq.prompt)),
                            )
                            .then(async (res) => {
                                let done = false;
                                while (!done) {
                                    const chunk = await res.next();
                                    done = chunk.done;
                                    ws.send(
                                        JSON.stringify({
                                            id,
                                            text: chunk.value,
                                        }),
                                    );
                                }
                            })
                            .catch((e) => {
                                const msg = JSON.stringify({
                                    text: `invoke failure: ${e.message || "unknown error"}`,
                                });
                                console.log(msg);
                                ws.send(msg);
                            });
                    }
                } catch (error) {
                    console.error("Error in WebSocket handler:", error);
                    ws.send(JSON.stringify({ text: "Internal server error" }));
                }
            },
            onClose: () => {
                console.log("Connection closed");
            },
        };
    }),
);

app.post("/api/v1/resume", async (c) => {
    const resume = await c.req.json();
    const ok = await refreshVectorize(
        resume.contents,
        c.env.VECTORIZE,
        c.env.AI,
    );
    return c.json({ ok });
});

async function refreshVectorize(
    contents: string,
    vect: VectorizeIndex,
    ai: Bindings["AI"],
) {
    const md_splitter = new MarkdownTextSplitter();
    const splits = await md_splitter.splitText(contents);
    for (let i = 0; i < splits.length; i++) {
        for (const [k, v] of Object.entries(splits[i])) {
            if (typeof v === "object") {
                splits[i][k] = JSON.stringify(v);
            }
        }
    }

    const embeddings = new CloudflareWorkersAIEmbeddings({
        binding: ai,
        model: "@cf/baai/bge-small-en-v1.5",
    });
    const store = new CloudflareVectorizeStore(embeddings, {
        index: vect,
    });

    await store.addDocuments(
        splits.map((pageContent) => new Document({ pageContent })),
    );
}

export default app;
