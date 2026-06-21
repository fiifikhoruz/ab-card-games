import { getEditionInfo } from '@/lib/types'

interface EditionBadgeProps {
  productName: string
  size?: 'sm' | 'md'
}

export default function EditionBadge({ productName, size = 'md' }: EditionBadgeProps) {
  const { name, color, textColor } = getEditionInfo(productName)

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      }`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {name}
    </span>
  )
}
