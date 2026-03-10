import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Major Israeli cities for autocomplete
const israeliCities = [
  "׳×׳ ׳׳‘׳™׳‘",
  "׳™׳¨׳•׳©׳׳™׳",
  "׳—׳™׳₪׳”",
  "׳¨׳׳©׳•׳ ׳׳¦׳™׳•׳",
  "׳₪׳×׳— ׳×׳§׳•׳•׳”",
  "׳׳©׳“׳•׳“",
  "׳ ׳×׳ ׳™׳”",
  "׳‘׳׳¨ ׳©׳‘׳¢",
  "׳‘׳ ׳™ ׳‘׳¨׳§",
  "׳—׳•׳׳•׳",
  "׳¨׳׳× ׳’׳",
  "׳׳©׳§׳׳•׳",
  "׳¨׳—׳•׳‘׳•׳×",
  "׳‘׳× ׳™׳",
  "׳”׳¨׳¦׳׳™׳”",
  "׳›׳₪׳¨ ׳¡׳‘׳",
  "׳¨׳¢׳ ׳ ׳”",
  "׳׳•׳“׳™׳¢׳™׳",
  "׳׳•׳“",
  "׳¨׳׳׳”",
  "׳ ׳¦׳¨׳×",
  "׳¢׳›׳•",
  "׳§׳¨׳™׳™׳× ׳’׳×",
  "׳׳™׳׳×",
  "׳˜׳‘׳¨׳™׳”",
  "׳¦׳₪׳×",
  "׳¢׳₪׳•׳׳”",
  "׳ ׳”׳¨׳™׳”",
  "׳§׳¨׳™׳™׳× ׳©׳׳•׳ ׳”",
  "׳“׳™׳׳•׳ ׳”",
  "׳¢׳¨׳“",
  "׳™׳‘׳ ׳”",
  "׳’׳‘׳¢׳×׳™׳™׳",
  "׳§׳¨׳™׳™׳× ׳׳×׳",
  "׳§׳¨׳™׳™׳× ׳׳•׳¦׳§׳™׳",
  "׳§׳¨׳™׳™׳× ׳‘׳™׳׳׳™׳§",
  "׳§׳¨׳™׳™׳× ׳™׳",
  "׳ ׳¡ ׳¦׳™׳•׳ ׳”",
  "׳׳•׳¨ ׳™׳”׳•׳“׳”",
  "׳™׳”׳•׳“",
  "׳¨׳׳× ׳”׳©׳¨׳•׳",
  "׳”׳•׳“ ׳”׳©׳¨׳•׳",
  "׳›׳₪׳¨ ׳™׳•׳ ׳”",
  "׳–׳›׳¨׳•׳ ׳™׳¢׳§׳‘",
  "׳₪׳¨׳“׳¡ ׳—׳ ׳”",
  "׳˜׳™׳¨׳× ׳›׳¨׳׳",
  "׳¢׳×׳׳™׳×",
];

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CityCombobox({ value, onChange, placeholder = "׳‘׳—׳¨ ׳¢׳™׳¨" }: CityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Filter cities based on search
  const filteredCities = israeliCities.filter((city) =>
    city.includes(searchValue)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-right"
          dir="rtl"
        >
          {value || placeholder}
          <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command dir="rtl">
          <CommandInput
            placeholder="׳—׳₪׳© ׳¢׳™׳¨..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="text-right"
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">׳׳ ׳ ׳׳¦׳׳” ׳¢׳™׳¨</p>
                {searchValue && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onChange(searchValue);
                      setOpen(false);
                      setSearchValue("");
                    }}
                  >
                    ׳”׳©׳×׳׳© ׳‘-"{searchValue}"
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => {
                    onChange(city);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="text-right"
                >
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === city ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
