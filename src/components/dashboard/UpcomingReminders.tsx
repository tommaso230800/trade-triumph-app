import { Bell, Calendar, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const reminders = [
  {
    id: 1,
    title: "Chiamare Rossi S.r.l.",
    description: "Follow-up ordine mensile",
    time: "10:00",
    type: "call",
    priority: "high",
  },
  {
    id: 2,
    title: "Riunione con Bianchi & Co.",
    description: "Presentazione nuovi prodotti",
    time: "14:30",
    type: "meeting",
    priority: "medium",
  },
  {
    id: 3,
    title: "Inviare preventivo",
    description: "Verde Distribuzione - catalogo 2024",
    time: "16:00",
    type: "email",
    priority: "low",
  },
];

const typeIcons = {
  call: Phone,
  meeting: Calendar,
  email: Mail,
};

const priorityColors = {
  high: "border-l-destructive bg-destructive/5",
  medium: "border-l-warning bg-warning/5",
  low: "border-l-info bg-info/5",
};

export function UpcomingReminders() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Promemoria Oggi</h3>
        </div>
        <a href="/promemoria" className="text-sm font-medium text-primary hover:underline">
          Vedi tutti
        </a>
      </div>
      <div className="space-y-3">
        {reminders.map((reminder) => {
          const Icon = typeIcons[reminder.type as keyof typeof typeIcons];
          return (
            <div
              key={reminder.id}
              className={cn(
                "rounded-lg border-l-4 p-4 transition-colors hover:bg-muted/30",
                priorityColors[reminder.priority as keyof typeof priorityColors]
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-card-foreground">{reminder.title}</p>
                    <p className="text-sm text-muted-foreground">{reminder.description}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{reminder.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
