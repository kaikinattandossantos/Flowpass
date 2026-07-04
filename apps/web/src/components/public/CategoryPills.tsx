interface CategoryPillsProps {
  categories: string[]
  selected: string
  onChange: (value: string) => void
}

export function CategoryPills({ categories, selected, onChange }: CategoryPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {categories.map((category) => {
        const active = selected === category
        return (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition ${
              active
                ? 'bg-[var(--brand)] text-white shadow-md'
                : 'bg-white text-slate-700 border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--brand)]'
            }`}
          >
            {category}
          </button>
        )
      })}
    </div>
  )
}