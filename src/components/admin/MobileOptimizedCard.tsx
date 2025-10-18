import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Edit, Trash2, UserPlus, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface MobileOptimizedCardProps {
  title: string;
  subtitle?: string;
  status?: 'active' | 'inactive' | 'pending';
  metadata?: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
  }>;
  actions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline';
  }>;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onAssign?: () => void;
  className?: string;
}

export function MobileOptimizedCard({
  title,
  subtitle,
  status,
  metadata = [],
  actions = [],
  onEdit,
  onDelete,
  onView,
  onAssign,
  className
}: MobileOptimizedCardProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Aktiivne
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
            Mitteaktiivne
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            Ootel
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm lg:text-base truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {getStatusBadge(status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onView && (
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    Vaata
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Muuda
                  </DropdownMenuItem>
                )}
                {onAssign && (
                  <DropdownMenuItem onClick={onAssign}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Määra
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Kustuta
                  </DropdownMenuItem>
                )}
                {actions.map((action, index) => (
                  <DropdownMenuItem key={index} onClick={action.onClick}>
                    {action.icon}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata */}
        {metadata.length > 0 && (
          <div className="space-y-2 mb-3">
            {metadata.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.icon}
                <span className="truncate">{item.label}: {item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Actions */}
        <div className="flex gap-2 flex-wrap">
          {onView && (
            <Button
              size="sm"
              variant="outline"
              onClick={onView}
              className="flex-1 min-w-0 text-xs"
            >
              <Eye className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Vaata</span>
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="flex-1 min-w-0 text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Muuda</span>
            </Button>
          )}
          {onAssign && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAssign}
              className="flex-1 min-w-0 text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Määra</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Mobile-optimized stats card
export interface MobileStatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function MobileStatsCard({
  title,
  value,
  icon,
  trend,
  className
}: MobileStatsCardProps) {
  return (
    <Card className={`border-0 shadow-soft ${className}`}>
      <CardContent className="p-3 lg:p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon}
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {title}
            </p>
          </div>
          {trend && (
            <div className={`text-xs font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </div>
          )}
        </div>
        <p className="text-lg sm:text-xl lg:text-2xl font-bold">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// Mobile-optimized filter bar
export interface MobileFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  totalItems: number;
  filteredItems: number;
  className?: string;
}

export function MobileFilterBar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterChange,
  totalItems,
  filteredItems,
  className
}: MobileFilterBarProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Otsi..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Kõik' },
          { value: 'active', label: 'Aktiivsed' },
          { value: 'inactive', label: 'Mitteaktiivsed' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`px-3 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              filterStatus === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {filteredItems} / {totalItems} tulemust
      </div>
    </div>
  );
}
