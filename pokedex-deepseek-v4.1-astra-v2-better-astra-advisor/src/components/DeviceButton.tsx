/** Shared physical button primitives: pill buttons and labelled button stacks. */
import type { ButtonHTMLAttributes, JSX, ReactNode } from 'react';

type Variant = 'pill' | 'yellow' | 'search';

export interface DeviceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Visually hold the button down (used for latched states). */
  held?: boolean;
}

export function DeviceButton({
  variant = 'pill',
  held = false,
  className,
  type = 'button',
  ...rest
}: DeviceButtonProps): JSX.Element {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ');
  return <button {...rest} type={type} className={classes} data-pressed={held} />;
}

export interface CaptionedButtonProps extends DeviceButtonProps {
  caption: string;
  children?: ReactNode;
  /** Caption below the button instead of above (matches DATA / CANCEL). */
  captionBelow?: boolean;
}

export function CaptionedButton({
  caption,
  children,
  captionBelow = false,
  ...buttonProps
}: CaptionedButtonProps): JSX.Element {
  return (
    <span className={`btn-stack${captionBelow ? ' btn-stack--below' : ''}`}>
      <DeviceButton {...buttonProps}>{children}</DeviceButton>
      <span className="btn__caption" aria-hidden="true">
        {caption}
      </span>
    </span>
  );
}
