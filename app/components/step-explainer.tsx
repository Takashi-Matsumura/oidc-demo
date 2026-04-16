type Props = {
  step: number;
  title: string;
  description: string;
  active?: boolean;
};

export default function StepExplainer({
  step,
  title,
  description,
  active = false,
}: Props) {
  return (
    <div className="flex gap-4">
      <div
        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
          active
            ? "bg-blue-600 text-white"
            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        }`}
      >
        {step}
      </div>
      <div className="pt-0.5">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h4>
        <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
      </div>
    </div>
  );
}
