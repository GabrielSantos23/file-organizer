import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Monitor,
  FileText,
  Database,
  Shield,
  Cpu,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useTranslation } from "react-i18next";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState("general");
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const [pythonPath, setPythonPath] = useState("python3");
  const [autoRename, setAutoRename] = useState(true);

  useEffect(() => {}, []);

  const TabButton = ({
    id,
    label,
    icon: Icon,
  }: {
    id: string;
    label: string;
    icon: any;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-start justify-start gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
        activeTab === id
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-muted-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <div className="text-left">{label}</div>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden flex h-[500px]">
        <div className="w-48 bg-muted/30 border-r border-border p-4 flex flex-col gap-1">
          <div className="mb-4 px-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t("settings.title")}
            </h3>
          </div>

          <TabButton
            id="general"
            label={t("settings.general")}
            icon={Monitor}
          />
          <TabButton id="ai" label={t("settings.ai")} icon={Cpu} />
          <TabButton id="rules" label={t("settings.rules")} icon={FileText} />
          <TabButton
            id="advanced"
            label={t("settings.advanced")}
            icon={Database}
          />
          <TabButton id="about" label={t("settings.about")} icon={Shield} />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-1">
                    {t("settings.general")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.generalDescription")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t("settings.appearance")}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setTheme("light")}
                        className={`flex flex-col items-center gap-2 p-2 rounded-md border-2 transition-all ${
                          theme === "light"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Sun className="h-6 w-6" />
                        <span className="text-xs">{t("settings.light")}</span>
                      </button>
                      <button
                        onClick={() => setTheme("dark")}
                        className={`flex flex-col items-center gap-2 p-2 rounded-md border-2 transition-all ${
                          theme === "dark"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Moon className="h-6 w-6" />
                        <span className="text-xs">{t("settings.dark")}</span>
                      </button>
                      <button
                        onClick={() => setTheme("system")}
                        className={`flex flex-col items-center gap-2 p-2 rounded-md border-2 transition-all ${
                          theme === "system"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <Laptop className="h-6 w-6" />
                        <span className="text-xs">{t("settings.system")}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("settings.language")}</Label>
                    <Select
                      value={i18n.language}
                      onValueChange={(value) =>
                        value && i18n.changeLanguage(value)
                      }
                    >
                      <SelectTrigger className="w-full rounded-lg">
                        <SelectValue
                          placeholder={t("settings.selectLanguage")}
                        />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="pt-BR">
                          Português (Brasil)
                        </SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <Label>{t("settings.autoRename")}</Label>
                      <div className="text-[12px] text-muted-foreground">
                        {t("settings.autoRenameDescription")}
                      </div>
                    </div>
                    <button
                      onClick={() => setAutoRename(!autoRename)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${autoRename ? "bg-primary" : "bg-input"}`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${autoRename ? "translate-x-4" : ""}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-1">
                    {t("settings.ai")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.aiDescription")}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t("settings.aiVisionModel")}</Label>
                    <div className="text-xs text-muted-foreground mb-1">
                      {t("settings.aiVisionModelDescription")}
                    </div>
                    <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors">
                      <option>{t("settings.aiVisionModelDefault")}</option>
                      <option>{t("settings.aiVisionModelBalanced")}</option>
                      <option>{t("settings.aiVisionModelFast")}</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label>{t("settings.aiPythonPath")}</Label>
                    <Input
                      value={pythonPath}
                      onChange={(e) => setPythonPath(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      {t("settings.aiPythonPathDescription")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium mb-1">
                    {t("settings.about")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.aboutDescription")}
                  </p>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-center space-y-2 border border-border">
                  <div className="h-12 w-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-2 text-primary">
                    <Settings className="h-6 w-6" />
                  </div>
                  <h5 className="font-semibold">{t("settings.aboutTitle")}</h5>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.aboutVersion")}
                  </p>
                  <p className="text-xs text-muted-foreground pt-2">
                    {t("settings.aboutDeveloper")}
                  </p>
                </div>
              </div>
            )}

            {(activeTab === "rules" || activeTab === "advanced") && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Settings className="h-8 w-8 mb-2 opacity-20" />
                <p>{t("settings.development")}</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border flex justify-end gap-2 bg-background/50 backdrop-blur-sm">
            <Button
              variant="outline"
              className={
                "rounded-2xl dark:text-secondary-foreground text-primary-foreground"
              }
              onClick={() => onOpenChange(false)}
            >
              {t("settings.cancel")}
            </Button>
            <Button
              className={
                "rounded-2xl dark:text-secondary-foreground text-primary-foreground"
              }
              onClick={() => onOpenChange(false)}
            >
              {t("settings.save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
