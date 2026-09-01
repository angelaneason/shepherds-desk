"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Sparkles, BookOpen, BookMarked, X } from "lucide-react";
import { Toolbar } from "./Toolbar";
import { AIPanel } from "./AIPanel";
import { BibleLookup } from "./BibleLookup";
import { StudyPanel } from "./StudyPanel";
import { Button } from "@/components/ui/button";

interface SermonEditorProps {
  content?: any;
  onChange?: (content: any) => void;
  readOnly?: boolean;
  isSaving?: boolean;
}

export function SermonEditor({ content, onChange, readOnly = false, isSaving = false }: SermonEditorProps) {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isBibleOpen, setIsBibleOpen] = useState(false);
  const [isStudyPanelOpen, setIsStudyPanelOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing your sermon...",
      }),
      Highlight,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: content || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[500px]",
      },
    },
  });

  const getSermonText = () => editor?.getText() || "";
  
  const getSelectedText = () => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  };

  const handleInsertHTML = (html: string) => {
    if (editor) {
      editor.chain().focus().insertContent(html).run();
    }
  };

  return (
    <div className="relative flex overflow-hidden w-full h-full">
      <div className="flex flex-col border rounded-md overflow-hidden bg-white flex-1 transition-all duration-300">
        {!readOnly && (
          <div className="flex items-center justify-between border-b px-2 bg-gray-50/50">
            <div className="flex-1 overflow-x-auto">
              <Toolbar editor={editor} isSaving={isSaving} />
            </div>
            
            <div className="flex items-center gap-2 pr-2 border-l pl-2">
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 text-[#082C50] hover:text-[#082C50] border-[#082C50]/20 hover:bg-[#082C50]/5"
                onClick={() => { setIsBibleOpen(!isBibleOpen); setIsAIPanelOpen(false); setIsStudyPanelOpen(false); }}
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Bible</span>
              </Button>

              <Button 
                variant="outline"
                size="sm"
                className="gap-2 text-[#082C50] hover:text-[#082C50] border-[#082C50]/20 hover:bg-[#082C50]/5"
                onClick={() => { setIsStudyPanelOpen(!isStudyPanelOpen); setIsAIPanelOpen(false); setIsBibleOpen(false); }}
              >
                <BookMarked className="h-4 w-4" />
                <span className="hidden sm:inline">Study</span>
              </Button>

              <Button 
                variant="outline"
                size="sm" 
                className="gap-2 bg-[#F8F5EE] text-[#082C50] border-[#D0A348]/50 hover:bg-[#D0A348]/20"
                onClick={() => { setIsAIPanelOpen(!isAIPanelOpen); setIsBibleOpen(false); setIsStudyPanelOpen(false); }}
              >
                <Sparkles className="h-4 w-4 text-[#D0A348]" />
                <span className="hidden sm:inline">AI Assistant</span>
              </Button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          <div className="mx-auto max-w-[720px] font-serif">
            <EditorContent editor={editor} />
          </div>
        </div>
        <style jsx global>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
          }
          .ProseMirror ul[data-type="taskList"] {
            list-style: none;
            padding: 0;
          }
          .ProseMirror ul[data-type="taskList"] li {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
          }
        `}</style>
      </div>

      <AIPanel 
        isOpen={isAIPanelOpen}
        onClose={() => setIsAIPanelOpen(false)}
        sermonContent={getSermonText()}
        selectedText={getSelectedText()}
        onInsertText={handleInsertHTML}
      />

      {isBibleOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white border-l border-[#D0A348]/30 shadow-2xl flex flex-col z-50">
          <div className="p-4 border-b border-[#D0A348]/20 bg-[#082C50] text-white flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#D0A348]" />
              Bible Lookup
            </h2>
            <button onClick={() => setIsBibleOpen(false)} className="text-gray-300 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BibleLookup 
              onInsert={(html) => {
                handleInsertHTML(html);
                setIsBibleOpen(false);
              }} 
            />
          </div>
        </div>
      )}
      <StudyPanel
        isOpen={isStudyPanelOpen}
        onClose={() => setIsStudyPanelOpen(false)}
        onInsertText={handleInsertHTML}
      />
    </div>
  );
}
