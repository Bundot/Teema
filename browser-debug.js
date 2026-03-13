// Copy and paste this script into your browser console on the login page
// It will show you exactly what happens when you click "Sign in"

console.log('🔍 Login Debug Script Loaded');

// Check if Supabase config is loaded
console.log('📋 Configuration Check:');
console.log('SUPABASE_URL:', window.SUPABASE_URL ? '✅ Loaded' : '❌ Missing');
console.log('SUPABASE_ANON:', window.SUPABASE_ANON ? '✅ Loaded' : '❌ Missing');

// Check form elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signinBtn = document.getElementById('signin');
const msgDiv = document.getElementById('msg');

console.log('📋 Form Elements:');
console.log('Email input:', emailInput ? '✅ Found' : '❌ Missing');
console.log('Password input:', passwordInput ? '✅ Found' : '❌ Missing');
console.log('Sign in button:', signinBtn ? '✅ Found' : '❌ Missing');
console.log('Message div:', msgDiv ? '✅ Found' : '❌ Missing');

// Monitor the message div for changes
if (msgDiv) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      console.log(`💬 Message changed to: "${mutation.target.textContent}"`);
    });
  });
  observer.observe(msgDiv, { childList: true, characterData: true });
}

// Monitor localStorage changes
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  if (key === 'supabase_session') {
    console.log('💾 Supabase session stored in localStorage');
    try {
      const session = JSON.parse(value);
      console.log('👤 User:', session.user?.email);
      console.log('🆔 Session ID:', session.user?.id);
    } catch (e) {
      console.log('💾 Session stored (could not parse)');
    }
  }
  return originalSetItem.call(this, key, value);
};

// Monitor page redirects
let currentLocation = window.location.href;
Object.defineProperty(window.location, 'href', {
  get: function() { return currentLocation; },
  set: function(value) {
    console.log(`🔄 Redirecting to: ${value}`);
    currentLocation = value;
    // In real browser, this would cause navigation
    setTimeout(() => {
      if (value.includes('admin.html')) {
        console.log('✅ Successfully redirected to admin panel!');
      }
    }, 100);
  }
});

console.log('🎯 Debugging setup complete!');
console.log('📝 Now click "Sign in" and watch the console for detailed logs');
console.log('📧 Fill in: isaacdauda12@gmail.com / @Natan1234');

// Auto-fill the form for easier testing
if (emailInput && passwordInput) {
  emailInput.value = 'isaacdauda12@gmail.com';
  passwordInput.value = '@Natan1234';
  console.log('📝 Form auto-filled with your credentials');
}
