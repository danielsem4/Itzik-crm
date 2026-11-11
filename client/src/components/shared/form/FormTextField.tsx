import type { ComponentProps, ReactNode } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "../inputs/PasswordInput";

type InputProps = Omit<ComponentProps<typeof Input>, "name" | "value" | "onChange" | "onBlur">;

interface FormTextFieldProps<T extends FieldValues> extends InputProps {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
}

/**
 * Label + text input + validation message bound to a react-hook-form field.
 * `type="password"` renders a `PasswordInput` (with show/hide toggle).
 */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  type = "text",
  ...inputProps
}: FormTextFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {type === "password" ? (
              <PasswordInput {...inputProps} {...field} value={field.value ?? ""} />
            ) : (
              <Input type={type} {...inputProps} {...field} value={field.value ?? ""} />
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
