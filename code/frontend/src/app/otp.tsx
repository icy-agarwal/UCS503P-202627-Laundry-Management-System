import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Btn, Err, Field, H1, Mu, PhoneFrame, Screen, T } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { isMock } from '../api';
import { DEMO_OTP } from '../api/mock';
import { errMsg } from '../lib/format';
import { homeFor } from '../lib/nav';

export default function Otp() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { me, verifyOtp } = useAuth();
  const r = useRouter();
  const [code, setCode] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (me) return <Redirect href={homeFor(me.role) as any} />;
  if (!email) return <Redirect href="/login" />;

  const go = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setErr('Enter the 6-digit code.');
    setBusy(true); setErr('');
    try { await verifyOtp(email, code.trim()); r.replace('/'); }
    catch (x) { setErr(errMsg(x)); }
    finally { setBusy(false); }
  };

  return (
    <PhoneFrame>
      <Screen gap={16}>
        <View style={{ marginTop: 56, gap: 6 }}><H1>Verify OTP</H1><Mu>Code sent to {email.replace(/^(.).*(@.*)$/, '$1•••$2')}</Mu></View>
        <Field value={code} onChangeText={(t) => setCode(t.replace(/\D/g, ''))} inputMode="numeric" keyboardType="number-pad" maxLength={6} placeholder="6-digit code" autoFocus onSubmitEditing={go}
          style={{ textAlign: 'center', fontSize: 20, letterSpacing: 6 }} />
        <Err>{err}</Err>
        {isMock ? <Mu>Demo code: <T w="b">{DEMO_OTP}</T>. Any other code is rejected, as the real server would.</Mu> : null}
        <Btn kind="primary" label="Verify & Continue" onPress={go} loading={busy} />
        <Btn label="Use a different email" onPress={() => r.replace('/login')} />
      </Screen>
    </PhoneFrame>
  );
}
