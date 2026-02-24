import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Sparkles, 
  X, 
  Loader2,
  MapPin,
  Briefcase,
  Calendar,
  Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  role: 'clinic' | 'worker';
}

// AI-powered natural language parser (simulated)
function parseNaturalLanguage(query: string): SearchFilters {
  const filters: SearchFilters = {};
  const queryLower = query.toLowerCase();
  
  // Position detection
  const positions = [
    'שיננית', 'סייעת', 'מנהלת', 'רופא', 'רופאה', 'אופטומטריסט', 
    'אופטיקאי', 'קוסמטיקאית', 'פיזיותרפיסט', 'דנטלית'
  ];
  for (const pos of positions) {
    if (queryLower.includes(pos)) {
      filters.position = pos;
      break;
    }
  }
  
  // Location detection
  const locations = [
    'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'רמת גן', 
    'פתח תקווה', 'אשדוד', 'נתניה', 'ראשון לציון', 'חולון',
    'הרצליה', 'כפר סבא', 'רעננה', 'מרכז', 'צפון', 'דרום'
  ];
  for (const loc of locations) {
    if (queryLower.includes(loc)) {
      filters.location = loc;
      break;
    }
  }
  
  // Days detection
  const dayMappings: Record<string, string> = {
    'ראשון': 'sunday',
    'שני': 'monday',
    'שלישי': 'tuesday',
    'רביעי': 'wednesday',
    'חמישי': 'thursday',
    'שישי': 'friday',
    'שבת': 'saturday',
  };
  const detectedDays: string[] = [];
  for (const [heb, eng] of Object.entries(dayMappings)) {
    if (queryLower.includes(heb) || queryLower.includes(`יום ${heb}`)) {
      detectedDays.push(eng);
    }
  }
  if (detectedDays.length > 0) {
    filters.days = detectedDays;
  }
  
  // Salary detection
  const salaryMatch = queryLower.match(/(\d+)\s*(?:שקל|ש"ח|₪)/);
  if (salaryMatch) {
    filters.salaryMin = parseInt(salaryMatch[1]);
  }
  
  // Job type detection
  if (queryLower.includes('יום') || queryLower.includes('יומי')) {
    filters.jobType = 'daily';
  } else if (queryLower.includes('זמני') || queryLower.includes('חלקי')) {
    filters.jobType = 'temporary';
  } else if (queryLower.includes('קבוע') || queryLower.includes('מלא')) {
    filters.jobType = 'permanent';
  }
  
  return filters;
}

// Get filter description in Hebrew
function getFilterLabel(key: string, value: any): { icon: typeof Search; text: string } {
  switch (key) {
    case 'position':
      return { icon: Briefcase, text: value };
    case 'location':
      return { icon: MapPin, text: value };
    case 'days':
      const dayNames: Record<string, string> = {
        sunday: 'ראשון',
        monday: 'שני',
        tuesday: 'שלישי',
        wednesday: 'רביעי',
        thursday: 'חמישי',
        friday: 'שישי',
        saturday: 'שבת',
      };
      return { icon: Calendar, text: value.map((d: string) => dayNames[d]).join(', ') };
    case 'salaryMin':
      return { icon: Banknote, text: `מ-${value}₪` };
    case 'jobType':
      const types: Record<string, string> = {
        daily: 'עבודה יומית',
        temporary: 'זמני',
        permanent: 'קבוע',
      };
      return { icon: Briefcase, text: types[value] || value };
    default:
      return { icon: Search, text: String(value) };
  }
}

export function NaturalLanguageSearch({ onFiltersChange, role }: NaturalLanguageSearchProps) {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFilters | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const placeholderExamples = role === 'clinic' 
    ? ['שיננית באזור תל אביב', 'סייעת ליום ראשון ושלישי', 'רופא שיניים עם ניסיון']
    : ['מרפאת שיניים במרכז', 'משרה קבועה בהרצליה', 'עבודה יומית'];
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const filters = parseNaturalLanguage(query);
    setActiveFilters(Object.keys(filters).length > 0 ? filters : null);
    onFiltersChange(Object.keys(filters).length > 0 ? filters : null);
    
    setIsProcessing(false);
  };
  
  const handleClearFilters = () => {
    setQuery("");
    setActiveFilters(null);
    onFiltersChange(null);
  };
  
  const handleRemoveFilter = (key: string) => {
    if (!activeFilters) return;
    
    const newFilters = { ...activeFilters };
    delete (newFilters as any)[key];
    
    if (Object.keys(newFilters).length === 0) {
      handleClearFilters();
    } else {
      setActiveFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search Toggle */}
      {!isExpanded && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border hover:border-primary/50 transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1 text-start">
            חיפוש חכם...
          </span>
          <Sparkles className="w-4 h-4 text-primary" />
        </motion.button>
      )}
      
      {/* Expanded Search */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">חיפוש בשפה טבעית</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setIsExpanded(false);
                    if (!activeFilters) setQuery("");
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Search Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={`לדוגמה: "${placeholderExamples[0]}"`}
                    className="pl-10"
                    dir="rtl"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={!query.trim() || isProcessing}
                  size="icon"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Example Queries */}
              {!activeFilters && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">נסו:</span>
                  {placeholderExamples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setQuery(example);
                        setTimeout(handleSearch, 100);
                      }}
                      className="text-xs px-2 py-1 rounded-full bg-accent/50 text-accent-foreground hover:bg-accent transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Active Filters */}
      <AnimatePresence>
        {activeFilters && Object.keys(activeFilters).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 items-center"
          >
            <span className="text-xs text-muted-foreground">סינון:</span>
            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;
              const { icon: Icon, text } = getFilterLabel(key, value);
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1 pr-1 bg-primary/10 text-primary border-primary/20"
                >
                  <Icon className="w-3 h-3" />
                  {text}
                  <button
                    onClick={() => handleRemoveFilter(key)}
                    className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            <button
              onClick={handleClearFilters}
              className="text-xs text-destructive hover:underline"
            >
              נקה הכל
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
