"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { login, navigateAfterAuth } from "@/lib/auth";
import { describeAuthError } from "./form-error";

export interface LoginFormProps {
  next?: string | null;
}

export function LoginForm({ next }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function focusField(field: string | undefined): void {
    if (field === "username") usernameRef.current?.focus();
    if (field === "password") passwordRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;

    setErrors({});
    setFormError(null);

    const normalizedUsername = username.normalize("NFC").trim();
    const clientErrors: Record<string, string> = {};
    if (!normalizedUsername) clientErrors.username = "Kullanıcı adı gerekli.";
    if (!password) clientErrors.password = "Şifre gerekli.";

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      focusField(clientErrors.username ? "username" : "password");
      return;
    }

    setPending(true);
    try {
      const user = await login({ username: normalizedUsername, password });
      navigateAfterAuth(user, next);
    } catch (error) {
      const failure = describeAuthError(error);
      if (failure.field === "username" || failure.field === "password") {
        setErrors({ [failure.field]: failure.message });
        focusField(failure.field);
      } else {
        setFormError(failure.message);
        if (failure.code === "INVALID_CREDENTIALS") focusField("password");
      }
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      <Input
        autoCapitalize="none"
        autoComplete="username"
        error={errors.username}
        id="login-username"
        label="Kullanıcı adı"
        name="username"
        onChange={(event) => setUsername(event.target.value)}
        ref={usernameRef}
        required
        spellCheck={false}
        value={username}
      />

      <Input
        autoComplete="current-password"
        endAdornment={
          <button
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={showPassword}
            className="rounded-md px-2 py-1 text-xs font-medium text-[color:var(--muted)] hover:bg-[color:var(--elevated)] hover:text-[color:var(--text)]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? "Gizle" : "Göster"}
          </button>
        }
        error={errors.password}
        id="login-password"
        label="Şifre"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        ref={passwordRef}
        required
        type={showPassword ? "text" : "password"}
        value={password}
      />

      {formError ? (
        <p
          className="rounded-lg border border-[color:var(--danger)] bg-[color:var(--danger-soft)] px-3 py-2 text-sm leading-5 text-[color:var(--danger-text)]"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <Button className="w-full" loading={pending} type="submit">
        Giriş yap
      </Button>
    </form>
  );
}
