import { Button } from "@/components/ui/button";

type TextSize = 'M' | 'L' | 'XL';

interface TextSizeToggleProps {
  currentSize: TextSize;
  onSizeChange: (size: TextSize) => void;
}

const sizes: TextSize[] = ['M', 'L', 'XL'];

export function TextSizeToggle({ currentSize, onSizeChange }: TextSizeToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
      {sizes.map((size) => (
        <Button
          key={size}
          variant={currentSize === size ? "default" : "ghost"}
          size="sm"
          className="h-8 w-8 p-0 text-xs touch-manipulation"
          onClick={() => onSizeChange(size)}
          aria-label={`Teksti suurus ${size}`}
        >
          {size}
        </Button>
      ))}
    </div>
  );
}

export function getTextSizeClass(size: TextSize): string {
  switch (size) {
    case 'M':
      return 'text-base leading-relaxed';
    case 'L':
      return 'text-lg leading-relaxed';
    case 'XL':
      return 'text-xl leading-loose';
    default:
      return 'text-base leading-relaxed';
  }
}