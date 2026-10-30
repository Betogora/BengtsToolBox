import type { Round } from "@/apps/swiss-tournaments/types";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function RoundStatusBadge({ status }: { status: Round["status"] }) {
  const { t } = useI18n();

  return (
    <Badge className="type-ui align-middle" variant={status === "draft" ? "default" : "secondary"}>
      {t(
        status === "draft"
          ? "swiss.unitStatus.active"
          : "swiss.unitStatus.closed",
      )}
    </Badge>
  );
}
