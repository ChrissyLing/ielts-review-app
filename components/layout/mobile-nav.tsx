"use client";

import { useState } from "react";
import { BookOpenCheckIcon, MenuIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="打开菜单" />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 max-w-[80vw] p-0 sm:max-w-[20rem]"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <SheetDescription className="sr-only">
            在错题录入、错题本与复习之间切换
          </SheetDescription>
          <Sidebar onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex items-center gap-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <BookOpenCheckIcon className="size-4" />
        </div>
        <span className="text-sm font-semibold">IELTS 错题本</span>
      </div>
    </header>
  );
}
