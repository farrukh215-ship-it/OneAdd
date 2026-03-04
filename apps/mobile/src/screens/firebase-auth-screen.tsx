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
  Text,
  TextInput,
  View
} from "react-native";
import { PhoneAuthProvider, signInWithCredential } from "firebase/auth";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { firebaseAppForRecaptcha, firebaseAuth } from "../services/firebase";
import {
  confirmPasswordReset,
  loginWithPassword,
  requestPasswordReset,
  setAuthToken,
  verifyFirebaseLogin,
  verifyPasswordReset
} from "../services/api";

type Props = {
  onAuthenticated: () => void;
  initialTab?: AuthTab;
};

type AuthTab = "signin" | "signup";
type OtpContext = "signup" | "reset" | null;

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

function isLessThan18(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age < 18;
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

export function FirebaseAuthScreen({ onAuthenticated, initialTab = "signin" }: Props) {
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const [tab, setTab] = useState<AuthTab>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("+92");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState<"request" | "password">("request");

  const [signup, setSignup] = useState<SignupState>(initialSignupState);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpContext, setOtpContext] = useState<OtpContext>(null);
  const [verificationId, setVerificationId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

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

  async function onSignin() {
    resetStatus();
    const email = signinEmail.trim().toLowerCase();
    if (!emailPattern.test(email)) {
      setError("Valid email required.");
      return;
    }
    if (signinPassword.length < 8) {
      setError("Password kam az kam 8 characters ka hona chahiye.");
      return;
    }

    setLoading(true);
    try {
      const auth = await loginWithPassword({
        email,
        password: signinPassword
      });
      await setAuthToken(auth.accessToken);
      onAuthenticated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed.");
      }
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
    if (isLessThan18(signup.dateOfBirth)) {
      return "Age less than 18 ka account nahi ban sakta. Ask your mama papa to create account.";
    }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResetRequestOtp() {
    resetStatus();
    const email = resetEmail.trim().toLowerCase();
    const phone = resetPhone.trim();

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
      await requestPasswordReset({ email, phone });
      await requestOtp(phone, "reset");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Reset OTP request failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResendOtp() {
    if (otpCooldown > 0 || !otpContext) return;
    resetStatus();

    const phone = otpContext === "signup" ? signup.phone.trim() : resetPhone.trim();
    if (!phonePattern.test(phone)) {
      setError("Valid phone required.");
      return;
    }

    setLoading(true);
    try {
      await requestOtp(phone, otpContext);
      setMessage("OTP resent.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP resend failed.");
      }
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
      const userCredential = await signInWithCredential(firebaseAuth, credential);
      const idToken = await userCredential.user.getIdToken(true);

      if (otpContext === "signup") {
        const auth = await verifyFirebaseLogin({
          idToken,
          fullName: signup.fullName.trim(),
          fatherName: signup.fatherName.trim(),
          cnic: signup.cnic.trim(),
          email: signup.email.trim().toLowerCase(),
          password: signup.password,
          city: "Unknown",
          dateOfBirth: signup.dateOfBirth,
          gender: signup.gender
        });
        await setAuthToken(auth.accessToken);
        setOtpModalVisible(false);
        onAuthenticated();
      } else {
        const verification = await verifyPasswordReset({
          email: resetEmail.trim().toLowerCase(),
          phone: resetPhone.trim(),
          idToken
        });
        setResetToken(verification.resetToken);
        setResetStep("password");
        setOtpModalVisible(false);
        setForgotOpen(true);
        setMessage("OTP verified. Ab new password set karein.");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("OTP verify failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmResetPassword() {
    resetStatus();
    if (resetNewPassword.length < 8) {
      setError("Password min 8 characters hona chahiye.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setError("Password aur confirm password match nahi kar rahe.");
      return;
    }
    if (!resetToken) {
      setError("Reset session expire ho gayi. Dobara OTP verify karein.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        resetToken,
        newPassword: resetNewPassword
      });
      setForgotOpen(false);
      setResetStep("request");
      setResetToken("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setMessage("Password reset ho gaya. Ab email/password se login karein.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Password reset failed.");
      }
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
              source={require("../../assets/TGMG-logo.jpg")}
              style={styles.heroLogo}
              resizeMode="cover"
            />
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>TGMG VERIFIED ACCESS</Text>
            </View>
            <Text style={styles.heroTitle}>TGMG mein Khush Aamdeed</Text>
            <Text style={styles.heroSubtitle}>
              Email/password login. Signup aur password reset phone OTP se secure hain.
            </Text>
            <Text style={styles.heroSubtitle}>Tera Dil Ka Saaman - Mere Ghar Ka Hissa</Text>
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
              <Text style={[styles.tabChipText, tab === "signin" ? styles.tabChipTextActive : null]}>
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
              <Text style={[styles.tabChipText, tab === "signup" ? styles.tabChipTextActive : null]}>
                Create Account
              </Text>
            </Pressable>
          </View>

          {tab === "signin" ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Sign In (Email + Password)</Text>
              <Text style={styles.panelSubtitle}>
                Ek dafa login ke baad app restart par bhi session active rahega.
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
                placeholder="Password"
                value={signinPassword}
                onChangeText={setSigninPassword}
                autoCapitalize="none"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
              />
              <Pressable
                style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                onPress={onSignin}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>Login</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, loading ? styles.buttonDisabled : null]}
                onPress={() => {
                  setForgotOpen((prev) => !prev);
                  resetStatus();
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  {forgotOpen ? "Close Forgot Password" : "Forgot Password"}
                </Text>
              </Pressable>

              {forgotOpen ? (
                <View style={styles.panelNested}>
                  <Text style={styles.panelSubtitle}>Phone OTP se password reset karein.</Text>

                  {resetStep === "request" ? (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="Account Email"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="+923004203035"
                        value={resetPhone}
                        onChangeText={(v) => setResetPhone(normalizePakPhoneInput(v))}
                        keyboardType="phone-pad"
                      />
                      <Pressable
                        style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                        onPress={onResetRequestOtp}
                        disabled={loading}
                      >
                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        value={resetNewPassword}
                        onChangeText={setResetNewPassword}
                        secureTextEntry
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        value={resetConfirmPassword}
                        onChangeText={setResetConfirmPassword}
                        secureTextEntry
                      />
                      <Pressable
                        style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
                        onPress={onConfirmResetPassword}
                        disabled={loading}
                      >
                        <Text style={styles.primaryButtonText}>Set New Password</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Create Account</Text>
              <Text style={styles.panelSubtitle}>
                Signup ke liye phone OTP required hai. CNIC auto-format apply hoga.
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
              />
              <TextInput
                style={styles.input}
                placeholder="Father Name"
                value={signup.fatherName}
                onChangeText={(v) => updateSignup("fatherName", v)}
              />
              <TextInput
                style={[styles.input, signup.cnic.length > 0 && !signupCnicValid ? styles.inputError : null]}
                placeholder="CNIC (00000-0000000-0)"
                value={signup.cnic}
                onChangeText={(v) => updateSignup("cnic", normalizeCnicInput(v))}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, signup.email.length > 0 && !signupEmailValid ? styles.inputError : null]}
                placeholder="Email"
                value={signup.email}
                onChangeText={(v) => updateSignup("email", v)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={signup.password}
                onChangeText={(v) => updateSignup("password", v)}
                secureTextEntry
              />
              <View style={styles.strengthWrap}>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: strength.width }]} />
                </View>
                <Text style={styles.helperText}>Password strength: {strength.label}</Text>
              </View>
              <TextInput
                style={[styles.input, signup.confirmPassword.length > 0 && !signupPasswordsMatch ? styles.inputError : null]}
                placeholder="Confirm Password"
                value={signup.confirmPassword}
                onChangeText={(v) => updateSignup("confirmPassword", v)}
                secureTextEntry
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
                    <Text style={[styles.genderChipText, signup.gender === g ? styles.genderChipTextActive : null]}>
                      {normalizeGenderLabel(g)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, signup.phone.length > 0 && !signupPhoneValid ? styles.inputError : null]}
                placeholder="+923004203035"
                value={signup.phone}
                onChangeText={(v) => updateSignup("phone", normalizePakPhoneInput(v))}
                keyboardType="phone-pad"
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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {message ? <Text style={styles.successText}>{message}</Text> : null}
          {loading ? <ActivityIndicator style={styles.loader} color="#C8603A" /> : null}
        </ScrollView>

        <Modal transparent visible={otpModalVisible} animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>OTP Verification</Text>
              <Text style={styles.modalSubtitle}>
                6-digit OTP enter karein.{" "}
                {otpContext === "signup"
                  ? "OTP verify hote hi account create hoga."
                  : "OTP verify hote hi password reset continue hoga."}
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
                  style={[styles.secondaryButton, otpCooldown > 0 || loading ? styles.buttonDisabled : null]}
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
    backgroundColor: "#FDF6ED"
  },
  screen: {
    flex: 1,
    backgroundColor: "#FDF6ED"
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 34
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "#5C3D2E",
    padding: 18,
    borderWidth: 1,
    borderColor: "#3D2518",
    shadowColor: "#3D2518",
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
    backgroundColor: "#3D2518",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  heroBadgeText: {
    color: "#F5EAD8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8
  },
  heroTitle: {
    marginTop: 6,
    color: "#FDF6ED",
    fontSize: 28,
    fontWeight: "800"
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#E8D5B7",
    fontSize: 14,
    lineHeight: 20
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
    backgroundColor: "#F5EAD8",
    paddingVertical: 11,
    alignItems: "center"
  },
  tabChipActive: {
    backgroundColor: "#C8603A"
  },
  tabChipText: {
    color: "#7A5544",
    fontWeight: "700",
    fontSize: 13
  },
  tabChipTextActive: {
    color: "#ffffff"
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    padding: 16,
    gap: 10,
    shadowColor: "#5C3D2E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5
  },
  panelNested: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E8D5B7",
    gap: 8
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#5C3D2E",
    marginBottom: 2
  },
  panelSubtitle: {
    color: "#9B8070",
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
    backgroundColor: "#F5EAD8",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#C8603A"
  },
  progressLabel: {
    color: "#9B8070",
    fontSize: 12,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#E8D5B7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#5C3D2E",
    backgroundColor: "#FFFFFF"
  },
  inputError: {
    borderColor: "#B83A2A",
    backgroundColor: "#FFF7F3"
  },
  strengthWrap: {
    gap: 5
  },
  strengthTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    backgroundColor: "#F5EAD8",
    overflow: "hidden"
  },
  strengthFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#C8603A"
  },
  helperText: {
    color: "#9B8070",
    fontSize: 12,
    fontWeight: "600"
  },
  genderRow: {
    flexDirection: "row",
    gap: 8
  },
  genderChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FDF6ED"
  },
  genderChipActive: {
    borderColor: "#C8603A",
    backgroundColor: "#FFF7F3"
  },
  genderChipText: {
    color: "#7A5544",
    fontWeight: "700",
    fontSize: 12
  },
  genderChipTextActive: {
    color: "#C8603A"
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#C8603A"
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
    backgroundColor: "#FDF6ED",
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  secondaryButtonText: {
    color: "#7A5544",
    fontWeight: "700",
    fontSize: 13
  },
  buttonDisabled: {
    opacity: 0.6
  },
  errorText: {
    color: "#B83A2A",
    fontWeight: "700",
    fontSize: 13
  },
  successText: {
    color: "#3D6B4F",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 12
  },
  loader: {
    marginTop: 8
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,16,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E8D5B7"
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#5C3D2E"
  },
  modalSubtitle: {
    color: "#9B8070",
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
    color: "#7A5544",
    fontWeight: "700"
  }
});
