"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateOAuthProvider } from "@/actions/oauth.actions";
import type { OAuthProviderConfig } from "@/actions/oauth.actions";
import { OAUTH_LABELS } from "@/lib/constants";
import { Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Provider icons (inline SVGs matching social-login-buttons.tsx)
// ---------------------------------------------------------------------------

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

const PROVIDER_ICONS: Record<string, React.FC> = {
  google: GoogleIcon,
  facebook: FacebookIcon,
  apple: AppleIcon,
};

// ---------------------------------------------------------------------------
// Per-provider local state
// ---------------------------------------------------------------------------

interface ProviderFormState {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  isEditingSecret: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OAuthEditorProps {
  providers: OAuthProviderConfig[];
}

export function OAuthEditor({ providers }: OAuthEditorProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Initialize local state from server data
  const [formStates, setFormStates] = useState<Record<string, ProviderFormState>>(
    () => {
      const states: Record<string, ProviderFormState> = {};
      for (const p of providers) {
        states[p.id] = {
          enabled: p.enabled,
          clientId: p.clientId,
          clientSecret: "",
          isEditingSecret: false,
        };
      }
      return states;
    }
  );

  const [savingProvider, setSavingProvider] = useState<string | null>(null);

  function updateField(
    id: string,
    field: keyof ProviderFormState,
    value: string | boolean
  ) {
    setFormStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function isDirty(id: string): boolean {
    const original = providers.find((p) => p.id === id);
    const current = formStates[id];
    if (!original || !current) return false;
    return (
      current.enabled !== original.enabled ||
      current.clientId !== original.clientId ||
      (current.isEditingSecret && current.clientSecret.trim() !== "")
    );
  }

  function hasMissingCredentials(id: string): boolean {
    const original = providers.find((p) => p.id === id);
    const current = formStates[id];
    if (!current?.enabled) return false;
    if (!current.clientId.trim()) return true;
    if (!original?.hasSecret && !current.clientSecret.trim()) return true;
    return false;
  }

  async function handleSave(id: string) {
    const current = formStates[id];
    if (!current) return;

    setSavingProvider(id);
    try {
      const result = await updateOAuthProvider({
        id: id as "google" | "facebook" | "apple",
        enabled: current.enabled,
        clientId: current.clientId,
        clientSecret: current.isEditingSecret
          ? current.clientSecret
          : undefined,
      });

      if (result.success) {
        toast({
          title: "บันทึกสำเร็จ",
          description: `การตั้งค่า ${OAUTH_LABELS[id as keyof typeof OAUTH_LABELS]} ถูกบันทึกแล้ว`,
        });
        // Reset editing state
        updateField(id, "isEditingSecret", false);
        updateField(id, "clientSecret", "");
        router.refresh();
      } else {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive",
      });
    } finally {
      setSavingProvider(null);
    }
  }

  return (
    <div className="grid gap-4" data-tour="oauth-providers">
      {providers.map((provider) => {
        const state = formStates[provider.id];
        if (!state) return null;

        const Icon = PROVIDER_ICONS[provider.id];
        const dirty = isDirty(provider.id);
        const missingCreds = hasMissingCredentials(provider.id);
        const isSaving = savingProvider === provider.id;
        const credentialsSectionId = `oauth-credentials-${provider.id}`;

        return (
          <Card key={provider.id} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                {Icon && <Icon />}
                <CardTitle className="text-lg">
                  {OAUTH_LABELS[provider.id]}
                </CardTitle>
                {dirty && (
                  <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" title="มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" />
                )}
              </div>
              <Switch
                checked={state.enabled}
                onCheckedChange={(checked) =>
                  updateField(provider.id, "enabled", checked)
                }
                aria-label={`เปิดใช้งาน ${OAUTH_LABELS[provider.id]}`}
                aria-controls={credentialsSectionId}
              />
            </CardHeader>

            <CardContent id={credentialsSectionId}>
              <div className="space-y-4">
                {/* Warning for missing credentials */}
                {missingCreds && (
                  <div className="flex items-center gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>กรุณากรอก Client ID และ Secret ก่อนเปิดใช้งาน</span>
                  </div>
                )}

                {/* Client ID */}
                <div className="space-y-2">
                  <Label htmlFor={`oauth-client-id-${provider.id}`}>
                    Client ID
                  </Label>
                  <Input
                    id={`oauth-client-id-${provider.id}`}
                    type="text"
                    value={state.clientId}
                    onChange={(e) =>
                      updateField(provider.id, "clientId", e.target.value)
                    }
                    placeholder="กรอก Client ID"
                    disabled={!state.enabled}
                  />
                </div>

                {/* Client Secret */}
                <div className="space-y-2">
                  <Label htmlFor={`oauth-client-secret-${provider.id}`}>
                    Client Secret
                  </Label>

                  {state.isEditingSecret ? (
                    <div className="flex gap-2">
                      <Input
                        id={`oauth-client-secret-${provider.id}`}
                        type="password"
                        value={state.clientSecret}
                        onChange={(e) =>
                          updateField(
                            provider.id,
                            "clientSecret",
                            e.target.value
                          )
                        }
                        placeholder="กรอก Client Secret ใหม่"
                        disabled={!state.enabled}
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateField(provider.id, "isEditingSecret", false);
                          updateField(provider.id, "clientSecret", "");
                        }}
                        className="shrink-0"
                      >
                        ยกเลิก
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        id={`oauth-client-secret-${provider.id}`}
                        type="text"
                        value={provider.clientSecretMasked || "ยังไม่ได้ตั้งค่า"}
                        readOnly
                        disabled
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateField(provider.id, "isEditingSecret", true)
                        }
                        disabled={!state.enabled}
                        className="shrink-0"
                      >
                        <EyeOff className="mr-1 h-3.5 w-3.5" />
                        เปลี่ยน
                      </Button>
                    </div>
                  )}
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={() => handleSave(provider.id)}
                    disabled={isSaving || !dirty}
                    size="sm"
                  >
                    {isSaving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    บันทึก
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
