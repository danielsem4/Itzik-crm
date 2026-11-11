import { Search } from "lucide-react";
import { IconInput, type IconInputProps } from "./IconInput";

interface SearchInputProps extends Omit<IconInputProps, "icon" | "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

/** Text field with a search icon. Debouncing/querying is the caller's concern. */
export function SearchInput({ value, onValueChange, ...props }: SearchInputProps) {
  return (
    <IconInput
      icon={Search}
      type="search"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    />
  );
}
