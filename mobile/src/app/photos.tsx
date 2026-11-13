// Фотографии прогресса: добавление с датой, история, сравнение двух снимков.
// Файлы хранятся в приватном бакете Supabase Storage и показываются по подписанным ссылкам.
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAddPhoto, useDeletePhoto, usePhotos, type PhotoWithUrl } from '@/api/progress';
import { Button, confirm, EmptyState, ErrorState, ErrorText, Header, IconButton, InfoBox, Input, Loading, notify, Screen, Sheet, T } from '@/components/ui';
import { formatDate, toISODate } from '@/lib/format';
import { humanError, isDemo } from '@/lib/supabase';
import { maskRuDate, parseRuDate, toRuDate } from '@/lib/validation';
import { colors, radius, space } from '@/theme';

export default function Photos() {
  const photos = usePhotos();
  const add = useAddPhoto();
  const remove = useDeletePhoto();
  const [draft, setDraft] = useState<{ uri: string; date: string; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [viewer, setViewer] = useState<PhotoWithUrl | null>(null);

  const pick = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return notify('Нет доступа к камере', 'Разрешите доступ в настройках устройства.');
      }
      const result = await (fromCamera
        ? ImagePicker.launchCameraAsync({ quality: 0.7 })
        : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }));
      if (!result.canceled && result.assets[0]) {
        setError(null);
        setDraft({ uri: result.assets[0].uri, date: toRuDate(toISODate()), note: '' });
      }
    } catch (e) {
      notify('Не удалось выбрать фото', humanError(e));
    }
  };

  const save = () => {
    if (!draft) return;
    const iso = parseRuDate(draft.date);
    if (!iso || iso > toISODate()) return setError('Укажите дату не позже сегодняшней в формате ДД.ММ.ГГГГ');
    add.mutate({ uri: draft.uri, takenOn: iso, note: draft.note.trim() }, { onSuccess: () => setDraft(null), onError: (e) => setError(humanError(e)) });
  };

  const togglePick = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : [p[1], id]));

  const list = photos.data ?? [];
  const pair = picked.map((id) => list.find((p) => p.id === id)).filter((p): p is PhotoWithUrl => !!p).sort((a, b) => a.taken_on.localeCompare(b.taken_on));

  return (
    <Screen
      header={
        <Header
          title="Фото прогресса"
          right={
            list.length >= 2 ? (
              <IconButton
                icon="git-compare-outline"
                label="Сравнить фотографии"
                color={compare ? colors.pink : colors.text}
                onPress={() => {
                  setCompare(!compare);
                  setPicked([]);
                }}
              />
            ) : undefined
          }
        />
      }
      footer={
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Button title="Галерея" icon="images-outline" variant="secondary" style={{ flex: 1 }} onPress={() => pick(false)} />
          <Button title="Камера" icon="camera-outline" style={{ flex: 1 }} onPress={() => pick(true)} />
        </View>
      }
      edges={['top', 'bottom']}
    >
      {isDemo ? (
        <View style={{ marginBottom: space.md }}>
          <InfoBox icon="lock-closed-outline">Демо-режим: фотографии не загружаются на сервер и остаются на устройстве.</InfoBox>
        </View>
      ) : null}

      {compare ? (
        <View style={{ marginBottom: space.lg }}>
          <T v="caption" style={{ marginBottom: space.md }}>
            Выберите две фотографии для сравнения
          </T>
          {pair.length === 2 ? (
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              {pair.map((p, i) => (
                <View key={p.id} style={{ flex: 1 }}>
                  <Image source={{ uri: p.url ?? undefined }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.card }} contentFit="cover" />
                  <T v="small" center style={{ marginTop: 6 }} color={colors.text2}>
                    {i === 0 ? 'До' : 'После'} · {formatDate(p.taken_on)}
                  </T>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {photos.isPending ? (
        <Loading />
      ) : photos.isError ? (
        <ErrorState onRetry={() => photos.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState icon="images-outline" title="Фотографий пока нет" text="Добавьте первый снимок — позже вы сможете сравнить его с новыми. Фото видны только вам." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
          {list.map((p) => {
            const selected = picked.includes(p.id);
            return (
              <Pressable key={p.id} style={{ width: '33.33%', padding: 4 }} onPress={() => (compare ? togglePick(p.id) : setViewer(p))} accessibilityLabel={`Фото от ${formatDate(p.taken_on)}`}>
                <Image
                  source={{ uri: p.url ?? undefined }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: selected ? 2 : 0, borderColor: colors.pink }}
                  contentFit="cover"
                  transition={150}
                />
                <T v="small" center style={{ marginTop: 4 }}>
                  {formatDate(p.taken_on, false)}
                </T>
                {selected ? (
                  <View style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="checkmark" size={14} color={colors.text} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Sheet visible={!!draft} onClose={() => setDraft(null)} title="Новая фотография">
        {draft ? (
          <>
            <Image source={{ uri: draft.uri }} style={{ width: '100%', height: 260, borderRadius: radius.md, backgroundColor: colors.card, marginBottom: space.lg }} contentFit="contain" />
            <ErrorText>{error}</ErrorText>
            <Input label="Дата снимка" placeholder="ДД.ММ.ГГГГ" keyboardType="number-pad" value={draft.date} onChangeText={(t) => setDraft({ ...draft, date: maskRuDate(t) })} maxLength={10} />
            <Input label="Заметка (необязательно)" placeholder="Например: утро, натощак" value={draft.note} onChangeText={(t) => setDraft({ ...draft, note: t })} maxLength={300} />
            <Button title="Сохранить" onPress={save} loading={add.isPending} />
          </>
        ) : null}
      </Sheet>

      <Sheet visible={!!viewer} onClose={() => setViewer(null)} title={viewer ? formatDate(viewer.taken_on) : ''}>
        {viewer ? (
          <>
            <Image source={{ uri: viewer.url ?? undefined }} style={{ width: '100%', height: 420, borderRadius: radius.md, backgroundColor: colors.card }} contentFit="contain" />
            {viewer.note ? (
              <T v="body" color={colors.text2} style={{ marginTop: space.md }}>
                {viewer.note}
              </T>
            ) : null}
            <Button
              title="Удалить фотографию"
              variant="danger"
              style={{ marginTop: space.lg }}
              onPress={() => confirm('Удалить фотографию?', 'Снимок будет удалён без возможности восстановления.', () => remove.mutate(viewer, { onSuccess: () => setViewer(null) }), 'Удалить', true)}
            />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
