import React from 'react';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';
import type { TextInputProps } from 'react-native';

import { Input } from '@/components/ui';

/** Поле формы: связывает Input с React Hook Form и показывает ошибку валидации. */
export function Field<F extends FieldValues>({
  control,
  name,
  ...input
}: {
  control: Control<F>;
  name: FieldPath<F>;
  label?: string;
  suffix?: string;
  password?: boolean;
} & TextInputProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <Input {...input} value={value == null ? '' : String(value)} onChangeText={onChange} onBlur={onBlur} error={error?.message} />
      )}
    />
  );
}
