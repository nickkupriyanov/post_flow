import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { api, TOKEN_KEY } from "../api";
import { Field } from "../components/ProjectForm";

const authSchema = z.object({
  email: z.string().email("Укажите корректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов")
});
type AuthValues = z.infer<typeof authSchema>;

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const isRegister = mode === "register";
  const { register, handleSubmit, formState: { errors } } = useForm<AuthValues>({ resolver: zodResolver(authSchema) });
  const mutation = useMutation({
    mutationFn: async (values: AuthValues) => {
      if (isRegister) await api("/auth/register", { method: "POST", body: JSON.stringify(values) });
      return api<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify(values) });
    },
    onSuccess: ({ access_token }) => {
      localStorage.setItem(TOKEN_KEY, access_token);
      navigate("/projects");
    }
  });
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand large">PostFlow<span>.</span></div>
        <p className="eyebrow">Editorial studio</p>
        <h1>Ваш контент<br />обретает ритм.</h1>
        <p>Собирайте идеи, превращайте их в посты и держите публикации в спокойном порядке.</p>
      </section>
      <section className="auth-card">
        <p className="eyebrow">{isRegister ? "Начало работы" : "С возвращением"}</p>
        <h2>{isRegister ? "Создать аккаунт" : "Войти в PostFlow"}</h2>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <Field label="Email" error={errors.email?.message}><input type="email" {...register("email")} /></Field>
          <Field label="Пароль" error={errors.password?.message}><input type="password" {...register("password")} /></Field>
          {mutation.isError && <p className="form-error">Не удалось войти. Проверьте данные.</p>}
          <button type="submit" className="primary-button">{isRegister ? "Зарегистрироваться" : "Войти"}</button>
        </form>
        <p className="switch-auth">
          {isRegister ? "Уже есть аккаунт?" : "Еще нет аккаунта?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Войти" : "Создать"}</Link>
        </p>
      </section>
    </div>
  );
}
