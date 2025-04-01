'use client';
import Header from './Header';
import Chat from './Chat';
import React from 'react';
import { useDarkMode } from './DarkMode';

function App() {
    const [darkMode, toggleDarkMode] = useDarkMode();
    return (
        <div className={`flex flex-col h-full bg-main dark:bg-darkmain text-fg dark:text-darkfg text-base${darkMode ? ' dark' : ''}`}>
            <div className="flex-shrink-0">
                <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            </div>
            <div className="flex-1 overflow-hidden">
                <Chat />
            </div>
        </div>
    );
}

export default App;
