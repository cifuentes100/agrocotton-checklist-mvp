import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Wrench } from "lucide-react";
import { relativeTime } from "./relativeTime";
import type { PendingResponse } from "@/routes/mecanico.index";

interface Props {
  response: PendingResponse;
  onClick: () => void;
}

export function ValidationQueueCard({ response, onClick }: Props) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border-slate-800 bg-slate-900/60 p-4 transition-colors hover:border-orange-500/40 hover:bg-slate-900/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              className="border-0"
              style={{ backgroundColor: "rgba(245, 166, 35, 0.2)", color: "#f5a623" }}
            >
              #{response.order_idx}
            </Badge>
            <h3 className="font-semibold text-slate-100">{response.item_name}</h3>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {response.operator_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5" />
              {response.serial}
            </span>
          </div>

          {response.observation && (
            <div className="flex items-start gap-1.5 text-sm text-slate-300">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
              <p className="line-clamp-2">{response.observation}</p>
            </div>
          )}
        </div>

        <span className="shrink-0 text-xs text-slate-500">
          {relativeTime(response.answered_at)}
        </span>
      </div>
    </Card>
  );
}
