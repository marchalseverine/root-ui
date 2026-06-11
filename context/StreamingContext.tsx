'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface StreamingContextValue {
  streamingActive: boolean;
  setStreamingActive: (active: boolean) => void;
}

const StreamingContext = createContext<StreamingContextValue>({
  streamingActive: false,
  setStreamingActive: () => {},
});

/**
 * Stub global streaming state. Wired to real SSE generation in later tasks;
 * for now it lets the LanguageToggle disable itself during active streaming.
 */
export function StreamingProvider({ children }: { children: React.ReactNode }) {
  const [streamingActive, setStreamingActive] = useState(false);
  const value = useMemo(
    () => ({ streamingActive, setStreamingActive }),
    [streamingActive]
  );
  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useStreaming() {
  return useContext(StreamingContext);
}
