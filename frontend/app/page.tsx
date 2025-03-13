'use client';
import Header from './Header';
import Chat from './Chat';
import React from 'react';

function App() {
    return (
        <div className={`h-svh flex flex-col text-base`}>
            <div id="header-flex" className="flex-3">
                <Header />
            </div>
            <div id="chat-flex" className="flex-1">
                <Chat />
            </div>
        </div>
    );
}

export default App;
