import { auth, db } from './firebase-config.js';
import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

let confirmationResult = null;

export function initRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'normal',
      callback: () => console.log('reCAPTCHA verified'),
      'expired-callback': () => console.log('reCAPTCHA expired'),
      'error-callback': (error) => {
        console.error('reCAPTCHA error:', error);
        showError('reCAPTCHA failed. Please try again.');
      }
    });
  }
  return window.recaptchaVerifier;
}

export async function sendOTP() {
  try {
    const phoneInput = document.getElementById('phoneInput').value.trim();
    
    if (!phoneInput) {
      showError('Please enter a phone number');
      return;
    }

    // Clean up the phone number - remove spaces, dashes, parentheses
    let phone = phoneInput.replace(/[\s\-\(\)]/g, '');
    
    // If it already has +880, use as is
    if (phone.startsWith('+880')) {
      // Already formatted correctly
    }
    // If it starts with 880, add +
    else if (phone.startsWith('880')) {
      phone = '+' + phone;
    }
    // If it starts with 0, replace with +880
    else if (phone.startsWith('0')) {
      phone = '+880' + phone.slice(1);
    }
    // If it starts with 1, assume it's missing the leading 0 and country code
    else if (phone.startsWith('1')) {
      phone = '+880' + phone;
    }
    // Otherwise, just add +880
    else {
      phone = '+880' + phone;
    }

    // Basic validation - just check if we have enough digits
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 11 || digitsOnly.length > 15) {
      showError('Phone number should be 10-11 digits');
      return;
    }

    showSuccess('Sending OTP...');

    const recaptchaVerifier = initRecaptcha();
    if (!recaptchaVerifier) return;

    const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    confirmationResult = result;

    document.getElementById('phoneSection').style.display = 'none';
    document.getElementById('otpSection').style.display = 'block';
    
    showSuccess('OTP sent to ' + phone);

  } catch (error) {
    console.error('Error:', error);
    if (error.code === 'auth/invalid-phone-number') {
      showError('Invalid phone number format. Try: 01712345678');
    } else if (error.code === 'auth/too-many-requests') {
      showError('Too many attempts. Try again later.');
    } else {
      showError('Error: ' + error.message);
    }

    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  }
}

export async function verifyOTP() {
  try {
    const otpInput = document.getElementById('otpInput').value.trim();
    
    if (!otpInput || otpInput.length !== 6) {
      showError('Enter 6-digit OTP');
      return;
    }

    if (!confirmationResult) {
      showError('OTP expired. Request new OTP.');
      return;
    }

    const verifyBtn = document.querySelector('[onclick="window.verifyOTP()"]');
    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying...';
    }

    const result = await confirmationResult.confirm(otpInput);
    const user = result.user;

    showSuccess('Login successful!');

    // CHECK IF USER PROFILE EXISTS IN FIRESTORE
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      // NEW USER - Show profile modal
      console.log('New user detected - showing profile modal');
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify OTP';
      }
      showProfileModal();
    } else {
      // EXISTING USER - Redirect to dashboard
      console.log('Existing user - redirecting');
      setTimeout(() => {
        window.location.href = 'pages/home.html';
      }, 1000);
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      showError('Wrong OTP. Try again.');
    } else if (error.code === 'auth/code-expired') {
      showError('OTP expired. Request new OTP.');
      backToPhone();
    } else {
      showError('Error: ' + error.message);
    }

    const verifyBtn = document.querySelector('[onclick="window.verifyOTP()"]');
    if (verifyBtn) {
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify OTP';
    }
  }
}

// Show profile setup modal
function showProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('userName').focus();
  } else {
    console.error('Profile modal not found');
  }
}

// Save user profile to Firestore
export async function saveProfile() {
  const name = document.getElementById('userName').value.trim();
  const age = document.getElementById('userAge').value.trim();
  const gender = document.getElementById('userGender').value;
  
  // Validation
  if (!name) {
    showError('Please enter your name');
    return;
  }
  
  if (!age || age < 1 || age > 150) {
    showError('Please enter a valid age');
    return;
  }
  
  if (!gender) {
    showError('Please select your gender');
    return;
  }
  
  try {
    showSuccess('Saving profile...');
    
    const user = auth.currentUser;
    const userDocRef = doc(db, 'users', user.uid);
    
    // Create user document in Firestore
    await setDoc(userDocRef, {
      name: name,
      age: parseInt(age),
      gender: gender,
      phone: user.phoneNumber,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('Profile saved successfully');
    showSuccess('Profile created! Redirecting...');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = 'pages/home.html';
    }, 1000);
    
  } catch (error) {
    console.error('Error saving profile:', error);
    showError('Failed to save profile. Please try again.');
  }
}

export function backToPhone() {
  document.getElementById('phoneSection').style.display = 'block';
  document.getElementById('otpSection').style.display = 'none';
  document.getElementById('otpInput').value = '';
  confirmationResult = null;
}

export async function logout() {
  try {
    await signOut(auth);
    window.location.href = '../index.html';
  } catch (error) {
    console.error('Error:', error);
    showError('Error logging out');
  }
}

export function checkAuthState() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = 'pages/home.html';
    }
  });
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
  }
}

function showSuccess(message) {
  const successDiv = document.getElementById('successMessage');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => { successDiv.style.display = 'none'; }, 3000);
  }
}

// Make saveProfile available globally
window.saveProfile = saveProfile;
