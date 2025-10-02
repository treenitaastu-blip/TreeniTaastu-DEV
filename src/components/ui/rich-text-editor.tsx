import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Bold, 
  Heading1, 
  Heading2, 
  Heading3, 
  Minus,
  List,
  ListOrdered
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder,
  className,
  required 
}: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const insertMarkdown = (before: string, after: string = "", placeholder: string = "tekst") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const replacement = selectedText || placeholder;
    const newText = value.substring(0, start) + before + replacement + after + value.substring(end);
    
    onChange(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newStart = start + before.length;
      const newEnd = newStart + replacement.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const newText = value.substring(0, start) + text + value.substring(start);
    
    onChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const formatButtons = [
    {
      icon: Bold,
      label: "Paks kiri",
      action: () => insertMarkdown("**", "**", "paks tekst")
    },
    {
      icon: Heading1,
      label: "Pealkiri 1",
      action: () => insertMarkdown("# ", "", "Suur pealkiri")
    },
    {
      icon: Heading2,
      label: "Pealkiri 2", 
      action: () => insertMarkdown("## ", "", "Keskmine pealkiri")
    },
    {
      icon: Heading3,
      label: "Pealkiri 3",
      action: () => insertMarkdown("### ", "", "Väike pealkiri")
    },
    {
      icon: List,
      label: "Täppide loend",
      action: () => insertAtCursor("- Loendi punkt\n")
    },
    {
      icon: ListOrdered,
      label: "Nummerdatud loend",
      action: () => insertAtCursor("1. Esimene punkt\n")
    },
    {
      icon: Minus,
      label: "Eraldaja joon",
      action: () => insertAtCursor("\n---\n\n")
    }
  ];

  const renderPreview = (text: string) => {
    // Simple markdown-like rendering for preview
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^---$/gm, '<hr class="my-4 border-border">')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border border-border rounded-md bg-muted/30">
        {formatButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={button.action}
            className="h-8 w-8 p-0"
            title={button.label}
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
        
        <div className="ml-auto flex gap-1">
          <Button
            type="button"
            variant={!isPreviewMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsPreviewMode(false)}
            className="text-xs"
          >
            Kirjuta
          </Button>
          <Button
            type="button"
            variant={isPreviewMode ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsPreviewMode(true)}
            className="text-xs"
          >
            Eelvaade
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      {isPreviewMode ? (
        <div 
          className="min-h-[300px] p-4 border border-border rounded-md bg-background prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
        />
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[300px] font-mono text-sm"
          required={required}
        />
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p><strong>Kiirklahvid:</strong> Vali tekst ja klõpsa nuppu vormindamiseks</p>
        <p><strong>Markdown:</strong> **paks**, # Pealkiri 1, ## Pealkiri 2, - loend</p>
      </div>
    </div>
  );
};