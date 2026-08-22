import { Redirect } from 'expo-router';

/** Password reset is retired — members sign in with email OTP. */
export default function ForgotPasswordRedirect() {
  return <Redirect href="/login" />;
}
