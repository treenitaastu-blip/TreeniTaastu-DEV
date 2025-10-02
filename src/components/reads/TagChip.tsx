import { Badge } from "@/components/ui/badge";
import { ReadCategory } from "@/types/reads";

interface TagChipProps {
  category: ReadCategory;
  isActive?: boolean;
  onClick?: () => void;
}

const getCategoryColor = (category: ReadCategory): string => {
  const colors: Record<ReadCategory, string> = {
    'Toitumine': 'bg-green-500/10 text-green-700 hover:bg-green-500/20',
    'Liikumine': 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20',
    'Magamine': 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20',
    'Stress': 'bg-red-500/10 text-red-700 hover:bg-red-500/20',
    'Tööergonoomika': 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20',
    'Kaelavalu': 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20',
    'Seljavalu': 'bg-pink-500/10 text-pink-700 hover:bg-pink-500/20',
    'Lihasmassi vähenemine': 'bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20'
  };
  return colors[category];
};

export function TagChip({ category, isActive = false, onClick }: TagChipProps) {
  const baseColor = getCategoryColor(category);
  const activeColor = isActive ? 'bg-primary text-primary-foreground' : baseColor;
  
  return (
    <Badge 
      variant="secondary" 
      className={`cursor-pointer transition-colors ${activeColor}`}
      onClick={onClick}
    >
      {category}
    </Badge>
  );
}