import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

import { useAvatarUrl } from '@/api/progress';
import { colors, fonts } from '@/theme';
import type { Profile } from '@/types/db';

export function Avatar({ profile, size = 44 }: { profile: Profile | null | undefined; size?: number }) {
  const { data: url } = useAvatarUrl(profile?.avatar_url);
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.card2,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : initials ? (
        <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.36, color: colors.text }}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={colors.text2} />
      )}
    </View>
  );
}
