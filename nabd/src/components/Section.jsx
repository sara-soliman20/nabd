export default function Section({ title, emoji, action, children, className = '' }) {
  return (<section className={`space-y-3 ${className}`}>
    <div className="flex items-center justify-between gap-3"><h2 className="font-display font-extrabold text-[1.3rem]">{emoji && <span className="me-1.5" aria-hidden="true">{emoji}</span>}{title}</h2>{action}</div>
    {children}</section>)
}
