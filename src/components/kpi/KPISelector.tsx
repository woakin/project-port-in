import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KPISelectorProps {
  kpiNames: string[];
  selectedKPI: string;
  onSelectKPI: (kpi: string) => void;
}

export function KPISelector({ kpiNames, selectedKPI, onSelectKPI }: KPISelectorProps) {
  return (
    <div className="w-full">
      <label className="text-sm font-medium text-muted-foreground mb-2 block">
        Selecciona un KPI
      </label>
      <Select value={selectedKPI} onValueChange={onSelectKPI}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona un KPI para ver su evolución" />
        </SelectTrigger>
        <SelectContent>
          {kpiNames.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
