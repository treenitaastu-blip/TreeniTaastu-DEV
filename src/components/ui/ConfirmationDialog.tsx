import React from 'react';
import { AlertTriangle, Trash2, Edit, Save, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'warning' | 'info';
  isLoading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Kinnita',
  cancelText = 'Tühista',
  variant = 'destructive',
  isLoading = false,
  loadingText = 'Kinnitamine...',
  icon,
  className
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    destructive: {
      icon: <Trash2 className="h-6 w-6 text-red-600" />,
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
      iconBg: 'bg-red-100'
    },
    warning: {
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />,
      confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white',
      iconBg: 'bg-orange-100'
    },
    info: {
      icon: <Check className="h-6 w-6 text-blue-600" />,
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
      iconBg: 'bg-blue-100'
    }
  };

  const styles = variantStyles[variant];
  const displayIcon = icon || styles.icon;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={cn(
        'bg-white rounded-lg shadow-xl max-w-md w-full',
        className
      )}>
        <div className="p-6">
          {/* Icon and Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn('p-2 rounded-full', styles.iconBg)}>
              {displayIcon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-gray-600 mb-6">
            {description}
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2',
                styles.confirmButton
              )}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  {loadingText}
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Specialized confirmation dialogs for common actions
export interface DeleteConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemType: string;
  isLoading?: boolean;
  additionalWarning?: string;
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  isLoading = false,
  additionalWarning
}: DeleteConfirmationProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${itemType} kustutamine`}
      description={
        <div>
          <p>Kas oled kindel, et soovid kustutada "{itemName}"?</p>
          {additionalWarning && (
            <p className="mt-2 text-sm text-red-600 font-medium">
              {additionalWarning}
            </p>
          )}
        </div>
      }
      confirmText="Kustuta"
      cancelText="Tühista"
      variant="destructive"
      isLoading={isLoading}
      loadingText="Kustutamine..."
    />
  );
}

export interface SaveConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export function SaveConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading = false,
  hasUnsavedChanges = false
}: SaveConfirmationProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={
        <div>
          <p>{description}</p>
          {hasUnsavedChanges && (
            <p className="mt-2 text-sm text-orange-600 font-medium">
              Sinu muudatused salvestatakse automaatselt.
            </p>
          )}
        </div>
      }
      confirmText="Jah, salvesta"
      cancelText="Tühista"
      variant="info"
      isLoading={isLoading}
      loadingText="Salvestamine..."
    />
  );
}

// Hook for managing confirmation dialogs
export function useConfirmationDialog() {
  const [dialog, setDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    onClose: () => void;
    variant?: 'destructive' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onClose: () => {}
  });

  const showDialog = React.useCallback((config: {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose?: () => void;
    variant?: 'destructive' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
  }) => {
    setDialog({
      isOpen: true,
      onClose: config.onClose || (() => setDialog(prev => ({ ...prev, isOpen: false }))),
      ...config
    });
  }, []);

  const hideDialog = React.useCallback(() => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showDeleteConfirmation = React.useCallback((config: {
    itemName: string;
    itemType: string;
    onConfirm: () => void;
    onClose?: () => void;
    additionalWarning?: string;
    isLoading?: boolean;
  }) => {
    showDialog({
      title: `${config.itemType} kustutamine`,
      description: `Kas oled kindel, et soovid kustutada "${config.itemName}"?`,
      onConfirm: config.onConfirm,
      onClose: config.onClose,
      variant: 'destructive',
      confirmText: 'Kustuta',
      cancelText: 'Tühista',
      isLoading: config.isLoading,
      loadingText: 'Kustutamine...',
      icon: <Trash2 className="h-6 w-6" />
    });
  }, [showDialog]);

  const showSaveConfirmation = React.useCallback((config: {
    title: string;
    description: string;
    onConfirm: () => void;
    onClose?: () => void;
    hasUnsavedChanges?: boolean;
    isLoading?: boolean;
  }) => {
    showDialog({
      title: config.title,
      description: config.description,
      onConfirm: config.onConfirm,
      onClose: config.onClose,
      variant: 'info',
      confirmText: 'Jah, salvesta',
      cancelText: 'Tühista',
      isLoading: config.isLoading,
      loadingText: 'Salvestamine...',
      icon: <Save className="h-6 w-6" />
    });
  }, [showDialog]);

  return {
    dialog,
    showDialog,
    hideDialog,
    showDeleteConfirmation,
    showSaveConfirmation
  };
}
