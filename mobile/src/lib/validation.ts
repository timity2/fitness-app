import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Введите email').email('Некорректный email');

export const passwordSchema = z
  .string()
  .min(8, 'Минимум 8 символов')
  .max(72, 'Не более 72 символов')
  .regex(/[A-Za-zА-Яа-яЁё]/, 'Добавьте хотя бы одну букву')
  .regex(/\d/, 'Добавьте хотя бы одну цифру');

export const nameSchema = (label: string) =>
  z.string().trim().min(1, `Введите ${label}`).max(60, 'Не более 60 символов');

export const signUpSchema = z
  .object({
    first_name: nameSchema('имя'),
    last_name: nameSchema('фамилию'),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string().min(1, 'Повторите пароль'),
    terms: z.boolean().refine((v) => v, 'Необходимо принять условия'),
  })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Пароли не совпадают' });
export type SignUpForm = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Введите пароль') });
export type SignInForm = z.infer<typeof signInSchema>;

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string().min(1, 'Повторите пароль') })
  .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Пароли не совпадают' });
export type NewPasswordForm = z.infer<typeof newPasswordSchema>;

/** Число из текстового поля в заданных границах; пустая строка допустима, если optional */
export const numberField = (min: number, max: number, message: string, optional = false) =>
  z.string().refine((s) => {
    const t = s.trim().replace(',', '.');
    if (t === '') return optional;
    const n = Number(t);
    return !Number.isNaN(n) && n >= min && n <= max;
  }, message);

/** Дата в формате ДД.ММ.ГГГГ → YYYY-MM-DD, либо null, если строка некорректна */
export function parseRuDate(s: string): string | null {
  const m = /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const toRuDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};

/** Автоподстановка точек при вводе даты: 01021990 → 01.02.1990 */
export const maskRuDate = (s: string) => {
  const digits = s.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('.');
};
