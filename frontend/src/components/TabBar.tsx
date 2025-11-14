import React from 'react'

type Tab = { key: string; label?: string; icon?: string }

type Props = {
  tabs: Tab[]
  active: string
  onChange: (k: string) => void
}

const defaultIcon = (key: string): string => {
  switch (key) {
    case 'dashboard': return 'home'
    case 'scan': return 'qr_code_scanner'
    case 'inventory': return 'visibility'
    case 'orders': return 'receipt_long'
    case 'pricing': return 'sell'
    default: return 'widgets'
  }
}

export default function TabBar({tabs, active, onChange}: Props){
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${active===t.key?'active':''}`}
            onClick={()=>onChange(t.key)}
            aria-label={t.label || t.key}
            title={t.label || t.key}
          >
            <span className="material-symbols-outlined">{t.icon || defaultIcon(t.key)}</span>
            {active===t.key && <span className="active-dot" />}
          </button>
        ))}
      </div>
    </div>
  )
}
