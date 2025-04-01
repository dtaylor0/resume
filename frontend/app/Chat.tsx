'use client';

import React, { FormEvent, KeyboardEvent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import Message from './Message';

export type MessageData = {
    sender: 'human' | 'ai';
    text: string;
    id: string;
};

type WebsocketData = {
    text: string | undefined;
    id: string;
    done: boolean;
};

function useMessagePersistence(initialMessages: MessageData[] = []) {
    const [messages, setMessages] = useState(initialMessages);

    useEffect(() => {
        const storedMsgs = localStorage.getItem('messages');
        if (storedMsgs) {
            setMessages(JSON.parse(storedMsgs));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('messages', JSON.stringify(messages));
    }, [messages]);

    return [messages, setMessages] as const;
}

function useScrollToBottom(ref: MutableRefObject<HTMLElement | null>, dependency: unknown[]) {
    useEffect(() => {
        const element = ref.current;
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [dependency, ref]);
}

function useWebSocket(wsHost: string, onMessage: (data: WebsocketData) => void, textareaRef: MutableRefObject<HTMLTextAreaElement | null>) {
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        ws.current = new WebSocket(wsHost);
        ws.current.onmessage = (event) => {
            const json: WebsocketData = JSON.parse(event.data);
            onMessage(json);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [wsHost, onMessage, textareaRef]);

    return ws;
}

function useMessageQueue(setMessages: React.Dispatch<React.SetStateAction<MessageData[]>>) {
    const updateQueue = useRef<WebsocketData[]>([]);
    const isProcessing = useRef(false);

    const processQueue = useCallback(() => {
        if (isProcessing.current || updateQueue.current.length === 0) {
            return;
        }

        isProcessing.current = true;
        const nextUpdate = updateQueue.current.shift()!;
        setMessages((ms) => {
            const prevMsg = ms[ms.length - 1];
            const prevText = prevMsg.text;
            if (nextUpdate.id === prevMsg.id) {
                const newMessages = ms.slice(0, -1);
                newMessages.push({
                    id: nextUpdate.id,
                    sender: 'ai',
                    text: prevText + (nextUpdate.text || ''),
                });
                return newMessages;
            }
            return [...ms, { sender: 'ai', text: nextUpdate.text || '', id: nextUpdate.id }];
        });
        isProcessing.current = false;
        processQueue();
    }, [setMessages]);

    const addToQueue = useCallback(
        (newData: WebsocketData) => {
            updateQueue.current.push(newData);
            processQueue();
            return newData.done;
        },
        [processQueue],
    );

    return { addToQueue, updateQueue, isProcessing };
}

function ChatHeader({ onNewChat }: { onNewChat: () => void }) {
    return (
        <div className="flex justify-between p-3 md:p-4">
            <h2 className="md:text-xl my-auto font-bold text-left">About</h2>
            <button
                className="px-3 py-2 font-semibold bg-accent dark:bg-darkaccent rounded-lg"
                onClick={() => {
                    if (confirm('Are you sure you want to erase the current chat history?')) {
                        onNewChat();
                    }
                }}
            >
                New Chat
            </button>
        </div>
    );
}

function MessageList({
    messages,
    chatContainerRef,
}: {
    messages: MessageData[];
    chatContainerRef: MutableRefObject<HTMLDivElement | null>;
}) {
    return (
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-thin p-4">
            <p className="mb-4">
                My name is Drew and I am a Software Engineer at Deloitte. I implement cloud solutions for commercial and federal clients
                under the Deloitte AI & Engineering Offering. Please use the chat below to learn more about my work experience.
            </p>
            {messages.map((msg) => (
                <Message key={msg.id} {...msg} />
            ))}
        </div>
    );
}

function ChatForm({
    onSubmit,
    canSubmit,
    textareaRef,
    handleKeyDown,
}: {
    onSubmit: (e: FormEvent) => void;
    canSubmit: boolean;
    textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    handleKeyDown: (e: KeyboardEvent) => void;
}) {
    return (
        <form
            id="chat-form"
            className="sticky bottom-0 flex items-end p-3 m-3 bg-main dark:bg-darkmain rounded-lg mt-auto max-h-[64px] min-h-[40px]"
            onSubmit={onSubmit}
        >
            <textarea
                id="prompt-input"
                placeholder="Type your question here..."
                className="flex-1 min-h-[40px] max-h-[120px] scrollbar-thin rounded-lg bg-inherit focus:outline-none resize-none py-2 px-3"
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                inputMode="text"
                name="prompt"
                autoFocus
                rows={1}
            ></textarea>
            <div className="w-[72px] ml-2 flex items-center justify-center">
                {canSubmit ? (
                    <button className="px-3 py-2 font-semibold bg-accent dark:bg-darkaccent rounded-lg" id="form-button" type="submit">
                        Send
                    </button>
                ) : (
                    <div className="w-[52px] h-[38px]"></div>
                )}
            </div>
        </form>
    );
}

function Chat() {
    const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || '/api/v2/ws';
    const [messages, setMessages] = useMessagePersistence([]);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const [canSubmit, setCanSubmit] = useState(true);
    const { addToQueue } = useMessageQueue(setMessages);

    useScrollToBottom(chatContainerRef, [messages]);

    const handleNewData = useCallback(
        (newData: WebsocketData) => {
            const done = addToQueue(newData);
            if (done) {
                setCanSubmit(true);
            }
        },
        [addToQueue, setCanSubmit],
    );

    const ws = useWebSocket(WS_HOST, handleNewData, textareaRef);

    const handleSubmit = useCallback(
        (e: KeyboardEvent | FormEvent) => {
            e.preventDefault();

            if (canSubmit && ws.current && ws.current.readyState === WebSocket.OPEN) {
                setCanSubmit(false);
                const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
                const prompt = promptInput.value;
                if (!prompt.trim().length) {
                    return;
                }

                promptInput!.value = '';
                const id = crypto.randomUUID();
                const newMsg: MessageData = { id, sender: 'human', text: prompt };
                ws.current.send(JSON.stringify([...messages, newMsg]));

                setMessages((msgs) => [...msgs, newMsg]);
            }
        },
        [canSubmit, messages, ws, setCanSubmit, setMessages],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Enter' && e.shiftKey == false) {
                e.preventDefault();
                handleSubmit(e);
            }
        },
        [handleSubmit],
    );

    const handleNewChat = useCallback(() => {
        setMessages([]);
    }, [setMessages]);

    return (
        <div id="content" className="flex flex-col h-full w-[95%] md:w-[80%] lg:w-[60%] mx-auto bg-alt dark:bg-darkalt overflow-hidden">
            <ChatHeader onNewChat={handleNewChat} />
            <MessageList messages={messages} chatContainerRef={chatContainerRef} />
            <ChatForm onSubmit={handleSubmit} canSubmit={canSubmit} textareaRef={textareaRef} handleKeyDown={handleKeyDown} />
        </div>
    );
}

export default React.memo(Chat);
