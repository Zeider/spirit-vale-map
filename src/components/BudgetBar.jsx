export default function BudgetBar({ label, used, total }) {
  const over = used > total;
  return (
    <div className={`budget-bar${over ? ' over' : ''}`}>
      <span className="label">{label}</span>
      <span className="budget-count">{used} / {total}</span>
    </div>
  );
}
