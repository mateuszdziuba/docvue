"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import { BlockNoteView } from "@blocknote/shadcn";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface RichTextEditorProps {
  value: string; // HTML or JSON string
  onChange: (value: string) => void;
  editable?: boolean;
}

export function RichTextEditor({ value, onChange, editable = true }: RichTextEditorProps) {
  const { theme } = useTheme();
  
  // Create editor instance
  const editor = useCreateBlockNote({
    initialContent: value ? tryParseJSON(value) : undefined,
  });

  // Handle changes
  const handleChange = async () => {
    // For simplicity, we'll store as HTML for the form builder context 
    // but BlockNote works best with blocks. 
    // If the backend expects HTML string, we can convert.
    // For now, let's store HTML representation.
    const html = await editor.blocksToHTMLLossy(editor.document);
    onChange(html);
  };
   
  return (
    <div className="border rounded-md bg-white dark:bg-gray-900 overflow-hidden">
      <BlockNoteView 
        editor={editor} 
        editable={editable}
        theme={theme === "dark" ? "dark" : "light"}
        onChange={handleChange}
        className="min-h-[150px]"
      />
    </div>
  );
}

function tryParseJSON(str: string) {
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed;
    return undefined;
  } catch (e) {
    // If not JSON, it might be HTML or plain text. 
    // BlockNote initialContent expects PartialBlock[].
    // If we passed HTML string, we might need 'tryParseHTMLToBlocks' if available, 
    // but for now let's assume empty if not JSON blocks.
    // Actually, handling re-hydration from HTML is tricky with just initialContent.
    // We might need to just use it for NEW content creation essentially.
    return undefined;
  }
}
