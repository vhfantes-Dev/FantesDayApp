import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/Icon';
import { colors, fonts } from '@/theme';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Hoje', icon: 'home' },
  tarefas: { label: 'Tarefas', icon: 'tasks' },
  nutricao: { label: 'Nutrição', icon: 'apple' },
  treinos: { label: 'Treinos', icon: 'dumbbell' },
};

// Barra inferior do design: 84 px, 4 abas, ativa na cor de acento.
function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 64 + Math.max(insets.bottom, 20), paddingBottom: Math.max(insets.bottom, 20) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.accent : colors.textMuted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.label}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <Icon name={tab.icon} size={24} color={color} />
            <Text style={[styles.label, { color, fontFamily: focused ? fonts.bold : fonts.semibold }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tarefas" />
      <Tabs.Screen name="nutricao" />
      <Tabs.Screen name="treinos" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontSize: 11 },
});
