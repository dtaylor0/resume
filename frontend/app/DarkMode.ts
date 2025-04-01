import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function useDarkMode(): [boolean, Dispatch<SetStateAction<boolean>>] {
    const [darkMode, setDarkMode] = useState(true);
    useEffect(() => {
        const darkModeSetting = window.localStorage.getItem('colorMode');
        if (typeof darkModeSetting === 'string') {
            setDarkMode(darkModeSetting === 'dark');
        }
    }, []);

    useEffect(() => {
        let colorMode = 'light';
        if (darkMode) {
            colorMode = 'dark';
        }
        window.localStorage.setItem('colorMode', colorMode);
    }, [darkMode]);

    return [darkMode, setDarkMode];
}
