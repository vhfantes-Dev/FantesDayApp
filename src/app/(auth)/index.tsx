import { Redirect } from 'expo-router';

// Entrada do grupo (auth): o guard da raiz manda para cá quando não há sessão.
export default function AuthIndex() {
  return <Redirect href="/login" />;
}
