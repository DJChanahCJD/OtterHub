import { ReactNode } from "react";
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from "@/components/ui/resizable";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MusicLayoutProps {
  sidebar: ReactNode;
  children: ReactNode; // Main Content
  player: ReactNode;
}

export function MusicLayout({ sidebar, children, player }: MusicLayoutProps) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {/* Mobile Header (Only visible on small screens) */}
      <div className="md:hidden flex items-center p-4 border-b">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <div className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </div>
            {sidebar}
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-semibold">Otter Music</span>
      </div>

      <div className="flex-1 min-h-0 relative">
        {/* Desktop Layout */}
        <div className="hidden md:block h-full absolute inset-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={10} minSize={10} maxSize={20} className="min-w-[180px]">
              {sidebar}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={80}>
              {children}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* Mobile Layout (Just content, sidebar is in Sheet) */}
        <div className="md:hidden h-full">
          {children}
        </div>
      </div>

      {/* Player Bar */}
      <div className="flex-none z-50">
        {player}
      </div>
    </div>
  );
}
