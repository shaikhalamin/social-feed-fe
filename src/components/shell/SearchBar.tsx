import { useState  } from "react"
import type {FormEvent} from "react";
import { toast } from "@/components/ui/sonner"
import { SearchIcon } from "@/components/shell/icons"

export function SearchBar() {
  const [value, setValue] = useState("")
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    toast.info("Search coming soon")
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="relative hidden w-full max-w-[280px] md:block"
    >
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="input search text"
        aria-label="Search"
        className="h-10 w-full rounded-full bg-muted pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
    </form>
  )
}
