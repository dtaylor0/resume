import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import streamChain from "./llm.js";
import { randomUUID } from "crypto";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { BaseMessagePromptTemplateLike } from "@langchain/core/prompts";

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

                    const messages: BaseMessagePromptTemplateLike[] = wsReq.map(
                        (m: MessageData) => {
                            switch (m.sender) {
                                case "human":
                                    return new HumanMessage(m.text);
                                case "ai":
                                    return new AIMessage(m.text);
                                default:
                                    return new HumanMessage(m.text);
                            }
                        },
                    );

                    const id = randomUUID();
                    streamChain(
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
                                    text: chunk.value,
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

export default app;
