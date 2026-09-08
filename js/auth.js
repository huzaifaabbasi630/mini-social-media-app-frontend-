function checkAuth() {
  const token = getToken();
  const user = getUser();

  if (!token || !user._id) {
    window.location.href = '/pages/login.html';
    return false;
  }
  return true;
}

function redirectAuthenticatedUsers() {
  if (getToken() && getUser()._id && /\/pages\/(login|signup)\.html$/.test(window.location.pathname)) {
    window.location.replace('/pages/profile.html');
  }
}

async function confirmDeleteAccount() {
  const confirmed = window.confirm('Are you sure you want to permanently delete this account and all its data? This action cannot be undone.');
  if (!confirmed) return;

  try {
    await deleteAccount();
    clearAuth();
    window.location.href = '/pages/login.html';
  } catch (error) {
    window.alert(error.message);
  }
}

function setupNavbar() {
  const user = getUser();
  const navbar = document.querySelector('.navbar');

  if (!navbar) return;

  if (user._id) {
    const currentPage = window.location.pathname.includes('profile') ? 'profile' : 'feed';
    navbar.innerHTML = `
      <div class="logo">Mini<span>Social</span></div><nav class="top-links"><a href="/pages/home.html" class="${currentPage === 'feed' ? 'active' : ''}">Home</a><a href="/pages/profile.html" class="${currentPage === 'profile' ? 'active' : ''}">Profile</a></nav>
      <div class="user-info">
        <div class="avatar">${user.username.charAt(0).toUpperCase()}</div>
      </div>
      <div class="bottom-nav"><a href="/pages/home.html" class="${currentPage === 'feed' ? 'selected' : ''}" aria-label="Home"><span>⌂</span><small>Home</small></a><a href="/pages/search.html" aria-label="Search"><span>⌕</span><small>Search</small></a><a href="/pages/profile.html" aria-label="Profile"><span>◉</span><small>Profile</small></a></div>
    `;
  } else {
    navbar.innerHTML = `
      <div class="logo">Mini<span>Social</span></div>
      <nav>
        <a href="/pages/login.html">Login</a>
        <a href="/pages/signup.html">Sign Up</a>
      </nav>
    `;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  const btn = e.target.querySelector('button[type="submit"]');

  if (errorEl) errorEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in...';

  try {
    const result = await loginUser({ email, password });
    setToken(result.data.token);
    setUser(result.data.user);
    window.location.href = '/pages/profile.html';
  } catch (error) {
    console.error('Login error:', error);
    if (errorEl) errorEl.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  const btn = e.target.querySelector('button[type="submit"]');

  if (errorEl) errorEl.textContent = '';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    const result = await registerUser({ username, email, password });
    clearAuth();
    window.location.href = '/pages/login.html?registered=1';
  } catch (error) {
    console.error('Signup error:', error);
    if (errorEl) errorEl.textContent = error.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  redirectAuthenticatedUsers();
  if (!document.getElementById('login-form') && !document.getElementById('register-form')) checkAuth();
  setupNavbar();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
});