"use client";

import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

type FormFieldContextValue = {
  id: string;
  name: string;
  describedBy?: string;
  errorId?: string;
  invalid: boolean;
  required: boolean;
};

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  name,
  error,
  required,
  hint,
  children,
  className,
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <label htmlFor={name} className="block text-sm text-cream-dim">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      <FormFieldContext.Provider
        value={{
          id: name,
          name,
          describedBy,
          errorId: error ? errorId : undefined,
          invalid: Boolean(error),
          required: Boolean(required),
        }}
      >
        {children}
      </FormFieldContext.Provider>
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function TextInput({ error, className, ...props }: TextInputProps) {
  const field = useContext(FormFieldContext);
  const describedBy = [props["aria-describedby"], field?.describedBy]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <input
      {...props}
      className={cn(error && "error", className)}
      id={props.id ?? field?.id}
      name={props.name ?? field?.name}
      aria-describedby={describedBy}
      aria-errormessage={props["aria-errormessage"] ?? field?.errorId}
      aria-invalid={props["aria-invalid"] ?? error ?? field?.invalid}
      aria-required={props["aria-required"] ?? field?.required}
    />
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function TextArea({ error, className, ...props }: TextAreaProps) {
  const field = useContext(FormFieldContext);
  const describedBy = [props["aria-describedby"], field?.describedBy]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <textarea
      {...props}
      className={cn("min-h-[120px] resize-y", error && "error", className)}
      id={props.id ?? field?.id}
      name={props.name ?? field?.name}
      aria-describedby={describedBy}
      aria-errormessage={props["aria-errormessage"] ?? field?.errorId}
      aria-invalid={props["aria-invalid"] ?? error ?? field?.invalid}
      aria-required={props["aria-required"] ?? field?.required}
    />
  );
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  placeholder?: string;
  options: string[];
}

export function SelectInput({
  error,
  placeholder,
  options,
  className,
  ...props
}: SelectInputProps) {
  const field = useContext(FormFieldContext);
  const describedBy = [props["aria-describedby"], field?.describedBy]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <select
      {...props}
      className={cn(error && "error", className)}
      id={props.id ?? field?.id}
      name={props.name ?? field?.name}
      aria-describedby={describedBy}
      aria-errormessage={props["aria-errormessage"] ?? field?.errorId}
      aria-invalid={props["aria-invalid"] ?? error ?? field?.invalid}
      aria-required={props["aria-required"] ?? field?.required}
      defaultValue=""
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

interface CheckboxFieldProps {
  name: string;
  label: React.ReactNode;
  error?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

export function CheckboxField({
  name,
  label,
  error,
  checked,
  onChange,
  required,
}: CheckboxFieldProps) {
  return (
    <div>
      <div className="checkbox-row">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
          required={required}
        />
        <label htmlFor={name} className="text-sm leading-relaxed text-fog">
          {label}
        </label>
      </div>
      {error && <p className="field-error mt-1.5">{error}</p>}
    </div>
  );
}

interface FormSuccessProps {
  title: string;
  message: string;
  nextSteps?: string[];
  actionLabel?: string;
  actionHref?: string;
}

export function FormSuccess({
  title,
  message,
  nextSteps,
  actionLabel,
  actionHref,
}: FormSuccessProps) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center border border-accent/30">
        <svg
          className="h-7 w-7 text-accent"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="headline-md mb-4">{title}</h2>
      <p className="body-lg mb-8">{message}</p>
      {nextSteps && nextSteps.length > 0 && (
        <div className="mb-8 text-left">
          <p className="label-caps mb-4">What happens next</p>
          <ol className="space-y-3">
            {nextSteps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-fog">
                <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
      {actionLabel && actionHref && (
        <a
          href={actionHref}
          className="label-caps link-underline text-accent hover:text-cream"
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
