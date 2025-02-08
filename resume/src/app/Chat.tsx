"use client";

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
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem("messages");
        return savedMessages !== null
            ? (JSON.parse(savedMessages) as Message[])
            : ([] as Message[]);
    });
    useEffect(
        () => localStorage.setItem("messages", JSON.stringify(messages)),
        [messages],
    );
    const textareaRef: MutableRefObject<HTMLTextAreaElement | null> =
        useRef(null);
    const chatContainerRef: MutableRefObject<HTMLDivElement | null> =
        useRef(null);

    const ws: MutableRefObject<WebSocket | null> = useRef(null);
    useEffect(() => {
        ws.current = new WebSocket("/api/v1/ws");
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
                        prompt: [prompt],
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
            <div className="flex">
                <h2 className="text-2xl font-bold text-left my-4">About Me</h2>
                <button
                    className="p-2 my-auto float-right font-semibold bg-background border-2 border-accent rounded-lg ml-auto h-10"
                    onClick={() => {
                        if (
                            confirm(
                                "Are you sure you want to erase the current chat history?",
                            )
                        ) {
                            setMessages([]);
                        }
                    }}
                >
                    New Chat
                </button>
            </div>
            <div id="chat" className="h-full rounded-lg mt-3">
                <div
                    ref={chatContainerRef}
                    className="h-[70%] overflow-y-auto scrollbar-thin"
                >
                    <p className="text-sm md:text-base overflow-hidden">
                        My name is Drew and I am a Software Engineer at
                        Deloitte. I implement cloud solutions for commercial and
                        federal clients under Deloitte's AI & Engineering
                        Offering. Please use the chat below to learn more about
                        my work experience.
                    </p>
                    {messages.map((msg, i) => ChatMessage(msg, i))}
                </div>
                <form
                    id="chat-form"
                    className="rounded-lg flex bg-background p-3"
                    onSubmit={handleSubmit}
                >
                    <textarea
                        id="prompt-input"
                        placeholder="Type your question here..."
                        className="flex-grow scrollbar-thin rounded-lg bg-inherit focus:outline-none resize-none p-3 mx-3 h-25"
                        ref={textareaRef}
                        onKeyDown={handleKeyDown}
                        inputMode="text"
                        name="prompt"
                        autoFocus
                    ></textarea>
                    <button
                        className="p-2 m-auto float-right font-semibold bg-altbackground border-2 border-accent rounded-lg ml-auto h-10"
                        id="form-button"
                        type="submit"
                    >
                        Send
                    </button>
                </form>
            </div>
        </>
    );
}

export default React.memo(Chat);
