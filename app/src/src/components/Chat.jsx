import { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";

function Chat() {
    const [messages, setMessages] = useState([]);
    const ws = useRef(null);

    useEffect(() => {
        ws.current = new WebSocket("/api/ws");
        ws.current.onmessage = (event) => {
            const json = JSON.parse(event.data);
            console.log(json);
            setMessages((ms) => [...ms, json.response]);
        };
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    return (
        <div id="chat" className="chat-container">
            <div className="chat-message chat-field">
                {messages.map((msg, i) => ChatMessage(msg, i))}
                <form
                    id="chat-form"
                    className="chat-item"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (
                            ws.current &&
                            ws.current.readyState === WebSocket.OPEN
                        ) {
                            const promptInput =
                                document.getElementById("prompt-input");
                            const prompt = promptInput.value;

                            ws.current.send(
                                JSON.stringify({
                                    prompt: [...messages, prompt].join("\n\n"),
                                }),
                            );

                            setMessages((msgs) => [...msgs, prompt]);
                            promptInput.value = "";
                        } else {
                            console.log("WebSocket is not connected");
                        }
                    }}
                >
                    <textarea
                        id="prompt-input"
                        inputMode="text"
                        type="text"
                        name="prompt"
                        autoFocus
                    ></textarea>
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default Chat;
