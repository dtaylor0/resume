import { useEffect } from 'react';

export function useChatSocket({ host, port }: { host: string; port: number }) {
    useEffect(() => {
        const socketUrl = `${host}:${port}`;
        const ws = new WebSocket(socketUrl);
        return () => ws.close();
    }, [host, port]);
}
