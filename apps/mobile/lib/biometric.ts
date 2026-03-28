/**
 * Biometric authentication helper — wraps expo-local-authentication
 * to provide hardware availability checks and authentication prompts.
 */

import * as LocalAuthentication from 'expo-local-authentication';

// --------------- Types ---------------

export interface BiometricAvailability {
  /** Whether biometric hardware exists and biometrics are enrolled */
  available: boolean;
  /** Human-readable type: 'fingerprint', 'facial', 'iris', or 'none' */
  biometricType: string;
}

// --------------- Helpers ---------------

/**
 * Map expo authentication type enum to human-readable string.
 */
function getTypeName(
  type: LocalAuthentication.AuthenticationType
): string {
  switch (type) {
    case LocalAuthentication.AuthenticationType.FINGERPRINT:
      return 'fingerprint';
    case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
      return 'facial';
    case LocalAuthentication.AuthenticationType.IRIS:
      return 'iris';
    default:
      return 'biometric';
  }
}

// --------------- Public API ---------------

/**
 * Check whether biometric authentication is available on this device.
 * Returns availability status and the type of biometric supported.
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { available: false, biometricType: 'none' };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { available: false, biometricType: 'none' };
    }

    const types =
      await LocalAuthentication.supportedAuthenticationTypesAsync();
    const biometricType = types.length > 0 ? getTypeName(types[0]) : 'none';

    return { available: true, biometricType };
  } catch (error) {
    console.error('[biometric] Failed to check availability:', error);
    return { available: false, biometricType: 'none' };
  }
}

/**
 * Prompt the user for biometric authentication.
 * Returns true if authentication succeeded, false otherwise.
 */
export async function authenticateBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Buka DuitKu',
      cancelLabel: 'Batal',
      fallbackLabel: 'Gunakan PIN',
    });

    return result.success;
  } catch (error) {
    console.error('[biometric] Authentication failed:', error);
    return false;
  }
}
