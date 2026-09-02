"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor | null;
  isSaving?: boolean;
}

const ToolbarButton = ({
  onClick,
  isActive = false,
  disabled = false,
  icon: Icon,
  tooltip,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  icon: React.ElementType;
  tooltip: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-slate-600 hover:text-slate-900",
            isActive && "bg-[#022d5c] text-[#F8F5EE] hover:bg-[#022d5c] hover:text-[#F8F5EE]"
          )}
          onClick={onClick}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export function Toolbar({ editor, isSaving }: ToolbarProps) {
  if (!editor) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-[#F8F5EE] px-4 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={Bold}
          tooltip="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={Italic}
          tooltip="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          icon={Underline}
          tooltip="Underline"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          icon={Strikethrough}
          tooltip="Strikethrough"
        />

        <Separator orientation="vertical" className="mx-1 h-6 bg-slate-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          icon={Heading1}
          tooltip="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          icon={Heading2}
          tooltip="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          icon={Heading3}
          tooltip="Heading 3"
        />

        <Separator orientation="vertical" className="mx-1 h-6 bg-slate-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={List}
          tooltip="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={ListOrdered}
          tooltip="Ordered List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          icon={CheckSquare}
          tooltip="Task List"
        />

        <Separator orientation="vertical" className="mx-1 h-6 bg-slate-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          icon={Quote}
          tooltip="Blockquote"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive("highlight")}
          icon={Highlighter}
          tooltip="Highlight"
        />

        <Separator orientation="vertical" className="mx-1 h-6 bg-slate-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
          icon={AlignLeft}
          tooltip="Align Left"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
          icon={AlignCenter}
          tooltip="Align Center"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
          icon={AlignRight}
          tooltip="Align Right"
        />

        <Separator orientation="vertical" className="mx-1 h-6 bg-slate-300" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={Undo}
          tooltip="Undo"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={Redo}
          tooltip="Redo"
        />
      </div>

      <div className="text-xs text-slate-500">
        {isSaving ? "Saving..." : "Saved"}
      </div>
    </div>
  );
}
