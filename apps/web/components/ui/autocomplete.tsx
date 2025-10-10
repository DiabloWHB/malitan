"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"

interface AutocompleteProps {
  value: string
  onValueChange: (value: string) => void
  suggestions: string[]
  placeholder?: string
  emptyText?: string
  id?: string
}

export function Autocomplete({
  value,
  onValueChange,
  suggestions,
  placeholder = "הקלד...",
  emptyText = "לא נמצאו תוצאות",
  id,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // הצג הצעות רק אם הוקלדו לפחות 3 תווים
  const shouldShowSuggestions = inputValue.length >= 3

  const filteredSuggestions = React.useMemo(() => {
    if (!shouldShowSuggestions || !suggestions) return []

    const searchValue = inputValue.toLowerCase()
    return suggestions
      .filter(item => item.toLowerCase().includes(searchValue))
      .slice(0, 8)
  }, [inputValue, suggestions, shouldShowSuggestions])

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onValueChange(newValue)
    
    // פתח את הרשימה רק אם יש לפחות 3 תווים
    if (newValue.length >= 3) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  const handleSelect = (selectedValue: string) => {
    setInputValue(selectedValue)
    onValueChange(selectedValue)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Command className="overflow-visible bg-white border rounded-md">
        <CommandInput
          id={id}
          value={inputValue}
          onValueChange={handleInputChange}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder}
          className="h-10 border-0"
        />
        {open && shouldShowSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            <CommandList>
              <CommandGroup>
                {filteredSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        inputValue === suggestion ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
        {open && shouldShowSuggestions && filteredSuggestions.length === 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-md shadow-lg p-3 text-center text-sm text-zinc-500">
            {emptyText}
          </div>
        )}
      </Command>
    </div>
  )
}