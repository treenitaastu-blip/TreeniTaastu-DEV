import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Sisesta tekst...", 
  className = "",
  disabled = false 
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertText = (text: string) => {
    document.execCommand('insertText', false, text);
    editorRef.current?.focus();
    handleInput();
  };

  const formatButtons = [
    { command: 'bold', icon: Bold, label: 'Bold' },
    { command: 'italic', icon: Italic, label: 'Italic' },
    { command: 'underline', icon: Underline, label: 'Underline' },
  ];

  const listButtons = [
    { command: 'insertUnorderedList', icon: List, label: 'Bullet List' },
    { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered List' },
  ];

  const alignmentButtons = [
    { command: 'justifyLeft', icon: AlignLeft, label: 'Align Left' },
    { command: 'justifyCenter', icon: AlignCenter, label: 'Align Center' },
    { command: 'justifyRight', icon: AlignRight, label: 'Align Right' },
  ];

  return (
    <Card className={`border-2 transition-colors ${isFocused ? 'border-primary' : 'border-border'} ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        {/* Format buttons */}
        <div className="flex gap-1">
          {formatButtons.map(({ command, icon: Icon, label }) => (
            <Button
              key={command}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand(command)}
              title={label}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* List buttons */}
        <div className="flex gap-1">
          {listButtons.map(({ command, icon: Icon, label }) => (
            <Button
              key={command}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand(command)}
              title={label}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Alignment buttons */}
        <div className="flex gap-1">
          {alignmentButtons.map(({ command, icon: Icon, label }) => (
            <Button
              key={command}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => execCommand(command)}
              title={label}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Quote button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', 'blockquote')}
          title="Quote"
          disabled={disabled}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Undo/Redo */}
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('undo')}
            title="Undo"
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand('redo')}
            title="Redo"
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <CardContent className="p-0">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="min-h-[200px] p-4 focus:outline-none"
          style={{ whiteSpace: 'pre-wrap' }}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
      </CardContent>
    </Card>
  );
}
