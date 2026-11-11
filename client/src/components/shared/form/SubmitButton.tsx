import { LoadingButton, type LoadingButtonProps } from "../inputs/LoadingButton";

/** Form submit button: disabled + spinner while the submission is in flight. */
export function SubmitButton(props: Omit<LoadingButtonProps, "type">) {
  return <LoadingButton type="submit" {...props} />;
}
