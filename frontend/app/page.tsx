'use client';
import Header from './Header';
import Chat from './Chat';
import React from 'react';

function App() {
    return (
        <div className="flex flex-col h-[100dvh] text-base">
            <div id="header-flex" className="flex-shrink-0">
                <Header />
            </div>
            <div id="chat-flex" className="flex-1 overflow-hidden">
                <Chat />
            </div>
        </div>
    );
}

export default App;
