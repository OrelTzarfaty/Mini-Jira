import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** A password input with a show/hide button (wireframe 01 B and C). */
export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type'>): ReactElement {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={isVisible ? 'text' : 'password'} className="pr-9" />
      {/* One fixed name with aria-pressed: screen readers hear "Show password, toggle button,
          pressed", which is clearer than a name that flips between "Show" and "Hide". */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Show password"
        aria-pressed={isVisible}
        onClick={() => {
          setIsVisible((wasVisible) => !wasVisible);
        }}
        className="absolute inset-y-0 right-0.5 my-auto"
      >
        {isVisible ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
      </Button>
    </div>
  );
}
