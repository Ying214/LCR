type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-7 space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.8rem]">{title}</h2>
      {description ? <p className="max-w-4xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}
