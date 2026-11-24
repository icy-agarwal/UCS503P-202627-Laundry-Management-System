import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Btn, Card, Chip, Err, Field, H1, Mu, PhoneFrame, Row, Screen, T } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { isMock } from '../api';
import { DEMO_ACCOUNTS, DEMO_OTP } from '../api/mock';
import { errMsg } from '../lib/format';
import { homeFor } from '../lib/nav';

export default function Login() {
  const { me, sendOtp } = useAuth();
  const r = useRouter(), th = useTheme();
  const [email, setEmail] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (me) return <Redirect href={homeFor(me.role) as any} />;

  const go = async () => {
    const e = email.trim().toLowerCase();
    const mobile = !e.includes('@') && e.replace(/\D/g, '').length >= 10;
    if (!mobile && !e.endsWith('@thapar.edu')) return setErr('Use your college email (@thapar.edu), or your mobile number if you are staff.');
    setBusy(true); setErr('');
    try { const to = await sendOtp(e); r.push({ pathname: '/otp', params: { email: to } }); }
    catch (x) { setErr(errMsg(x)); }
    finally { setBusy(false); }
  };

  return (
    <PhoneFrame>
      <Screen gap={16}>
        <View style={{ marginTop: 40, gap: 6 }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: th.pr, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon name="bag" size={30} color="#fff" /></View>
          <Mu>Thapar Institute · Hostel Laundry</Mu>
          <H1>Sign in</H1>
        </View>
        <Mu>Students sign in with their college email. Staff and admins can type their mobile number. We’ll send a one-time code to the registered email.</Mu>
        <Field label="College email or staff mobile number" value={email} onChangeText={setEmail} placeholder="name@thapar.edu or 10-digit mobile" autoCapitalize="none" autoCorrect={false} inputMode="email" onSubmitEditing={go} />
        <Err>{err}</Err>
        <Btn kind="primary" label="Send OTP" onPress={go} loading={busy} />
        {isMock ? (
          <Card style={{ borderStyle: 'dashed', gap: 10 }}>
            <T w="b" size={13} mu>DEMO MODE · tap an account, then use code {DEMO_OTP}</T>
            <Row wrap start gap={8}>{DEMO_ACCOUNTS.map((a) => <Chip key={a.email} label={a.role} on={email === a.login} onPress={() => setEmail(a.login)} />)}</Row>
            <Mu style={{ fontSize: 12 }}>Any other @thapar.edu address signs in as a new student.</Mu>
          </Card>
        ) : null}
      </Screen>
    </PhoneFrame>
  );
}
