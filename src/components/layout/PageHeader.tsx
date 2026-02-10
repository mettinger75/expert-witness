interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1
          className="text-[1.75rem] font-bold leading-[1.2] tracking-[-0.025em]"
          style={{ color: '#091525' }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: '#8892A2' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
