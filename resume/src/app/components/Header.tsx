function Header() {
    return (
        <div id="Header" className="text-center">
            <nav className="bg-(--neutral) shadow">
                <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
                    <div className="text-lg font-bold m-2 p-3 bg-(--accent)">
                        Drew Taylor
                    </div>
                    <div className="hidden md:flex space-x-4 desktop-menu">
                        <a
                            href="https://www.linkedin.com/in/drew-taylor-90b188176/"
                            target="_blank"
                            className="hover:text-(--accent)"
                        >
                            LinkedIn
                        </a>
                        <a
                            href="https://github.com/dtaylor0/"
                            target="_blank"
                            className="hover:text-(--accent)"
                        >
                            GitHub
                        </a>
                        <a
                            href="mailto:drewtaylorm@gmail.com"
                            target="_blank"
                            className="hover:text-(--accent)"
                        >
                            Email
                        </a>
                    </div>
                </div>
            </nav>
        </div>
    );
}

export default Header;
