import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Banknote, Briefcase, Calendar, Loader2, MapPin, Search, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseSearchQuery } from "@/lib/api";

export interface SearchFilters {
  position?: string;
  location?: string;
  days?: string[];
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
}

interface NaturalLanguageSearchProps {
  onFiltersChange: (filters: SearchFilters | null) => void;
  role: "clinic" | "worker";
}

type FilterValue = string | number | string[];

function parseFallback(query: string): SearchFilters {
  const filters: SearchFilters = {};
  const normalizedQuery = query.toLowerCase();
  const positions = ["שיננית", "סייעת", "מנהל/ת", "נציג/ת שירות", "חתם/ת", "מפתח/ת"];
  const locations = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "רמת גן", "נתניה", "מרכז", "צפון", "דרום"];
  const dayMappings: Record<string, string> = { ראשון: "sunday", שני: "monday", שלישי: "tuesday", רביעי: "wednesday", חמישי: "thursday", שישי: "friday", שבת: "saturday" };

  filters.position = positions.find((position) => normalizedQuery.includes(position.toLowerCase()));
  filters.location = locations.find((location) => normalizedQuery.includes(location.toLowerCase()));

  const detectedDays = Object.entries(dayMappings).filter(([hebrew]) => normalizedQuery.includes(hebrew.toLowerCase())).map(([, english]) => english);
  if (detectedDays.length > 0) filters.days = detectedDays;

  const salaryMatch = normalizedQuery.match(/(\d+)/);
  if (salaryMatch) filters.salaryMin = Number.parseInt(salaryMatch[1], 10);
  if (normalizedQuery.includes("יומי")) filters.jobType = "daily";
  if (normalizedQuery.includes("זמני")) filters.jobType = "temporary";
  if (normalizedQuery.includes("קבוע")) filters.jobType = "permanent";

  return Object.fromEntries(Object.entries(filters).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : Boolean(value)))) as SearchFilters;
}

function getFilterLabel(key: string, value: FilterValue): { icon: typeof Search; text: string } {
  if (key === "position") return { icon: Briefcase, text: String(value) };
  if (key === "location") return { icon: MapPin, text: String(value) };
  if (key === "days") return { icon: Calendar, text: (value as string[]).join(", ") };
  if (key === "salaryMin") return { icon: Banknote, text: `מ-${value}` };
  if (key === "jobType") return { icon: Briefcase, text: String(value) };
  return { icon: Search, text: String(value) };
}

export function NaturalLanguageSearch({ onFiltersChange, role }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const placeholderExamples = role === "clinic"
    ? ["נציג/ת שירות בתל אביב", "חתם/ת באזור המרכז", "עובד/ת ליום ראשון"]
    : ["משרה קבועה בחיפה", "בית עסק בתחום הביטוח", "עבודה זמנית באזור המרכז"];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = await parseSearchQuery(query);
      const filters: SearchFilters = {
        position: typeof parsed.position === "string" ? parsed.position : undefined,
        location: typeof parsed.location === "string" ? parsed.location : undefined,
        days: Array.isArray(parsed.days) ? parsed.days.filter((value): value is string => typeof value === "string") : undefined,
        salaryMin: typeof parsed.salaryMin === "number" ? parsed.salaryMin : undefined,
        salaryMax: typeof parsed.salaryMax === "number" ? parsed.salaryMax : undefined,
        jobType: typeof parsed.jobType === "string" ? parsed.jobType : undefined,
      };
      const nextFilters = Object.values(filters).some(Boolean) ? filters : parseFallback(query);
      const normalized = Object.keys(nextFilters).length > 0 ? nextFilters : null;
      setActiveFilters(normalized);
      onFiltersChange(normalized);
    } catch {
      const fallback = parseFallback(query);
      const normalized = Object.keys(fallback).length > 0 ? fallback : null;
      setActiveFilters(normalized);
      onFiltersChange(normalized);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setActiveFilters(null);
    onFiltersChange(null);
  };

  const removeFilter = (key: keyof SearchFilters) => {
    if (!activeFilters) return;
    const nextFilters: SearchFilters = { ...activeFilters };
    delete nextFilters[key];
    if (Object.keys(nextFilters).length === 0) {
      clearFilters();
    } else {
      setActiveFilters(nextFilters);
      onFiltersChange(nextFilters);
    }
  };

  return (
    <div className="space-y-3">
      {!isExpanded && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setIsExpanded(true)} className="flex w-full items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 transition-colors hover:border-primary/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-start text-sm text-muted-foreground">חיפוש חכם...</span>
          <Sparkles className="h-4 w-4 text-primary" />
        </motion.button>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" />חיפוש בשפה טבעית</div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(false)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSearch();
                    }
                  }}
                  placeholder={`לדוגמה: "${placeholderExamples[0]}"`}
                  className="flex-1"
                  dir="rtl"
                />
                <Button onClick={() => void handleSearch()} disabled={!query.trim() || isProcessing} size="icon">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              {!activeFilters && (
                <div className="flex flex-wrap gap-2">
                  {placeholderExamples.map((example) => (
                    <button key={example} type="button" className="rounded-full bg-accent/50 px-2 py-1 text-xs text-accent-foreground" onClick={() => setQuery(example)}>
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeFilters && Object.keys(activeFilters).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">סינון:</span>
          {Object.entries(activeFilters).map(([key, value]) => {
            const descriptor = getFilterLabel(key, value as FilterValue);
            const Icon = descriptor.icon;
            return (
              <Badge key={key} variant="secondary" className="border-primary/20 bg-primary/10 pr-1 text-primary">
                <Icon className="h-3 w-3" />
                {descriptor.text}
                <button type="button" onClick={() => removeFilter(key as keyof SearchFilters)} className="ml-1 rounded-full p-0.5 hover:bg-primary/20">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          <button type="button" onClick={clearFilters} className="text-xs text-destructive hover:underline">נקה הכל</button>
        </div>
      )}
    </div>
  );
}
