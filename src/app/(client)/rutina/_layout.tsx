import { Stack } from 'expo-router';

export default function RutinaLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: true, title: 'Ejercicio' }} />
    </Stack>
  );
}