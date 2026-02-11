import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ConfigItemProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function ConfigItem({ label, children, className }: ConfigItemProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[10px] uppercase opacity-50 font-bold tracking-wider">
        {label}
      </Label>
      {children}
    </div>
  );
}

interface ConfigInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string | number;
  onChangeValue?: (value: string) => void;
}

export function ConfigInput({ value, onChangeValue, className, ...props }: ConfigInputProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChangeValue?.(e.target.value)}
      className={cn("h-8 text-xs bg-background/50", className)}
      {...props}
    />
  );
}

interface ConfigSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function ConfigSelect({ value, onValueChange, options, placeholder }: ConfigSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8 text-xs bg-background/50">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ConfigSwitchProps {
  label: string;
  checked?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function ConfigSwitch({ label, checked, onCheckedChange }: ConfigSwitchProps) {
  return (
    <div className="flex items-center justify-between h-8">
      <Label className="text-[10px] uppercase opacity-50 font-bold tracking-wider">
        {label}
      </Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
