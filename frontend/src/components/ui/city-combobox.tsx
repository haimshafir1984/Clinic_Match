import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
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

// Major Israeli cities for autocomplete. Exported so CityMultiCombobox
// (below) shares the same list instead of duplicating it.
export const israeliCities = [
  "תל אביב",
  "ירושלים",
  "חיפה",
  "ראשון לציון",
  "פתח תקווה",
  "אשדוד",
  "נתניה",
  "באר שבע",
  "בני ברק",
  "חולון",
  "רמת גן",
  "אשקלון",
  "רחובות",
  "בת ים",
  "הרצליה",
  "כפר סבא",
  "רעננה",
  "מודיעין",
  "לוד",
  "רמלה",
  "נצרת",
  "עכו",
  "קריית גת",
  "אילת",
  "טבריה",
  "צפת",
  "עפולה",
  "נהריה",
  "קריית שמונה",
  "דימונה",
  "ערד",
  "יבנה",
  "גבעתיים",
  "קריית אתא",
  "קריית מוצקין",
  "קריית ביאליק",
  "קריית ים",
  "נס ציונה",
  "אור יהודה",
  "יהוד",
  "רמת השרון",
  "הוד השרון",
  "כפר יונה",
  "זכרון יעקב",
  "פרדס חנה",
  "טירת כרמל",
  "עתלית",
];

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function CityCombobox({ value, onChange, placeholder = "בחר עיר" }: CityComboboxProps) {
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
            placeholder="חפש עיר..."
            value={searchValue}
            onValueChange={setSearchValue}
            className="text-right"
          />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">לא נמצאה עיר</p>
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
                    השתמש ב-"{searchValue}"
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
interface CityMultiComboboxProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

/**
 * Multi-city variant: selected cities render as removable chips above the
 * trigger, and the popover stays open after each pick so choosing several
 * cities in a row doesn't mean reopening it every time.
 */
export function CityMultiCombobox({ value, onChange, placeholder = "הוסף עיר" }: CityMultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const filteredCities = israeliCities.filter(
    (city) => city.includes(searchValue) && !value.includes(city)
  );

  const addCity = (city: string) => {
    const trimmed = city.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setSearchValue("");
  };

  const removeCity = (city: string) => {
    onChange(value.filter((item) => item !== city));
  };

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5" dir="rtl">
          {value.map((city) => (
            <span
              key={city}
              className="flex items-center gap-1 rounded-full bg-primary/10 py-1 pe-1 ps-3 text-sm text-primary"
            >
              {city}
              <button
                type="button"
                onClick={() => removeCity(city)}
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`הסר את ${city}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            type="button"
            className="w-full justify-between text-right"
            dir="rtl"
          >
            {placeholder}
            <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command dir="rtl">
            <CommandInput
              placeholder="חפש עיר..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="text-right"
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2 text-center">
                  <p className="mb-2 text-sm text-muted-foreground">לא נמצאה עיר</p>
                  {searchValue && (
                    <Button variant="outline" size="sm" onClick={() => addCity(searchValue)}>
                      השתמש ב-"{searchValue}"
                    </Button>
                  )}
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => addCity(city)}
                    className="text-right"
                  >
                    <Check className="ml-2 h-4 w-4 opacity-0" />
                    {city}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
