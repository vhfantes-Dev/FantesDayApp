// Marca que a conta acabou de ser criada: o RootNavigator abre /onboarding assim que a
// pilha autenticada aparecer (a tela de cadastro some quando o status vira "signedIn").
let pending = false;

export function markOnboardingPending() {
  pending = true;
}

export function clearOnboardingPending() {
  pending = false;
}

export function consumeOnboardingPending() {
  const was = pending;
  pending = false;
  return was;
}
