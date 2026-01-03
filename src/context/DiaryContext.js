import { createContext, useContext } from 'react';

// Create context for shared state
export const DiaryContext = createContext();

export const useDiary = () => useContext(DiaryContext);
