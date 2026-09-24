import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Mis alumnos' }} />
      <Stack.Screen name="alumno/[id]" options={{ title: 'Alumno' }} />
      <Stack.Screen name="ejercicios" options={{ title: 'Ejercicios' }} />
      <Stack.Screen name="contenido" options={{ title: 'Contenido' }} />
    </Stack>
  );
}