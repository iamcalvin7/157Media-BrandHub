import { FileText } from "lucide-react";

type Props = {
  title?: string;
  message?: string;
  icon?: React.ElementType;
  className?: string;
};

/**
 * Standard empty-state card used across the static brand-content pages
 * whenever a section has no data configured for the active brand. Lets the
 * page render its layout without leaking another brand's content or crashing.
 */
export function EmptySection({
  title = "Not configured yet",
  message = "Add content for this brand and it will appear here.",
  icon: Icon = FileText,
  className = "",
}: Props) {
  return (
    <div
      className={`bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center space-y-2 ${className}`}
    >
      <Icon className="w-7 h-7 text-gray-300 mx-auto" />
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 font-light max-w-md mx-auto leading-relaxed">{message}</p>
    </div>
  );
}
