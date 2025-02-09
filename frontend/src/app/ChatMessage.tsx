import { Message } from './Chat';

function ChatMessage(message: Message, index: number) {
    const color = message.sender === 'client' ? 'bg-accent' : 'bg-background';
    const align = message.sender === 'client' ? 'ml-auto' : 'mr-auto';
    return (
        <div key={index} className={`my-1 md:my-4 w-3/4 p-2 md:p-4 text-sm rounded-xl ${color} ${align}`}>
            <p className="whitespace-pre-wrap break-words"> {message.text}</p>
        </div>
    );
}

export default ChatMessage;
