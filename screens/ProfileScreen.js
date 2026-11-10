
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from '../constants/theme';

import Header from '../components/Header';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import useUserStore from '../store/useUserStore';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const name = user?.name || 'ATHLETE';
  const email = user?.email || 'No email';
  const initial = name.charAt(0).toUpperCase();

  const confirmLogout = () => {
    Alert.alert(
      'LOG OUT',
      'Are you sure you want to log out?',
      [
        {
          text: 'CANCEL',
          style: 'cancel',
        },
        {
          text: 'LOG OUT',
          style: 'destructive',
          onPress: () => {
            logout();

            navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="PROFILE"
        subtitle="YOUR FITNESS IDENTITY"
      />

      <View style={styles.intro}>
        <View style={styles.sectionLabel}>
          <View style={styles.labelLine} />
          <Text style={styles.eyebrow}>MEMBER AREA</Text>
        </View>

        <Text style={styles.heading}>
          YOUR
          <Text style={styles.headingAccent}> PROFILE.</Text>
        </Text>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.profileTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>

          <View style={styles.memberInfo}>
            <Text style={styles.memberLabel}>FITNESS MEMBER</Text>
            <Text style={styles.memberStatus}>ACTIVE ATHLETE</Text>
          </View>

          <View style={styles.statusDot} />
        </View>

        <View style={styles.profileDivider} />

        <Text style={styles.name}>{name.toUpperCase()}</Text>
        <Text style={styles.email}>{email}</Text>

        <View style={styles.badgeContainer}>
          <Badge title="FITNESS MEMBER" />
        </View>

        <View style={styles.memberFooter}>
          <Text style={styles.footerLabel}>MEMBER ID</Text>
          <Text style={styles.footerValue}>
            #{user?.id || 'FIT-0001'}
          </Text>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionLabel}>
            <View style={styles.labelLine} />
            <Text style={styles.eyebrow}>STAY FOCUSED</Text>
          </View>

          <Text style={styles.sectionTitle}>YOUR GOALS</Text>
        </View>

        <Text style={styles.sectionNumber}>01</Text>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.goalItem}>
          <View style={styles.goalIcon}>
            <Text style={styles.goalIconText}>↗</Text>
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.infoLabel}>MAIN GOAL</Text>
            <Text style={styles.infoValue}>
              {user?.goal || 'NOT SET'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.goalItem}>
          <View style={styles.goalIcon}>
            <Text style={styles.goalIconText}>◷</Text>
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.infoLabel}>WEEKLY TARGET</Text>
            <Text style={styles.infoValue}>
              {user?.weeklyTarget ?? 0} WORKOUTS
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.goalItem}>
          <View style={styles.goalIcon}>
            <Text style={styles.goalIconText}>✦</Text>
          </View>

          <View style={styles.goalInfo}>
            <Text style={styles.infoLabel}>FITNESS LEVEL</Text>
            <Text style={styles.infoValue}>
              {user?.fitnessLevel || 'NOT SET'}
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionLabel}>
            <View style={styles.labelLine} />
            <Text style={styles.eyebrow}>APP PREFERENCES</Text>
          </View>

          <Text style={styles.sectionTitle}>SETTINGS</Text>
        </View>

        <Text style={styles.sectionNumber}>02</Text>
      </View>

      <Card style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>◎</Text>
          </View>

          <Text style={styles.setting}>Personal information</Text>
          <Text style={styles.settingArrow}>›</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>⌁</Text>
          </View>

          <Text style={styles.setting}>Training preferences</Text>
          <Text style={styles.settingArrow}>›</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>♧</Text>
          </View>

          <Text style={styles.setting}>Notifications</Text>
          <Text style={styles.settingArrow}>›</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Text style={styles.settingIconText}>◇</Text>
          </View>

          <Text style={styles.setting}>Privacy and security</Text>
          <Text style={styles.settingArrow}>›</Text>
        </View>
      </Card>

      <View style={styles.logoutContainer}>
        <Button
          title="LOG OUT"
          variant="secondary"
          onPress={confirmLogout}
        />

        <Text style={styles.version}>FITNESS APP • VERSION 1.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  intro: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  labelLine: {
    width: 22,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heading: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.display,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginTop: SPACING.md,
  },
  headingAccent: {
    color: COLORS.primary,
  },
  profileCard: {
    padding: SPACING.lg,
    backgroundColor: '#18221A',
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#293B26',
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '900',
  },
  memberInfo: {
    flex: 1,
    gap: 5,
  },
  memberLabel: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  memberStatus: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  profileDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  name: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 1,
  },
  email: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.body,
    marginTop: 5,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
  },
  memberFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.lg,
  },
  footerLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerValue: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: SPACING.sm,
  },
  sectionNumber: {
    color: '#465148',
    fontSize: 20,
    fontWeight: '900',
  },
  infoCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  goalIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#263322',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconText: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  goalInfo: {
    flex: 1,
    gap: 5,
  },
  infoLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  settingsCard: {
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 35,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#263322',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconText: {
    color: COLORS.primary,
    fontSize: 19,
    fontWeight: '800',
  },
  setting: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    flex: 1,
  },
  settingArrow: {
    color: COLORS.muted,
    fontSize: 25,
    fontWeight: '400',
  },
  logoutContainer: {
    marginTop: SPACING.xl,
  },
  version: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
