import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Btn, Card, Err, Field, Mu, PhoneFrame, Row, Screen, T } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { isMock } from '../api';
import { DEMO_ACCOUNTS, DEMO_OTP } from '../api/mock';
import { errMsg } from '../lib/format';
import { homeFor } from '../lib/nav';

type Who = 'student' | 'staff';

/** Turns Supabase's "request this after 16 seconds" into something friendlier. */
const friendly = (m: string) => {
  const s = m.match(/after (\d+) seconds?/i);
  return s ? `Please wait ${s[1]} seconds before requesting another code.` : m;
};

export default function Login() {
  const { me, sendOtp } = useAuth();
  const r = useRouter(), th = useTheme();
  const [who, setWho] = useState<Who>('student');
  const [value, setValue] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  if (me) return <Redirect href={homeFor(me.role) as any} />;

  const pick = (w: Who) => { setWho(w); setValue(''); setErr(''); };
  const go = async () => {
    const v = value.trim().toLowerCase();
    if (who === 'student' && !v.endsWith('@thapar.edu')) return setErr('Enter your @thapar.edu email address.');
    if (who === 'staff' && v.replace(/\D/g, '').length < 10) return setErr('Enter your 10-digit mobile number.');
    setBusy(true); setErr('');
    try { const to = await sendOtp(v); r.push({ pathname: '/otp', params: { email: to } }); }
    catch (x) { setErr(friendly(errMsg(x))); }
    finally { setBusy(false); }
  };

  const tab = (w: Who, label: string) => (
    <Pressable key={w} accessibilityRole="tab" onPress={() => pick(w)} style={{
      flex: 1, minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
      backgroundColor: who === w ? th.card : 'transparent', borderWidth: who === w ? 1 : 0, borderColor: th.bd,
    }}>
      <T w="b" size={14} color={who === w ? th.tx : th.mu}>{label}</T>
    </Pressable>
  );

  return (
    <PhoneFrame>
      <Screen gap={22}>
        <View style={{ alignItems: 'center', marginTop: 56, gap: 10 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: th.pr, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bag" size={34} color="#fff" />
          </View>
          <T w="x" size={28} style={{ marginTop: 4 }}>Hostel Laundry</T>
          <Mu>Thapar Institute of Engineering &amp; Technology</Mu>
        </View>

        <Card pad={20} style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <T w="x" size={20}>Welcome back</T>
            <Mu>Sign in to continue</Mu>
          </View>

          <View style={{ flexDirection: 'row', backgroundColor: th.off, borderRadius: 14, padding: 4, gap: 4 }}>
            {tab('student', 'Student')}
            {tab('staff', 'Staff / Admin')}
          </View>

          {who === 'student' ? (
            <Field label="College email" value={value} onChangeText={setValue} placeholder="name@thapar.edu" autoCapitalize="none" autoCorrect={false} inputMode="email" keyboardType="email-address" onSubmitEditing={go} />
          ) : (
            <Field label="Mobile number" value={value} onChangeText={(t) => setValue(t.replace(/[^\d+ ]/g, ''))} placeholder="10-digit mobile number" inputMode="numeric" keyboardType="phone-pad" maxLength={14} onSubmitEditing={go} />
          )}
          <Err>{err}</Err>
          <Btn kind="primary" label="Send code" onPress={go} loading={busy} />
          <Mu style={{ fontSize: 12, textAlign: 'center' }}>A 6-digit code will be sent to your registered email.</Mu>
        </Card>

        {isMock ? (
          <Card style={{ borderStyle: 'dashed', gap: 10 }}>
            <T w="b" size={12} mu>DEMO MODE · use code {DEMO_OTP}</T>
            <Row wrap start gap={8}>
              {DEMO_ACCOUNTS.map((a) => (
                <Pressable key={a.email} onPress={() => { setWho(a.role === 'Student' ? 'student' : 'staff'); setValue(a.login); setErr(''); }}
                  style={{ paddingHorizontal: 14, minHeight: 36, borderRadius: 99, borderWidth: 1, borderColor: th.bd, justifyContent: 'center' }}>
                  <T w="b" size={13}>{a.role}</T>
                </Pressable>
              ))}
            </Row>
          </Card>
        ) : null}
      </Screen>
    </PhoneFrame>
  );
}
