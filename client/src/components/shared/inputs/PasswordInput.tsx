import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { IconInput, type IconInputProps } from "./IconInput";

type PasswordInputProps = Omit<IconInputProps, "type" | "endAdornment">;

/** Password field with an accessible show/hide toggle. */
export function PasswordInput(props: PasswordInputProps) {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <IconInput
      {...props}
      type={visible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          aria-label={t(visible ? "password.hide" : "password.show")}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Icon aria-hidden className="size-4" />
        </button>
      }
    />
  );
}
