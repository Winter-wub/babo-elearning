"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface CourseItem {
  label: string;
  href: string;
}

const COURSE_ITEMS: CourseItem[] = [
  { label: "All Courses", href: "#" },
  { label: "Finance", href: "#" },
  { label: "Investment", href: "#" },
  { label: "Tax Planning", href: "#" },
];

export function NavCoursesDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 focus-visible:ring-1 focus-visible:ring-ring"
        >
          Courses
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {COURSE_ITEMS.map((item) => (
          <DropdownMenuItem key={item.label} asChild>
            <Link href={item.href} className="w-full cursor-pointer">
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
