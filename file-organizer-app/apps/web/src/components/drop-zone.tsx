import { Button } from "@/components/ui/button";
import { FolderOpen, Upload, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DropZoneProps {
  onSelectFolder: () => void;
  selectedFolder?: string;
}

export function DropZone({ onSelectFolder, selectedFolder }: DropZoneProps) {
  const { t } = useTranslation();

  return (
    <div
      className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onSelectFolder}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <FolderOpen className="h-6 w-6 text-primary" />
        </div>
        {selectedFolder ? (
          <>
            <div>
              <p className="text-sm font-medium">
                {t("actions.selectedFolder")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md truncate">
                {selectedFolder}
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              <Sparkles className="h-4 w-4 mr-2" />
              {t("actions.changeFolder")}
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-primary">
                {t("actions.selectFolder")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("actions.selectFolderToStart")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
