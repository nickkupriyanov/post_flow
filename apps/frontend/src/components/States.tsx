export function LoadingState({ label = "Загружаем пространство..." }: { label?: string }) {
  return <div className="state-card loading">{label}</div>;
}

export function ErrorState({ message = "Что-то пошло не так. Попробуйте снова." }: { message?: string }) {
  return <div className="state-card error">{message}</div>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-mark">✦</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

