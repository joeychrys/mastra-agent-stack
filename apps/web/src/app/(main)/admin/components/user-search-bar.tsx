"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UserSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}

export default function UserSearchBar({ searchTerm, onSearchChange, onClear }: UserSearchBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-[300px]"
        />
        {searchTerm && (
          <Button variant="ghost" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
