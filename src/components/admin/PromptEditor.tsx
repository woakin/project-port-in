import { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RotateCcw, Save, X, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PromptEditorProps {
  mode: 'diagnosis' | 'strategic' | 'follow_up' | 'document';
  value: string;
  defaultValue: string;
  lastUpdated: string | null;
  isExplicitlySaved: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onRestore: () => void;
  onCancel: () => void;
  onViewDefault: () => void;
  hasChanges: boolean;
  isSaving: boolean;
}

const AVAILABLE_VARIABLES = [
  '{{COMPANY_NAME}}',
  '{{COMPANY_INDUSTRY}}',
  '{{COMPANY_SIZE}}',
  '{{PROJECT_NAME}}',
  '{{PROJECT_DESCRIPTION}}'
];

export function PromptEditor({
  mode,
  value,
  defaultValue,
  lastUpdated,
  isExplicitlySaved,
  onChange,
  onSave,
  onRestore,
  onCancel,
  onViewDefault,
  hasChanges,
  isSaving
}: PromptEditorProps) {
  const [showVariables, setShowVariables] = useState(false);
  const charCount = value.length;
  const isOverLimit = charCount > 4000;

  return (
    <div className="space-y-4">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {isExplicitlySaved ? (
                  value === defaultValue ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                      ✓ Guardado (Default)
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                      ✓ Personalizado
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Usando Default
                  </Badge>
                )}
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  {isExplicitlySaved 
                    ? value === defaultValue
                      ? "Este prompt fue guardado explícitamente en el sistema y coincide con el default"
                      : "Este prompt fue guardado explícitamente con contenido personalizado"
                    : "Usando el prompt por defecto del sistema (no guardado en DB)"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              Última edición: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDefault}
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Prompt por Defecto
        </Button>
      </div>

      {/* Alert informativo */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Este prompt controla cómo el agente de IA interactúa con los usuarios en modo <strong>{mode}</strong>.
          Usa las variables disponibles para personalizar el contexto.
        </AlertDescription>
      </Alert>

      {/* Variables disponibles */}
      <div className="space-y-2">
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="text-sm font-medium text-primary hover:underline"
        >
          {showVariables ? '▼' : '▶'} Variables disponibles
        </button>
        {showVariables && (
          <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
            {AVAILABLE_VARIABLES.map((variable) => (
              <TooltipProvider key={variable}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const newValue = value.substring(0, start) + variable + value.substring(end);
                          onChange(newValue);
                        }
                      }}
                    >
                      {variable}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click para insertar</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </div>

      {/* Editor de texto */}
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe el prompt del sistema aquí..."
          className="min-h-[400px] font-mono text-sm"
        />
        <div className="flex items-center justify-between text-sm">
          <span className={isOverLimit ? 'text-destructive' : 'text-muted-foreground'}>
            {charCount} caracteres {isOverLimit && '(⚠️ Límite recomendado: 4000)'}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="text-orange-500 border-orange-500">
              Cambios sin guardar
            </Badge>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onRestore}
          disabled={!isExplicitlySaved || isSaving}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar Default
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={!hasChanges || isSaving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={!hasChanges || isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}