import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import {
  PhoneAuthProvider,
  signInWithCredential,
  UserCredential
} from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { firebaseAppForRecaptcha, firebaseAuth } from "../services/firebase";
import { setAuthToken, verifyFirebaseLogin } from "../services/api";

type Props = {
  onAuthenticated: () => void;
};

type AuthTab = "signin" | "signup";
type OtpContext = "signin" | "signup" | null;

type SignupState = {
  fullName: string;
  fatherName: string;
  cnic: string;
  email: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone: string;
};

const otpCooldownSeconds = 60;
const phonePattern = /^\+92[0-9]{10}$/;
const cnicPattern = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialSignupState: SignupState = {
  fullName: "",
  fatherName: "",
  cnic: "",
  email: "",
  password: "",
  confirmPassword: "",
  dateOfBirth: "",
  gender: "MALE",
  phone: "+92"
};

function normalizePakPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "");
  let national = "";

  if (digits.startsWith("92")) {
    national = digits.slice(2, 12);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1, 11);
  } else {
    national = digits.slice(0, 10);
  }

  return `+92${national}`;
}

function normalizeCnicInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const p1 = digits.slice(0, 5);
  const p2 = digits.slice(5, 12);
  const p3 = digits.slice(12, 13);

  if (digits.length <= 5) return p1;
  if (digits.length <= 12) return `${p1}-${p2}`;
  return `${p1}-${p2}-${p3}`;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return { label: "Weak", width: "34%" as const };
  if (score <= 4) return { label: "Medium", width: "67%" as const };
  return { label: "Strong", width: "100%" as const };
}

function normalizeGenderLabel(gender: SignupState["gender"]) {
  if (gender === "MALE") return "Male";
  if (gender === "FEMALE") return "Female";
  return "Other";
}

export function FirebaseAuthScreen({ onAuthenticated }: Props) {
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [tab, setTab] = useState<AuthTab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPhone, setSigninPhone] = useState("+92");
  const [staySignedIn, setStaySignedIn] = useState(true);

  const [signup, setSignup] = useState<SignupState>(initialSignupState);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpContext, setOtpContext] = useState<OtpContext>(null);
  const [verificationId, setVerificationId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  const signupPhoneValid = phonePattern.test(signup.phone.trim());
  const signupCnicValid = cnicPattern.test(signup.cnic.trim());
  const signupEmailValid = emailPattern.test(signup.email.trim().toLowerCase());
  const signupPasswordsMatch =
    signup.password.length > 0 && signup.password === signup.confirmPassword;
  const strength = getPasswordStrength(signup.password);
  const signupProgressChecks = [
    signup.fullName.trim().length > 0,
    signup.fatherName.trim().length > 0,
    signupCnicValid,
    signupEmailValid,
    signup.password.length >= 8,
    signupPasswordsMatch,
    signup.dateOfBirth.length > 0,
    signup.gender.length > 0,
    signupPhoneValid
  ];
  const signupCompletion = Math.round(
    (signupProgressChecks.filter(Boolean).length / signupProgressChecks.length) * 100
  );

  useEffect(() => {
    if (otpCooldown <= 0) {
      return;
    }
    const timer = setTimeout(() => setOtpCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  function resetStatus() {
    setError("");
    setMessage("");
  }

  function updateSignup<K extends keyof SignupState>(field: K, value: SignupState[K]) {
    setSignup((prev) => ({ ...prev, [field]: value }));
  }

  function currentPhoneForOtp() {
    if (otpContext === "signup") {
      return signup.phone.trim();
    }
    return signinPhone.trim();
  }

  async function requestOtp(phone: string, context: Exclude<OtpContext, null>) {
    const provider = new PhoneAuthProvider(firebaseAuth);
    const id = await provider.verifyPhoneNumber(
      phone,
      recaptchaVerifier.current as any
    );
    setVerificationId(id);
    setOtpContext(context);
    setOtpCode("");
    setOtpCooldown(otpCooldownSeconds);
    setOtpModalVisible(true);
    setMessage("OTP sent. Enter 6-digit code.");
  }

  async function onSigninRequestOtp() {
    resetStatus();
    const phone = signinPhone.trim();
    const email = signinEmail.trim().toLowerCase();

    if (!emailPattern.test(email)) {
      setError("Valid email required.");
      return;
    }
    if (!phonePattern.test(phone)) {
      setError("Phone format +923004203035 hona chahiye.");
      return;
    }

    setLoading(true);
    try {
      await requestOtp(phone, "signin");
    } catch (err: any) {
      setError(err?.message ?? "OTP request failed.");
    } finally {
      setLoading(false);
    }
  }

  function validateSignupBeforeOtp() {
    if (!signup.fullName.trim()) return "Full Name required hai.";
    if (!signup.fatherName.trim()) return "Father Name required hai.";
    if (!signupCnicValid) return "CNIC format 00000-0000000-0 hona chahiye.";
    if (!signupEmailValid) return "Valid email required hai.";
    if (signup.password.length < 8) return "Password min 8 characters hona chahiye.";
    if (!signupPasswordsMatch) return "Password aur confirm password match nahi kar rahe.";
    if (!signup.dateOfBirth) return "Date of Birth required hai.";
    if (!signupPhoneValid) return "Phone format +923004203035 hona chahiye.";
    return "";
  }

  async function onSignupRequestOtp() {
    resetStatus();
    const validationError = validateSignupBeforeOtp();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await requestOtp(signup.phone.trim(), "signup");
    } catch (err: any) {
      setError(err?.message ?? "OTP request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (otpCooldown > 0 || !otpContext) return;
    resetStatus();
    const phone = currentPhoneForOtp();
    if (!phonePattern.test(phone)) {
      setError("Valid phone required.");
      return;
    }

    setLoading(true);
    try {
      await requestOtp(phone, otpContext);
      setMessage("OTP resent.");
    } catch (err: any) {
      setError(err?.message ?? "OTP resend failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerifyOtp() {
    resetStatus();
    if (!verificationId || !otpContext) {
      setError("Request OTP first.");
      return;
    }
    if (otpCode.trim().length !== 6) {
      setError("6-digit OTP required.");
      return;
    }

    setLoading(true);
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otpCode.trim());
      const userCredential: UserCredential = await signInWithCredential(
        firebaseAuth,
        credential
      );
      const idToken = await userCredential.user.getIdToken(true);

      if (otpContext === "signin") {
        const auth = await verifyFirebaseLogin({
          idToken,
          email: signinEmail.trim().toLowerCase()
        });
        setAuthToken(auth.accessToken);
      } else {
        const auth = await verifyFirebaseLogin({
          idToken,
          fullName: signup.fullName.trim(),
          fatherName: signup.fatherName.trim(),
          cnic: signup.cnic.trim(),
          email: signup.email.trim().toLowerCase(),
          city: "Unknown",
          dateOfBirth: signup.dateOfBirth,
          gender: signup.gender
        });
        setAuthToken(auth.accessToken);
      }

      setOtpModalVisible(false);
      onAuthenticated();
    } catch (err: any) {
      setError(err?.message ?? "OTP verify/login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseAppForRecaptcha.options}
          attemptInvisibleVerification
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Image
              source={require("../../assets/zaroratbazar-logo.jpg")}
              style={styles.heroLogo}
              resizeMode="cover"
            />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>ZARORATBAZAR VERIFIED ACCESS</Text>
            </View>
            <Text style={styles.heroTitle}>Premium Identity</Text>
            <Text style={styles.heroSubtitle}>
              Web jaisa same flow: signup details, OTP verify, phir account create ya login.
            </Text>
            <Text style={styles.heroSubtitle}>صرف اصل لوگ، اصل چیزیں</Text>
            <View style={styles.trustRow}>
              <View style={styles.trustChip}>
                <Text style={styles.trustChipText}>CNIC Lock</Text>
              </View>
              <View style={styles.trustChip}>
                <Text style={styles.trustChipText}>Device Trust</Text>
              </View>
              <View style={styles.trustChip}>
                <Text style={styles.trustChipText}>OTP Shield</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabChip, tab === "signin" ? styles.tabChipActive : null]}
              onPress={() => {
                setTab("signin");
                resetStatus();
                Keyboard.dismiss();
              }}
            >
              <Text
                style={[styles.tabChipText, tab === "signin" ? styles.tabChipTextActive : null]}
              >
                Sign In
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabChip, tab === "signup" ? styles.tabChipActive : null]}
              onPress={() => {
                setTab("signup");
                resetStatus();
                Keyboard.dismiss();
              }}
            >
              <Text
                style={[styles.tabChipText, tab === "signup" ? styles.tabChipTextActive : null]}
              >
                Create Account
              </Text>
            </Pressable>
          </View>

          {tab === "signin" ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Sign In (Email + Phone + OTP)</Text>
              <Text style={styles.panelSubtitle}>
                Email aur phone dono required hain, OTP verify ke baad login hoga.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={signinEmail}
                onChangeText={setSigninEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <TextInput
                style={styles.input}
                placeholder="+923004203035"
                value={signinPhone}
                onChangeText={(v) => setSigninPhone(normalizePakPhoneInput(v))}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchTitle}>Always signed in</Text>
                  <Text style={styles.switchHint}>Trusted device par secure session maintain rahega.</Text>
                </View>
                <Switch
                  value={staySignedIn}
                  onValueChange={setStaySignedIn}
                  trackColor={{ false: "#c7d7cf", true: "#0f8c63" }}
                  thumbColor="#ffffff"
                />
              </View>
              <Pressable
                style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                onPress={onSigninRequestOtp}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Request OTP</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Create Account</Text>
              <Text style={styles.panelSubtitle}>
                Field order web ke bilkul same: profile details se start, phir phone OTP.
              </Text>
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${signupCompletion}%` }]} />
                </View>
                <Text style={styles.progressLabel}>{signupCompletion}% complete</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={signup.fullName}
                onChangeText={(v) => updateSignup("fullName", v)}
                autoComplete="name"
                textContentType="name"
              />
              <TextInput
                style={styles.input}
                placeholder="Father Name"
                value={signup.fatherName}
                onChangeText={(v) => updateSignup("fatherName", v)}
                autoComplete="off"
              />
              <TextInput
                style={[
                  styles.input,
                  signup.cnic.length > 0 && !signupCnicValid ? styles.inputError : null
                ]}
                placeholder="CNIC (00000-0000000-0)"
                value={signup.cnic}
                onChangeText={(v) => updateSignup("cnic", normalizeCnicInput(v))}
                keyboardType="number-pad"
                autoComplete="off"
              />
              <TextInput
                style={[
                  styles.input,
                  signup.email.length > 0 && !signupEmailValid ? styles.inputError : null
                ]}
                placeholder="Email"
                value={signup.email}
                onChangeText={(v) => updateSignup("email", v)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={signup.password}
                onChangeText={(v) => updateSignup("password", v)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <View style={styles.strengthWrap}>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: strength.width }]} />
                </View>
                <Text style={styles.helperText}>Password strength: {strength.label}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  signup.confirmPassword.length > 0 && !signupPasswordsMatch
                    ? styles.inputError
                    : null
                ]}
                placeholder="Confirm Password"
                value={signup.confirmPassword}
                onChangeText={(v) => updateSignup("confirmPassword", v)}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (YYYY-MM-DD)"
                value={signup.dateOfBirth}
                onChangeText={(v) => updateSignup("dateOfBirth", v)}
                autoCapitalize="none"
              />
              <View style={styles.genderRow}>
                {(["MALE", "FEMALE", "OTHER"] as const).map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.genderChip, signup.gender === g ? styles.genderChipActive : null]}
                    onPress={() => updateSignup("gender", g)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        signup.gender === g ? styles.genderChipTextActive : null
                      ]}
                    >
                      {normalizeGenderLabel(g)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[
                  styles.input,
                  signup.phone.length > 0 && !signupPhoneValid ? styles.inputError : null
                ]}
                placeholder="+923004203035"
                value={signup.phone}
                onChangeText={(v) => updateSignup("phone", normalizePakPhoneInput(v))}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
              />
              <Pressable
                style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                onPress={onSignupRequestOtp}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Create Account (Send OTP)</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.featurePanel}>
            <Text style={styles.featureTitle}>Professional Features</Text>
            <Text style={styles.featureItem}>1. Smart format guard: phone + CNIC auto-normalize.</Text>
            <Text style={styles.featureItem}>2. Live completion meter: faster form completion.</Text>
            <Text style={styles.featureItem}>3. Secure session toggle: trusted-device sign-in behavior.</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {loading ? <ActivityIndicator style={styles.loader} color="#0f8c63" /> : null}
        </ScrollView>

        <Modal transparent visible={otpModalVisible} animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>OTP Verification</Text>
              <Text style={styles.modalSubtitle}>
                6-digit OTP enter karein. OTP verify hote hi {otpContext === "signup" ? "account create" : "login"} hoga.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit OTP"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={[
                    styles.secondaryButton,
                    otpCooldown > 0 || loading ? styles.buttonDisabled : null
                  ]}
                  onPress={onResendOtp}
                  disabled={otpCooldown > 0 || loading}
                >
                  <Text style={styles.secondaryButtonText}>
                    {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : "Resend OTP"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                  onPress={onVerifyOtp}
                  disabled={loading}
                >
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                </Pressable>
              </View>
              <Pressable style={styles.closeLink} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.closeLinkText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eaf1ee"
  },
  screen: {
    flex: 1,
    backgroundColor: "#eaf1ee"
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 34
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "#0f221b",
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 10
  },
  heroLogo: {
    width: 54,
    height: 54,
    borderRadius: 16,
    marginBottom: 8
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#194335",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  heroBadgeText: {
    color: "#9fd8c1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  heroTitle: {
    marginTop: 6,
    color: "#f3fdf8",
    fontSize: 30,
    fontWeight: "800"
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#c9e5da",
    fontSize: 14,
    lineHeight: 20
  },
  trustRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 8
  },
  trustChip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#2a5949",
    backgroundColor: "rgba(33, 80, 64, 0.42)"
  },
  trustChipText: {
    fontSize: 12,
    color: "#d8efe6",
    fontWeight: "700"
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 14
  },
  tabChip: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#dde9e3",
    paddingVertical: 11,
    alignItems: "center"
  },
  tabChipActive: {
    backgroundColor: "#0f8c63"
  },
  tabChipText: {
    color: "#335147",
    fontWeight: "700",
    fontSize: 13
  },
  tabChipTextActive: {
    color: "#ffffff"
  },
  panel: {
    backgroundColor: "#fdfefe",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d6e4de",
    padding: 16,
    gap: 10,
    shadowColor: "#10241d",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a2f27",
    marginBottom: 2
  },
  panelSubtitle: {
    color: "#5b6e66",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6
  },
  progressWrap: {
    gap: 5,
    marginBottom: 6
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e7efeb",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f8c63"
  },
  progressLabel: {
    color: "#5f746b",
    fontSize: 12,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0ddd7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#193129",
    backgroundColor: "#fbfdfc"
  },
  inputError: {
    borderColor: "#d64565",
    backgroundColor: "#fff5f7"
  },
  strengthWrap: {
    gap: 5
  },
  strengthTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e7efeb",
    overflow: "hidden"
  },
  strengthFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#0f8c63"
  },
  helperText: {
    color: "#62746c",
    fontSize: 12,
    fontWeight: "600"
  },
  switchRow: {
    borderWidth: 1,
    borderColor: "#d4e3dd",
    backgroundColor: "#f4faf7",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  switchCopy: {
    flex: 1,
    gap: 2
  },
  switchTitle: {
    color: "#1a2f27",
    fontWeight: "700",
    fontSize: 14
  },
  switchHint: {
    color: "#5f746b",
    fontSize: 12
  },
  genderRow: {
    flexDirection: "row",
    gap: 8
  },
  genderChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cfe0d8",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f6fbf8"
  },
  genderChipActive: {
    borderColor: "#0f8c63",
    backgroundColor: "#e6f5ef"
  },
  genderChipText: {
    color: "#36564b",
    fontWeight: "700",
    fontSize: 12
  },
  genderChipTextActive: {
    color: "#0f6f50"
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0f8c63"
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: "center",
    backgroundColor: "#edf5f1",
    borderWidth: 1,
    borderColor: "#d5e5de"
  },
  secondaryButtonText: {
    color: "#275748",
    fontWeight: "700",
    fontSize: 13
  },
  buttonDisabled: {
    opacity: 0.6
  },
  errorText: {
    color: "#c03653",
    fontWeight: "700",
    fontSize: 13
  },
  successText: {
    color: "#0f7f58",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 12
  },
  loader: {
    marginTop: 8
  },
  featurePanel: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d5e4de",
    backgroundColor: "#f8fcfa",
    padding: 14,
    gap: 6
  },
  featureTitle: {
    fontSize: 16,
    color: "#1b3028",
    fontWeight: "800"
  },
  featureItem: {
    color: "#36584d",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(14, 20, 18, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#dbe7e2"
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1b3028"
  },
  modalSubtitle: {
    color: "#5a6d65",
    fontSize: 13,
    lineHeight: 19
  },
  modalActions: {
    gap: 8
  },
  closeLink: {
    paddingVertical: 6,
    alignItems: "center"
  },
  closeLinkText: {
    color: "#476d60",
    fontWeight: "700"
  }
});
