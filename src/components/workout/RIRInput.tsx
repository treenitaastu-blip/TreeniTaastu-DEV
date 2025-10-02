import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RIRInputProps {
  value?: number | null;
  onChange?: (rir: number) => void;
  disabled?: boolean;
  className?: string;
}

const RIR_SCALE = [
  { value: 0, label: "Failure", description: "Could not do another rep" },
  { value: 1, label: "1 RIR", description: "Could do 1 more rep" },
  { value: 2, label: "2 RIR", description: "Could do 2 more reps" },
  { value: 3, label: "3 RIR", description: "Could do 3 more reps" },
  { value: 4, label: "4 RIR", description: "Could do 4 more reps" },
  { value: 5, label: "5+ RIR", description: "Could do 5+ more reps" },
];

export const RIRInput = ({ value, onChange, disabled = false, className }: RIRInputProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">RIR (Reps in Reserve)</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {RIR_SCALE.map((item) => (
          <Button
            key={item.value}
            variant={value === item.value ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange?.(item.value)}
            className="h-auto p-2 flex flex-col items-center"
            title={item.description}
          >
            <span className="text-xs font-medium">{item.value}</span>
            <span className="text-xs opacity-70">{item.label}</span>
          </Button>
        ))}
      </div>
      
      {value !== null && value !== undefined && (
        <Badge variant="outline" className="text-xs">
          {RIR_SCALE.find(r => r.value === value)?.description}
        </Badge>
      )}
    </div>
  );
};