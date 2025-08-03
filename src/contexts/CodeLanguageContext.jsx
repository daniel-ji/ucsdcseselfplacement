import { createContext, useState, useContext, useEffect } from 'react';

const CodeLanguageContext = createContext();

export const CodeLanguageProvider = ({ children }) => {
  const localStorageKey = 'preferredCodeLanguage';

  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem(localStorageKey) || 'python';
  });

  useEffect(() => {
    localStorage.setItem(localStorageKey, selectedLang);
  }, [selectedLang]);

  return (
    <CodeLanguageContext.Provider value={{ selectedLang, setSelectedLang }}>
      {children}
    </CodeLanguageContext.Provider>
  );
};

export const useCodeLanguage = () => useContext(CodeLanguageContext);