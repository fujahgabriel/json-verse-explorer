
import React, { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JsonViewerProps {
  json: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ json }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // For large JSON, we'll use incremental rendering to avoid blocking the main thread
      if (json.length > 100000) {
        const chunks = Math.ceil(json.length / 50000);
        let currentChunk = 0;
        
        const renderChunk = () => {
          if (currentChunk >= chunks || !codeRef.current) return;
          
          const start = currentChunk * 50000;
          const end = Math.min((currentChunk + 1) * 50000, json.length);
          const chunk = json.substring(start, end);
          
          const highlightedChunk = highlightJson(chunk);
          
          if (currentChunk === 0) {
            codeRef.current.innerHTML = highlightedChunk;
          } else {
            codeRef.current.innerHTML += highlightedChunk;
          }
          
          currentChunk++;
          
          // Schedule next chunk with a small delay to allow UI updates
          setTimeout(renderChunk, 0);
        };
        
        renderChunk();
      } else {
        codeRef.current.innerHTML = highlightJson(json);
      }
    }
  }, [json]);

  if (!json) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground p-4">
        Enter valid JSON to see the formatted output
      </div>
    );
  }

  // Function to syntax highlight the JSON
  const highlightJson = (jsonString: string) => {
    // Replace JSON syntax with highlighted spans
    let highlighted = jsonString
      // Replace keys
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      // Replace string values
      .replace(/: ?"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      // Replace numbers
      .replace(/: ?([0-9]+\.?[0-9]*)/g, ': <span class="json-number">$1</span>')
      // Replace booleans
      .replace(/: ?(true|false)/g, ': <span class="json-boolean">$1</span>')
      // Replace null
      .replace(/: ?null/g, ': <span class="json-null">null</span>');

    return highlighted;
  };

  return (
    <ScrollArea className="w-full h-full">
      <pre className="json-viewer w-full h-full p-4 overflow-hidden whitespace-pre text-sm">
        <code ref={codeRef} />
      </pre>
    </ScrollArea>
  );
};
