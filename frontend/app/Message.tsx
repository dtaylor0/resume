import { MessageData } from './Chat';

function Message(message: MessageData, index: number) {
    const color = message.sender === 'client' ? 'bg-accent' : 'bg-inherit';
    const align = message.sender === 'client' ? 'ml-auto' : 'mr-auto';
    return (
        <div key={index} className={`my-1 md:my-4 w-3/4 p-2 md:p-4 rounded-xl ${color} ${align}`}>
            <p className="whitespace-pre-wrap break-words"> {message.text}</p>
        </div>
    );
}

export default Message;
