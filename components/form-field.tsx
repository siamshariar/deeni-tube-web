// components/form-field.tsx
// A labelled field of a form (Suggest a feature, Contact support), with what's wrong with it under it.
import type { ReactElement } from "react";
import { cloneElement, useId } from "react";
import { AlertCircle } from "lucide-react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  /** An input or textarea */
  children: ReactElement<{ id?: string; "aria-invalid"?: boolean; "aria-describedby"?: string; className?: string }>;
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": !!error,
        "aria-describedby": error ? `${id}-error` : undefined,
        className: `${children.props.className ?? ""} ${error ? "border-red-600 dark:border-red-400" : ""}`,
      })}
      {error && (
        <p id={`${id}-error`} className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
