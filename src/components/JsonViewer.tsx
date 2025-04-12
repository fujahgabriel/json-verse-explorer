
import React from "react";

interface JsonViewerProps {
  json: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ json }) => {
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
    <pre className="json-viewer w-full h-full p-4 overflow-auto whitespace-pre text-sm">
      <code dangerouslySetInnerHTML={{ __html: highlightJson(json) }} />
    </pre>
  );
};
