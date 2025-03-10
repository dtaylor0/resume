import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import {
    CloudflareVectorizeStore,
    CloudflareWorkersAIEmbeddings,
} from "@langchain/cloudflare";
import { MarkdownTextSplitter } from "langchain/text_splitter";
import streamRagChain from "./llm.js";
import { Document } from "@langchain/core/documents";
import { randomUUID } from "crypto";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

type Bindings = {
    AI: any;
    VECTORIZE: VectorizeIndex;
};

type MessageData = {
    sender: "human" | "ai";
    text: string;
    id: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/v1/hello", (c) => {
    return c.json({ text: "hello there from api" });
});

app.get(
    "/api/v2/ws",
    upgradeWebSocket((c) => {
        return {
            onMessage(event, ws) {
                console.log(`Message from client: ${event.data}`);
                try {
                    const wsReq: MessageData[] = JSON.parse(
                        event.data as string,
                    );
                    if (!wsReq) {
                        console.log("No prompt found.");
                        ws.send(JSON.stringify({ text: "No prompt provided" }));
                        return;
                    }

                    const messages = wsReq.map((m: MessageData) => {
                        switch (m.sender) {
                            case "human":
                                return new HumanMessage(m.text);
                            case "ai":
                                return new AIMessage(m.text);
                            default:
                                return new HumanMessage(m.text);
                        }
                    });

                    const id = randomUUID();
                    streamRagChain(
                        c.env.VECTORIZE,
                        c.env.AI,
                        c.env.CF_ACCOUNT_ID,
                        c.env.CF_API_TOKEN,
                        messages,
                    )
                        .then(async (stream) => {
                            const reader = stream.getReader();
                            let done = false;
                            while (!done) {
                                const chunk = await reader.read();
                                done = chunk.done;
                                const msg = {
                                    id,
                                    text: chunk.value?.answer,
                                    done,
                                };
                                ws.send(JSON.stringify(msg));
                            }
                        })
                        .catch((e) => {
                            const msg = JSON.stringify({
                                text: `invoke failure: ${e.message || "unknown error"}`,
                            });
                            console.log(msg);
                            ws.send(msg);
                        });
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

    splits.forEach((pageContent) =>
        console.log(
            `PAGE CONTENT:\n${pageContent}\n--------------------------\n`,
        ),
    );
    await store.addDocuments(
        splits.map((pageContent) => new Document({ pageContent })),
    );
}

export default app;
