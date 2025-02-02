import React, {
    FormEvent,
    KeyboardEvent,
    MutableRefObject,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import ChatMessage from "./ChatMessage";
import { Message } from "./ChatMessage";

function Chat() {
    const [messages, setMessages] = useState([] as Message[]);
    const textareaRef: MutableRefObject<HTMLTextAreaElement | null> =
        useRef(null);
    const chatContainerRef: MutableRefObject<HTMLDivElement | null> =
        useRef(null);

    const ws: MutableRefObject<WebSocket | null> = useRef(null);
    useEffect(() => {
        ws.current = new WebSocket("/apiv1/ws");
        ws.current.onmessage = (event) => {
            const json = JSON.parse(event.data);
            console.log(json);
            setMessages((ms) => [
                ...ms,
                { sender: "server", text: json.response },
            ]);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        };
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = useCallback(
        (e: KeyboardEvent | FormEvent) => {
            e.preventDefault();

            if (
                messages.length > 0 &&
                messages[messages.length - 1].sender === "client"
            ) {
                console.log(
                    "wait for the llm to respond before sending another message.",
                );
                return;
            }
            const promptInput = document.getElementById(
                "prompt-input",
            ) as HTMLTextAreaElement;
            const prompt = promptInput.value;
            setMessages((msgs) => [
                ...msgs,
                { sender: "client", text: prompt },
            ]);
            if (ws.current && ws.current.readyState === WebSocket.OPEN) {
                ws.current.send(
                    JSON.stringify({
                        prompt: [...messages, prompt],
                    }),
                );

                promptInput!.value = "";
            } else {
                console.log("WebSocket is not connected");
                setMessages((msgs) => [
                    ...msgs,
                    { sender: "server", text: "Not connected to the server." },
                ]);
            }
        },
        [messages],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Enter" && e.shiftKey == false) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit],
    );
    return (
        <>
            <div id="chat" className="flex-grow rounded-lg mt-3">
                <div
                    ref={chatContainerRef}
                    className="h-[50vh] overflow-y-auto scrollbar-hidden"
                >
                    {messages.map((msg, i) => ChatMessage(msg, i))}
                </div>
                <div
                    id="input-bubble"
                    className="rounded-lg border-3 border-neutral-900"
                >
                    <form id="chat-form" onSubmit={handleSubmit}>
                        <div className="flex">
                            <textarea
                                id="prompt-input"
                                placeholder="Type your question here..."
                                className="w-full border-0 focus:outline-none resize-none p-1 h-25 scrollbar-hidden"
                                ref={textareaRef}
                                onKeyDown={handleKeyDown}
                                inputMode="text"
                                name="prompt"
                                autoFocus
                            ></textarea>
                            <button
                                className="p-2 m-1 bg-(--accent) rounded-lg ml-auto h-10"
                                id="form-button"
                                type="submit"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default React.memo(Chat);
