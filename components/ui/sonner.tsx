'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      // The card itself is components/message-card.tsx; YouTube's is at most 416px wide
      style={{ '--width': '416px' } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
