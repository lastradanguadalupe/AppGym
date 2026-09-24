import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { WorkoutProvider } from '@/context/workout';

export default function ClientLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <WorkoutProvider>
      <NativeTabs
        backgroundColor={colors.background}
        indicatorColor={colors.tint}
        labelStyle={{ selected: { color: colors.tint } }}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="rutina">
          <NativeTabs.Trigger.Label>Rutina</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="dumbbell.fill" md="fitness_center" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="historial">
          <NativeTabs.Trigger.Label>Historial</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="clock.fill" md="history" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="perfil">
          <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </WorkoutProvider>
  );
}