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
    const LOCAL_STORAGE_KEY = 'chat-history';
    
    // Load messages from localStorage
    useEffect(() => {
        try {
            const storedMsgs = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (storedMsgs) {
                const parsedMessages = JSON.parse(storedMsgs);
                if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                    setMessages(parsedMessages);
                }
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
            // If parsing fails, clear localStorage
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    }, []);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(messages));
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

function ChatHeader({ onNewChat, messageCount = 0 }: { onNewChat: () => void; messageCount?: number }) {
    return (
        <div className="flex justify-between items-center p-3 md:p-4 border-b border-slate-300">
            <div className="flex flex-col">
                <h2 className="md:text-xl font-bold text-left">About Me</h2>
                {messageCount > 0 && (
                    <p className="text-xs text-gray-500">{messageCount} message{messageCount !== 1 ? 's' : ''} in conversation</p>
                )}
            </div>
            <button
                className="px-2 py-1 font-semibold bg-background border-2 border-accent rounded-lg hover:bg-accent hover:text-white transition-colors"
                onClick={() => {
                    if (confirm('Are you sure you want to erase the current chat history?')) {
                        onNewChat();
                    }
                }}
                aria-label="Start a new chat"
                title="Erase current chat history and start a new conversation"
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
            {messages.map((msg) => <Message key={msg.id} {...msg} />)}
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
            className="sticky bottom-0 flex items-end p-3 bg-background border-t border-slate-300 mt-auto max-h-[64px] min-h-[40px]"
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
                    <button
                        className="px-3 py-2 font-semibold bg-altbackground border-2 border-accent rounded-lg"
                        id="form-button"
                        type="submit"
                    >
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
    const [isConnected, setIsConnected] = useState(false);
    const { addToQueue } = useMessageQueue(setMessages);
    const MAX_HISTORY_LENGTH = 20; // Limit history to prevent context overflow

    useScrollToBottom(chatContainerRef, [messages]);

    // Handle new data from WebSocket
    const handleNewData = useCallback(
        (newData: WebsocketData) => {
            const done = addToQueue(newData);
            if (done) {
                setCanSubmit(true);
            }
        },
        [addToQueue, setCanSubmit],
    );

    // Configure WebSocket with connection status tracking
    const ws = useRef<WebSocket | null>(null);
    
    useEffect(() => {
        ws.current = new WebSocket(WS_HOST);
        
        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
        };
        
        ws.current.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
        };
        
        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            setIsConnected(false);
        };
        
        ws.current.onmessage = (event) => {
            const json: WebsocketData = JSON.parse(event.data);
            handleNewData(json);
            if (textareaRef.current) {
                textareaRef.current.focus();
            }
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [WS_HOST, handleNewData]);

    // Handle chat form submission
    const handleSubmit = useCallback(
        (e: KeyboardEvent | FormEvent) => {
            e.preventDefault();

            if (canSubmit && ws.current && ws.current.readyState === WebSocket.OPEN) {
                setCanSubmit(false);
                const promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
                const prompt = promptInput.value?.trim();
                if (!prompt || prompt.length === 0) {
                    setCanSubmit(true);
                    return;
                }

                promptInput.value = '';
                const id = crypto.randomUUID();
                const newMsg: MessageData = { id, sender: 'human', text: prompt };
                
                // Limit history sent to backend to prevent context overflow
                const historyToSend = [...messages, newMsg].slice(-MAX_HISTORY_LENGTH);
                ws.current.send(JSON.stringify(historyToSend));

                setMessages((msgs) => [...msgs, newMsg]);
            } else if (!isConnected) {
                alert('Connection to server is offline. Please refresh the page and try again.');
            }
        },
        [canSubmit, messages, isConnected, setMessages],
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
        <div
            id="content"
            className="flex flex-col h-full w-[95%] md:w-[80%] lg:w-[60%] mx-auto bg-altbackground border-x border-slate-400 overflow-hidden"
        >
            <ChatHeader onNewChat={handleNewChat} messageCount={messages.length} />
            <MessageList messages={messages} chatContainerRef={chatContainerRef} />
            <ChatForm 
                onSubmit={handleSubmit} 
                canSubmit={canSubmit && isConnected} 
                textareaRef={textareaRef} 
                handleKeyDown={handleKeyDown}
            />
            {!isConnected && (
                <div className="text-center text-sm text-red-500 p-1 bg-red-100 border-t border-red-300">
                    Connection lost. Please refresh the page.
                </div>
            )}
        </div>
    );
}

export default React.memo(Chat);
