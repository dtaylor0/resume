export type Message = {
    sender: 'client' | 'server';
    text: string;
};

function ChatMessage(message: Message, index: number) {
    return (
        <div key={index} className={`chat-message chat-item sender-${message.sender}`}>
            <p>{message.text}</p>
        </div>
    );
}

export default ChatMessage;
