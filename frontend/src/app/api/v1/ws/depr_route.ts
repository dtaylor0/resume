import { createRagChain } from "./llm";
import { RunnableSequence } from "@langchain/core/runnables";
import { upgradeWebSocket } from "hono/cloudflare-workers";

export async function GET() {
    upgradeWebSocket((c) => {
        return {
            onMessage(event, ws) {
                console.log(`Message from client: ${event.data}`);
                try {
                    const wsReq = JSON.parse(event.data as string);
                    if (!wsReq || !wsReq.prompt) {
                        console.log("No prompt found.");
                        ws.send(
                            JSON.stringify({ response: "No prompt provided" }),
                        );
                    } else {
                        createRagChain(
                            c.env.VECTORIZE,
                            c.env.AI,
                            c.env.CF_ACCOUNT_ID,
                            c.env.CF_API_TOKEN,
                        )
                            .then((r: RunnableSequence) => {
                                r.invoke(JSON.stringify(wsReq.prompt))
                                    .then((response) =>
                                        ws.send(JSON.stringify({ response })),
                                    )
                                    .catch((e) => {
                                        const msg = JSON.stringify({
                                            response: `invoke failure: ${e.message || "unknown error"}`,
                                        });
                                        console.log(msg);
                                        ws.send(msg);
                                    });
                            })
                            .catch((err: Error) => {
                                const msg = JSON.stringify({
                                    response: err.message,
                                });
                                console.error(msg);
                                ws.send(msg);
                            });
                    }
                } catch (error) {
                    console.error("Error in WebSocket handler:", error);
                    ws.send(
                        JSON.stringify({ response: "Internal server error" }),
                    );
                }
            },
            onClose: () => {
                console.log("Connection closed");
            },
        };
    });
}
