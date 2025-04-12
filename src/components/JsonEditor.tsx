
import { useRef, useEffect } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export const JsonEditor = ({ value, onChange }: JsonEditorProps) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === "Tab" && editorRef.current === document.activeElement) {
        e.preventDefault();
        
        const start = editorRef.current.selectionStart;
        const end = editorRef.current.selectionEnd;
        
        // Insert 2 spaces at cursor position
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);
        
        // Set cursor position after the inserted spaces
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = start + 2;
            editorRef.current.selectionEnd = start + 2;
          }
        }, 0);
      }
    };

    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener("keydown", handleTab);
    }

    return () => {
      if (editor) {
        editor.removeEventListener("keydown", handleTab);
      }
    };
  }, [value, onChange]);

  return (
    <textarea
      ref={editorRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-full min-h-[400px] p-4 font-mono text-sm resize-none focus:outline-none"
      spellCheck={false}
      placeholder="Paste your JSON here..."
    />
  );
};
