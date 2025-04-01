import React, { Dispatch } from 'react';

type HeaderProps = {
    darkMode: boolean;
    toggleDarkMode: Dispatch<React.SetStateAction<boolean>>;
};
function Header({ darkMode, toggleDarkMode }: HeaderProps) {
    return (
        <div id="Header" className="h-full text-center overflow-hidden border-b border-slate-400">
            <nav className="bg-alt dark:bg-darkalt shadow">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="text-xl font-bold my-auto text-accent dark:text-darkaccent">
                        <a href="/">Drew Taylor</a>
                    </div>
                    <div className="md:flex space-x-4 text-base">
                        <a
                            href="https://www.linkedin.com/in/drew-taylor-90b188176/"
                            target="_blank"
                            className="hover:text-accent hover:dark:text-darkaccent"
                        >
                            LinkedIn
                        </a>
                        <a href="https://github.com/dtaylor0/" target="_blank" className="hover:text-accent hover:dark:text-darkaccent">
                            GitHub
                        </a>
                        <button onClick={() => toggleDarkMode(!darkMode)}>
                            <img className="h-5" src={darkMode ? '/images/darkmode.png' : '/images/lightmode.png'} />
                        </button>
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default Header;
